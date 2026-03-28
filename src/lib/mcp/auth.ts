// MCP Authentication — checks MCP_SECRET against request
export function authenticateMCP(request: Request): boolean {
  const secret = process.env.MCP_SECRET;
  if (!secret) return false;

  // Check Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    if (authHeader.slice(7) === secret) return true;
  }

  // Check x-mcp-secret header
  const mcpHeader = request.headers.get('x-mcp-secret');
  if (mcpHeader === secret) return true;

  // Check query parameter
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  if (token === secret) return true;

  return false;
}
