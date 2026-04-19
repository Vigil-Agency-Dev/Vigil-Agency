// Client-side scan + action shim for the DIRECTOR Review & Approve Register.
// Spec: orders-for-cvs/COMMANDER-RESPONSE-REVIEW-REGISTER-CONTRACT-20260419.md
//
// When the server ships POST /api/director/action + GET /api/director/pending-review,
// swap fetchPendingReview + submitDirectorAction to call the real endpoints.

const VPS_API = process.env.NEXT_PUBLIC_VPS_ENDPOINT || 'https://ops.jr8ch.com';
const API_KEY = process.env.NEXT_PUBLIC_VIGIL_API_KEY || '';

export const SCAN_FOLDERS = [
  'orders-for-herald',
  'orders-for-director',
  'orders-for-cvs',
  'orders-for-commander',
  'commander-recommendations',
  'escalations',
];

export type DirectorStatus =
  | 'DRAFT'
  | 'PROSPECTIVE'
  | 'AWAITING_DIRECTOR_GO'
  | 'AUTHORISED'
  | 'AUTHORISED_WITH_AMENDMENTS'
  | 'REJECTED'
  | 'SUPERSEDED'
  | 'CLOSED'
  | 'HELD';

export type DirectorAction = 'AUTHORISE' | 'AUTHORISE_WITH_AMENDMENTS' | 'REJECT' | 'RETURN';

export type Urgency = 'ROUTINE' | 'ELEVATED' | 'CRITICAL' | 'HARD_STOP';

export interface PendingItem {
  path: string;
  folder: string;
  filename: string;
  title: string;
  summary: string;
  filedBy?: string;
  filedAt?: string;
  operation?: string | null;
  status: DirectorStatus;
  actionRequired?: string | null;
  reservedGateRef?: string | null;
  urgency: Urgency;
  heldPending?: string | null;
  supersedes?: string | null;
  supersededBy?: string | null;
  frontmatter: Record<string, any>;
  sizeBytes?: number;
  modified?: string;
}

export interface ReviewRegisterData {
  pending: PendingItem[];
  history: PendingItem[];
  scannedAt: string;
  scanDurationMs: number;
  errors: string[];
  // True when the server-side /api/director/pending-review endpoint is live.
  // False means we fell back to client-side scan.
  serverScan: boolean;
}

const PENDING_STATUSES: DirectorStatus[] = ['PROSPECTIVE', 'AWAITING_DIRECTOR_GO', 'HELD'];
const HISTORY_STATUSES: DirectorStatus[] = [
  'AUTHORISED',
  'AUTHORISED_WITH_AMENDMENTS',
  'REJECTED',
  'SUPERSEDED',
  'CLOSED',
];

function authHeaders() {
  return { 'x-api-key': API_KEY } as const;
}

// Minimal YAML frontmatter parser — handles the subset COMMANDER's schema uses:
// scalars (string, number, boolean, null), nested lists on a single line aren't needed
// since the schema is flat. Returns { frontmatter, body } or null if no frontmatter.
export function parseFrontmatter(raw: string): { frontmatter: Record<string, any>; body: string } | null {
  if (!raw.startsWith('---')) return null;
  const end = raw.indexOf('\n---', 3);
  if (end === -1) return null;
  const block = raw.slice(3, end).replace(/^\r?\n/, '').replace(/\r/g, '');
  const body = raw.slice(end + 4).replace(/^\r?\n/, '');
  const fm: Record<string, any> = {};
  for (const line of block.split('\n')) {
    const m = /^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/.exec(line);
    if (!m) continue;
    const key = m[1];
    let v: any = m[2].trim();
    if (v === '' || v === 'null' || v === '~') v = null;
    else if (v === 'true') v = true;
    else if (v === 'false') v = false;
    else if (/^".*"$/.test(v) || /^'.*'$/.test(v)) v = v.slice(1, -1);
    else if (/^-?\d+$/.test(v)) v = parseInt(v, 10);
    fm[key] = v;
  }
  return { frontmatter: fm, body };
}

function deriveTypeFromPath(path: string, fm: Record<string, any>): string {
  const name = path.split('/').pop() || '';
  if (name.includes('HERALD-DISTRIBUTION-DIRECTIVE')) return 'HERALD_DISTRIBUTION_DIRECTIVE';
  if (name.includes('HERALD-ORDER')) return 'HERALD_ORDER';
  if (name.includes('CVS-ORDER')) return 'CVS_ORDER';
  if (name.includes('COMMANDER-RESPONSE')) return 'COMMANDER_RESPONSE';
  if (name.includes('COMMANDER-RECOMMENDATION')) return 'COMMANDER_RECOMMENDATION';
  if (fm.filed_by) return `${fm.filed_by}_ARTIFACT`;
  return 'ARTIFACT';
}

