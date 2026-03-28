// VPS API client for MCP tools — replaces Firestore direct access
const VPS_API = process.env.NEXT_PUBLIC_VPS_ENDPOINT || process.env.VPS_API_BASE || 'https://ops.jr8ch.com';
const VPS_KEY = process.env.NEXT_PUBLIC_VIGIL_API_KEY || process.env.VPS_API_KEY || '';

export async function vpsGet(path: string): Promise<any> {
  const res = await fetch(`${VPS_API}${path}`, {
    headers: { 'x-api-key': VPS_KEY },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`VPS API ${res.status}: ${path}`);
  return res.json();
}

export async function vpsPost(path: string, body: any): Promise<any> {
  const res = await fetch(`${VPS_API}${path}`, {
    method: 'POST',
    headers: { 'x-api-key': VPS_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`VPS API ${res.status}: ${path}`);
  return res.json();
}
