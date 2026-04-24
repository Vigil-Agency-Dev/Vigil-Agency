// VIGIL dead-drop HTTP client.
//
// Talks to /api/dead-drop/* on vigil-api (ops.jr8ch.com).
// Used by CAIRN to:
//   - write intel out (intel-from-cairn/, intel-from-cairn-analyst/, heartbeats)
//   - poll directives in (strategy-from-claude/cairn_*.md, orders-for-cairn/)
//   - inspect dead-drop state (listing)
//
// Wall: VIGIL-side dead-drop. Never touches /api/dead-drop-lumina/* (LUMINA).

const DEFAULT_BASE = 'https://ops.jr8ch.com';

export function createDeadDropVigilClient({ baseUrl, apiKey } = {}) {
  const base = (baseUrl || process.env.VPS_API_BASE || DEFAULT_BASE).replace(/\/$/, '');
  const key = apiKey || process.env.VIGIL_API_KEY;
  if (!key) {
    throw new Error('createDeadDropVigilClient: VIGIL_API_KEY required (env VIGIL_API_KEY or apiKey arg)');
  }

  const headers = () => ({ 'x-api-key': key });

  async function listing() {
    const res = await fetch(`${base}/api/dead-drop/listing`, {
      headers: headers(),
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`dead-drop/listing ${res.status}`);
    return res.json();
  }

  async function read(path) {
    if (!path) throw new Error('dead-drop/read: path required');
    const res = await fetch(
      `${base}/api/dead-drop/file?path=${encodeURIComponent(path)}`,
      { headers: headers(), cache: 'no-store' },
    );
    if (!res.ok) throw new Error(`dead-drop/file ${res.status} for ${path}`);
    const contentType = res.headers.get('content-type') || 'text/plain';
    const content = await res.text();
    return { path, content, contentType };
  }

  async function write(path, content) {
    if (!path) throw new Error('dead-drop/write: path required');
    if (content == null) throw new Error('dead-drop/write: content required');
    const res = await fetch(`${base}/api/dead-drop/write`, {
      method: 'POST',
      headers: { ...headers(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, content, mkdir: true }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`dead-drop/write ${res.status}: ${errText.slice(0, 200)}`);
    }
    return res.json();
  }

  async function listFolder(folder) {
    const data = await listing();
    const entry = (data.folders || []).find((f) => f.name === folder);
    return entry ? entry.files : [];
  }

  /**
   * Returns files in strategy-from-claude/ matching prefix newer than lastSeenIso.
   * If lastSeenIso is null, returns all matching files.
   */
  async function newDirectivesSince(lastSeenIso, prefix = 'cairn_') {
    const files = await listFolder('strategy-from-claude');
    const cutoffMs = lastSeenIso ? new Date(lastSeenIso).getTime() : 0;
    return files.filter((f) => {
      if (!f.name.startsWith(prefix)) return false;
      const mtime = new Date(f.modified).getTime();
      return mtime > cutoffMs;
    });
  }

  return { listing, read, write, listFolder, newDirectivesSince };
}