function deriveTitleFromBody(body: string, filename: string): string {
  const firstH1 = /^#\s+(.+)$/m.exec(body);
  if (firstH1) return firstH1[1].replace(/\s+—.*$/, '').trim();
  return filename.replace(/\.md$/, '').replace(/-/g, ' ');
}

async function listDirectory(): Promise<Array<{ name: string; file_count: number; files: Array<{ name: string; size: number; modified: string }> }>> {
  const res = await fetch(`${VPS_API}/api/dead-drop/listing`, { headers: authHeaders(), cache: 'no-store' });
  if (!res.ok) throw new Error(`listing ${res.status}`);
  const data = await res.json();
  return data.folders || [];
}

async function readFileContent(path: string): Promise<string> {
  const res = await fetch(`${VPS_API}/api/dead-drop/file?path=${encodeURIComponent(path)}`, { headers: authHeaders(), cache: 'no-store' });
  if (!res.ok) throw new Error(`read ${res.status}: ${path}`);
  return res.text();
}

export async function fetchFileBody(path: string): Promise<string> {
  return readFileContent(path);
}

// Try the real server endpoint first, fall back to client-side scan.
export async function fetchPendingReview(): Promise<ReviewRegisterData> {
  const t0 = Date.now();

  // Attempt real endpoint
  try {
    const res = await fetch(`${VPS_API}/api/director/pending-review`, { headers: authHeaders(), cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      return {
        pending: data.pending || [],
        history: data.history || [],
        scannedAt: data.scannedAt || new Date().toISOString(),
        scanDurationMs: data.scanDurationMs || 0,
        errors: [],
        serverScan: true,
      };
    }
  } catch {
    // fall through to client scan
  }

  // Client-side scan
  const errors: string[] = [];
  const folders = await listDirectory().catch(err => {
    errors.push(`listing: ${err.message}`);
    return [];
  });

  const targets = folders.filter(f => SCAN_FOLDERS.includes(f.name));
  const allItems: PendingItem[] = [];

  // Parallel fetch with a concurrency cap so we don't hammer the VPS.
  const BATCH = 8;
  const queue: Array<() => Promise<void>> = [];
  for (const folder of targets) {
    for (const file of folder.files) {
      if (!file.name.endsWith('.md')) continue;
      const path = `${folder.name}/${file.name}`;
      queue.push(async () => {
        try {
          const content = await readFileContent(path);
          const parsed = parseFrontmatter(content);
          if (!parsed) return; // no frontmatter = not director-actionable
          const fm = parsed.frontmatter;
          if (fm.director_review !== true) return;
          const status = (fm.status || 'PROSPECTIVE') as DirectorStatus;
          const item: PendingItem = {
            path,
            folder: folder.name,
            filename: file.name,
            title: deriveTitleFromBody(parsed.body, file.name),
            summary: fm.summary || deriveTitleFromBody(parsed.body, file.name).slice(0, 200),
            filedBy: fm.filed_by || undefined,
            filedAt: fm.filed_at || undefined,
            operation: fm.operation || null,
            status,
            actionRequired: fm.director_action_required || null,
            reservedGateRef: fm.reserved_gate_ref || null,
            urgency: (fm.urgency || 'ROUTINE') as Urgency,
            heldPending: fm.held_pending || null,
            supersedes: fm.supersedes || null,
            supersededBy: fm.superseded_by || null,
            frontmatter: fm,
            sizeBytes: file.size,
            modified: file.modified,
          };
          allItems.push(item);
        } catch (err: any) {
          errors.push(`${path}: ${err.message}`);
        }
      });
    }
  }

  for (let i = 0; i < queue.length; i += BATCH) {
    await Promise.all(queue.slice(i, i + BATCH).map(fn => fn()));
  }

  const pending = allItems.filter(i => PENDING_STATUSES.includes(i.status));
  const history = allItems.filter(i => HISTORY_STATUSES.includes(i.status));

  // Pending sort: HARD_STOP/CRITICAL first, then ELEVATED, then ROUTINE; within each, newest first.
  const urgencyRank = (u: Urgency) => ({ HARD_STOP: 0, CRITICAL: 1, ELEVATED: 2, ROUTINE: 3 }[u] ?? 3);
  pending.sort((a, b) => {
    const du = urgencyRank(a.urgency) - urgencyRank(b.urgency);
    if (du !== 0) return du;
    return (b.filedAt || '').localeCompare(a.filedAt || '');
  });
  history.sort((a, b) => (b.filedAt || b.modified || '').localeCompare(a.filedAt || a.modified || ''));

  return {
    pending,
    history,
    scannedAt: new Date().toISOString(),
    scanDurationMs: Date.now() - t0,
    errors,
    serverScan: false,
  };
}

export interface ActionPayload {
  path: string;
  action: DirectorAction;
  amendments?: string;
  reason?: string;
  newHeldPending?: string;
}

export interface ActionResult {
  success: boolean;
  replyPath?: string;
  originalStatus?: DirectorStatus;
  error?: string;
  serverAction: boolean; // true if real endpoint, false if client shim
}

function iso8601Compact(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

function replyFilenameFor(origPath: string, action: DirectorAction, stamp: string): string {
  const dir = origPath.includes('/') ? origPath.slice(0, origPath.lastIndexOf('/')) : '';
  const name = origPath.split('/').pop() || origPath;
  const base = name.replace(/\.md$/i, '');
  const suffix = ({
    AUTHORISE: 'DIRECTOR-GO',
    AUTHORISE_WITH_AMENDMENTS: 'DIRECTOR-RESPONSE',
    REJECT: 'DIRECTOR-REJECT',
    RETURN: 'DIRECTOR-RETURN',
  } as const)[action];
  const replyName = `${base}-${suffix}-${stamp}.md`;
  return dir ? `${dir}/${replyName}` : replyName;
}

function newStatusFor(action: DirectorAction): DirectorStatus {
  return ({
    AUTHORISE: 'AUTHORISED',
    AUTHORISE_WITH_AMENDMENTS: 'AUTHORISED_WITH_AMENDMENTS',
    REJECT: 'REJECTED',
    RETURN: 'HELD',
  } as const)[action];
}

function buildReplyContent(payload: ActionPayload, orig: PendingItem | null, replyTo: string, now: Date): string {
  const fm = {
    director_review: false,
    status: 'CLOSED',
    filed_by: 'DIRECTOR',
    filed_at: now.toISOString(),
    operation: orig?.operation || null,
    response_to: replyTo,
    action: payload.action,
  };
  const fmLines = Object.entries(fm).map(([k, v]) => `${k}: ${v === null ? 'null' : typeof v === 'string' ? v : JSON.stringify(v)}`).join('\n');
  const bodyTitle = ({
    AUTHORISE: 'DIRECTOR AUTHORISATION',
    AUTHORISE_WITH_AMENDMENTS: 'DIRECTOR AUTHORISATION WITH AMENDMENTS',
    REJECT: 'DIRECTOR REJECTION',
    RETURN: 'DIRECTOR RETURN FOR INFO',
  } as const)[payload.action];
  const sections: string[] = [];
  sections.push(`# ${bodyTitle}`);
  sections.push(`\n**Response to:** \`${replyTo}\``);
  sections.push(`**Action:** ${payload.action}`);
  sections.push(`**Filed:** ${now.toISOString()} (UTC)`);
  if (orig?.title) sections.push(`**Original title:** ${orig.title}`);
  if (orig?.operation) sections.push(`**Operation:** ${orig.operation}`);
  if (orig?.reservedGateRef) sections.push(`**Reserved gate:** ${orig.reservedGateRef}`);
  sections.push('\n---\n');
  if (payload.action === 'AUTHORISE') {
    sections.push('## Authorisation');
    sections.push('\nDIRECTOR authorises the referenced artefact as filed. No amendments.\n');
  }
  if (payload.action === 'AUTHORISE_WITH_AMENDMENTS' && payload.amendments) {
    sections.push('## Authorisation with amendments');
    sections.push('\nDIRECTOR authorises the referenced artefact subject to the following amendments:\n');
    sections.push('\n' + payload.amendments.trim() + '\n');
  }
  if (payload.action === 'REJECT' && payload.reason) {
    sections.push('## Rejection reason');
    sections.push('\n' + payload.reason.trim() + '\n');
  }
  if (payload.action === 'RETURN' && payload.reason) {
    sections.push('## Returned for info');
    sections.push('\nDIRECTOR returns the referenced artefact pending additional information:\n');
    sections.push('\n' + payload.reason.trim() + '\n');
    if (payload.newHeldPending) sections.push(`\n**Updated held_pending:** ${payload.newHeldPending}\n`);
  }
  sections.push('\n---\n');
  sections.push('_Filed via Centcom Review Register._');
  return `---\n${fmLines}\n---\n\n${sections.join('\n')}\n`;
}

// Rewrite the YAML frontmatter block of a file. Returns the rewritten file text.
function rewriteFrontmatter(original: string, updates: Record<string, any>): string {
  if (!original.startsWith('---')) {
    // No frontmatter — prepend one.
    const newFm = Object.entries(updates).map(([k, v]) => `${k}: ${v === null ? 'null' : typeof v === 'string' ? v : JSON.stringify(v)}`).join('\n');
    return `---\n${newFm}\n---\n\n${original}`;
  }
  const end = original.indexOf('\n---', 3);
  if (end === -1) return original;
  const block = original.slice(3, end).replace(/^\r?\n/, '');
  const rest = original.slice(end + 4);
  const lines = block.split('\n');
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of lines) {
    const m = /^([A-Za-z_][A-Za-z0-9_]*):\s*/.exec(line);
    if (m && Object.prototype.hasOwnProperty.call(updates, m[1])) {
      const k = m[1];
      const v = updates[k];
      out.push(`${k}: ${v === null ? 'null' : typeof v === 'string' ? v : JSON.stringify(v)}`);
      seen.add(k);
    } else {
      out.push(line);
    }
  }
  for (const [k, v] of Object.entries(updates)) {
    if (!seen.has(k)) out.push(`${k}: ${v === null ? 'null' : typeof v === 'string' ? v : JSON.stringify(v)}`);
  }
  return `---\n${out.join('\n').replace(/^\n+/, '')}\n---${rest}`;
}

async function writeFile(path: string, content: string): Promise<void> {
  const res = await fetch(`${VPS_API}/api/dead-drop/write`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, content, mkdir: true }),
  });
  if (!res.ok) throw new Error(`write ${res.status}: ${path}`);
}

