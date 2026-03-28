import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  return NextResponse.json({
    issuer: url.origin,
    authorization_endpoint: `${url.origin}/api/mcp`,
    token_endpoint: `${url.origin}/api/mcp`,
    registration_endpoint: `${url.origin}/api/mcp`,
  });
}
