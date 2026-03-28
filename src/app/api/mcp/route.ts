import { NextRequest, NextResponse } from 'next/server';
import { authenticateMCP } from '@/lib/mcp/auth';
import { getToolList, findTool } from '@/lib/mcp/tools';

// JSON-RPC 2.0 response helpers
function jsonRPC(id: string | number | null, result: unknown) {
  return NextResponse.json({ jsonrpc: '2.0', id, result });
}

function jsonRPCError(id: string | number | null, code: number, message: string) {
  return NextResponse.json({ jsonrpc: '2.0', id, error: { code, message } });
}

// GET — info/redirect
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  if (url.pathname.includes('.well-known')) {
    return NextResponse.json({ issuer: url.origin });
  }
  return NextResponse.json({
    service: 'VIGIL Agency MCP Server',
    version: '1.0.0',
    tools: getToolList().length,
    status: 'operational',
    documentation: 'POST to this endpoint with JSON-RPC 2.0 requests',
  });
}

// POST — JSON-RPC 2.0 handler
export async function POST(request: NextRequest) {
  // Auth check
  if (!authenticateMCP(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return jsonRPCError(null, -32700, 'Parse error');
  }

  const { id, method, params } = body;

  // Handle tools/list
  if (method === 'tools/list') {
    return jsonRPC(id, { tools: getToolList() });
  }

  // Handle tools/call
  if (method === 'tools/call') {
    const toolName = params?.name;
    const toolArgs = params?.arguments || {};

    if (!toolName) {
      return jsonRPCError(id, -32602, 'Missing tool name');
    }

    const tool = findTool(toolName);
    if (!tool) {
      return jsonRPCError(id, -32601, `Tool not found: ${toolName}`);
    }

    try {
      const result = await tool.handler(toolArgs);
      return jsonRPC(id, {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      });
    } catch (err: any) {
      return jsonRPCError(id, -32603, `Tool execution error: ${err.message}`);
    }
  }

  // Handle initialize (MCP protocol)
  if (method === 'initialize') {
    return jsonRPC(id, {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: { name: 'vigil-agency', version: '1.0.0' },
    });
  }

  // Handle notifications/initialized
  if (method === 'notifications/initialized') {
    return jsonRPC(id, {});
  }

  return jsonRPCError(id, -32601, `Method not found: ${method}`);
}

// OPTIONS — CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-mcp-secret',
    },
  });
}