// Submit an action. Attempts POST /api/director/action first; falls back to client shim.
export async function submitDirectorAction(payload: ActionPayload, orig: PendingItem | null): Promise<ActionResult> {
  const reviewedAt = new Date();

  // Try real server endpoint
  try {
    const res = await fetch(`${VPS_API}/api/director/action`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, reviewedAt: reviewedAt.toISOString() }),
    });
    if (res.ok) {
      const data = await res.json();
      return { success: true, replyPath: data.replyPath, originalStatus: data.originalStatus, serverAction: true };
    }
    if (res.status !== 404) {
      const errText = await res.text();
      return { success: false, error: `server ${res.status}: ${errText}`, serverAction: true };
    }
  } catch {
    // Fall through to client shim.
  }

  // Client shim: write reply file, update original frontmatter, post team report.
  const stamp = iso8601Compact(reviewedAt);
  const replyPath = replyFilenameFor(payload.path, payload.action, stamp);
  const replyContent = buildReplyContent(payload, orig, payload.path, reviewedAt);

  try {
    await writeFile(replyPath, replyContent);
  } catch (err: any) {
    return { success: false, error: `reply write failed: ${err.message}`, serverAction: false };
  }

  // Update original frontmatter (best-effort)
  try {
    const origContent = await readFileContent(payload.path);
    const updates: Record<string, any> = {
      status: newStatusFor(payload.action),
      superseded_by: replyPath,
    };
    if (payload.action === 'RETURN' && payload.newHeldPending) {
      updates.held_pending = payload.newHeldPending;
    }
    const updated = rewriteFrontmatter(origContent, updates);
    await writeFile(payload.path, updated);
  } catch (err: any) {
    return {
      success: false,
      replyPath,
      error: `reply file written but original frontmatter update failed (${err.message}) — manual fix needed`,
      serverAction: false,
    };
  }

  // Post team report (best-effort — failure non-fatal)
  try {
    await fetch(`${VPS_API}/api/mission/team-reports`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agent: 'DIRECTOR',
        cycle: 'ad-hoc',
        threat_level: payload.action === 'REJECT' ? 'AMBER' : 'GREEN',
        summary: `DIRECTOR ${payload.action} on ${payload.path.split('/').pop()}`,
        content: `DIRECTOR ${payload.action} via Centcom Review Register.\n\nReply: \`${replyPath}\`\n\nSee reply file for amendments/reason.`,
      }),
    });
  } catch {
    // Non-fatal — reply file is still written, frontmatter flipped.
  }

  return { success: true, replyPath, originalStatus: newStatusFor(payload.action), serverAction: false };
}

// Convenience: fetch a single file's frontmatter + body (used by modal).
export async function fetchFrontmatterAndBody(path: string): Promise<{ frontmatter: Record<string, any>; body: string; raw: string }> {
  const raw = await readFileContent(path);
  const parsed = parseFrontmatter(raw);
  if (parsed) return { ...parsed, raw };
  return { frontmatter: {}, body: raw, raw };
}
