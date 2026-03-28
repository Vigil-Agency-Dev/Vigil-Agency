import { NextRequest, NextResponse } from 'next/server';
import { authenticateMCP } from '@/lib/mcp/auth';
import { getToolList, findTool } from '@/lib/mcp/tools';
import { randomUUID } from 'crypto';

// ── Session store (in-memory, resets on cold start) ──
const sessions = new Map<string, { created: number }>();

// ── Helpers ──

function wantsSSE(request: NextRequest): boolean {
  const accept = request.headers.get('accept') || '';
  return accept.includes('text/event-stream');
}

function sseMessage(data: unknown, eventId?: string): string {
  let msg = '';
  if (eventId) msg += `id: ${eventId}\n`;
  msg += `event: message\ndata: ${JSON.stringify(data)}\n\n`;
  return msg;
}

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization, x-mcp-secret, Mcp-Session-Id',
    'Access-Control-Expose-Headers': 'Mcp-Session-Id',
  };
}

function jsonRPCResult(id: string | number | null, result: unknown) {
  return { jsonrpc: '2.0', id, result };
}

function jsonRPCErrorObj(id: string | number | null, code: number, message: string) {
  return { jsonrpc: '2.0', id, error: { code, message } };
}

// Plain JSON response (backward compat for npx mcp-remote)
function jsonResponse(body: unknown, sessionId?: string) {
  const headers: Record<string, string> = { ...corsHeaders() };
  if (sessionId) headers['Mcp-Session-Id'] = sessionId;
  return NextResponse.json(body, { headers });
}

// SSE response for Streamable HTTP transport
function sseResponse(body: unknown, sessionId?: string) {
  const eventId = randomUUID();
  const payload = sseMessage(body, eventId);

  const headers: Record<string, string> = {
    ...corsHeaders(),
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
  };
  if (sessionId) headers['Mcp-Session-Id'] = sessionId;

  return new NextResponse(payload, { status: 200, headers });
}

// Respond in the format the client expects
function respond(request: NextRequest, body: unknown, sessionId?: string) {
  if (wantsSSE(request)) {
    return sseResponse(body, sessionId);
  }
  return jsonResponse(body, sessionId);
}

// ── GET — SSE stream endpoint or info ──
export async function GET(request: NextRequest) {
  const url = new URL(request.url);

  // .well-known discovery
  if (url.pathname.includes('.well-known')) {
    return NextResponse.json({ issuer: url.origin }, { headers: corsHeaders() });
  }

  // If client wants SSE, open a keep-alive stream (for server-initiated messages)
  if (wantsSSE(request)) {
    if (!authenticateMCP(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders() });
    }

    const sessionId = request.headers.get('mcp-session-id');
    if (!sessionId || !sessions.has(sessionId)) {
      return NextResponse.json(
        { error: 'No active session. Send initialize first.' },
        { status: 400, headers: corsHeaders() }
      );
    }

    // Open an SSE stream — send a ping then close
    // (Serverless functions can't hold long-lived connections,
    //  but this satisfies the transport negotiation)
    const payload = sseMessage({ jsonrpc: '2.0', method: 'notifications/ping' }, randomUUID());
    return new NextResponse(payload, {
      status: 200,
      headers: {
        ...corsHeaders(),
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Mcp-Session-Id': sessionId,
      },
    });
  }

  // Plain GET — service info
  return NextResponse.json(
    {
      service: 'VIGIL Agency MCP Server',
      version: '1.1.0',
      transport: ['streamable-http', 'json-rpc'],
      tools: getToolList().length,
      status: 'operational',
      documentation: 'POST to this endpoint with JSON-RPC 2.0 requests',
    },
    { headers: corsHeaders() }
  );
}

// ── POST — JSON-RPC 2.0 handler (supports both plain JSON and SSE) ──
export async function POST(request: NextRequest) {
  // Auth check
  if (!authenticateMCP(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders() });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return respond(request, jsonRPCErrorObj(null, -32700, 'Parse error'));
  }

  const { id, method, params } = body;

  // ── initialize ──
  if (method === 'initialize') {
    const sessionId = randomUUID();
    sessions.set(sessionId, { created: Date.now() });

    // Clean up old sessions (keep max 100)
    if (sessions.size > 100) {
      const oldest = [...sessions.entries()]
        .sort((a, b) => a[1].created - b[1].created)
        .slice(0, sessions.size - 100);
      for (const [key] of oldest) sessions.delete(key);
    }

    return respond(
      request,
      jsonRPCResult(id, {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'vigil-agency', version: '1.1.0' },
      }),
      sessionId
    );
  }

  // ── notifications/initialized ──
  if (method === 'notifications/initialized') {
    return respond(request, jsonRPCResult(id, {}));
  }

  // For all other methods, validate session if client provides one
  const sessionId = request.headers.get('mcp-session-id') || undefined;

  // ── tools/list ──
  if (method === 'tools/list') {
    return respond(request, jsonRPCResult(id, { tools: getToolList() }), sessionId);
  }

  // ── tools/call ──
  if (method === 'tools/call') {
    const toolName = params?.name;
    const toolArgs = params?.arguments || {};

    if (!toolName) {
      return respond(request, jsonRPCErrorObj(id, -32602, 'Missing tool name'), sessionId);
    }

    const tool = findTool(toolName);
    if (!tool) {
      return respond(request, jsonRPCErrorObj(id, -32601, `Tool not found: ${toolName}`), sessionId);
    }

    try {
      const result = await tool.handler(toolArgs);
      return respond(
        request,
        jsonRPCResult(id, {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        }),
        sessionId
      );
    } catch (err: any) {
      return respond(
        request,
        jsonRPCErrorObj(id, -32603, `Tool execution error: ${err.message}`),
        sessionId
      );
    }
  }

  return respond(request, jsonRPCErrorObj(id, -32601, `Method not found: ${method}`), sessionId);
}

// ── DELETE — Session teardown ──
export async function DELETE(request: NextRequest) {
  const sessionId = request.headers.get('mcp-session-id');
  if (sessionId) sessions.delete(sessionId);
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

// ── OPTIONS — CORS preflight ──
export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders() });
}
