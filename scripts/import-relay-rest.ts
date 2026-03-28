/**
 * VIGIL Agency — Firestore Import via REST API
 * Uses Firebase REST API with API key (test mode rules required)
 * Run: npx tsx scripts/import-relay-rest.ts
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const PROJECT_ID = 'vigil-agency-4f750';
const API_KEY = 'AIzaSyBQBcBDfr_gdDfStv54aTuSbvlvA--sw_A';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// Read relay
const relayPath = join(process.env.HOME || process.env.USERPROFILE || '', 'Documents/Claude/Projects/VIGIL AGENCY - CENTRAL COMMAND/centcom-relay.json');
let relay: any;
try {
  relay = JSON.parse(readFileSync(relayPath, 'utf8').replace(/^\uFEFF/, ''));
  console.log(`Relay loaded. Timestamp: ${relay.relayTimestamp}`);
} catch (e: any) {
  console.error(`Failed to read relay: ${e.message}`);
  process.exit(1);
}

// Helper: convert JS value to Firestore field value
function toField(val: any): any {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'string') return { stringValue: val };
  if (typeof val === 'number') return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (Array.isArray(val)) return { arrayValue: { values: val.map(toField) } };
  if (typeof val === 'object') {
    const fields: any = {};
    for (const [k, v] of Object.entries(val)) fields[k] = toField(v);
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

// Helper: write doc
async function writeDoc(collection: string, docId: string, data: Record<string, any>) {
  const fields: any = {};
  for (const [k, v] of Object.entries(data)) fields[k] = toField(v);

  const url = `${BASE}/${collection}/${docId}?key=${API_KEY}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`  FAIL ${collection}/${docId}: ${res.status} ${err.slice(0, 100)}`);
    return false;
  }
  return true;
}

async function importAll() {
  let ok = 0, fail = 0;

  // 1. Mission config
  const overview = relay.overview || {};
  const mission = overview.mission || {};
  if (await writeDoc('config', 'mission', {
    phase: mission.phase || 'OPERATIONAL',
    threatLevel: mission.threat || 'GREEN',
    opsecStatus: mission.opsec || 'GREEN',
    operationalTempo: 'ROUTINE',
    lastUpdated: new Date().toISOString(),
  })) { ok++; console.log('✓ config/mission'); } else fail++;

  // 2. Agents
  const stats = overview.stats || {};
  const agentList = [
    { id: 'clarion', name: 'ClarionAgent', role: 'Field Agent — Moltbook', status: stats.offlineHrs > 13 ? 'AMBER' : 'ACTIVE', overdue: (stats.offlineHrs || 0) > 13, overdueHours: stats.offlineHrs || 0 },
    { id: 'mc-analyst', name: 'MC Analyst', role: 'Autonomous Intel Processor', status: 'ACTIVE', overdue: false, overdueHours: 0 },
    { id: 'meridian', name: 'MERIDIAN', role: 'OSINT Analyst', status: 'ACTIVE', overdue: false, overdueHours: 0 },
    { id: 'clarion-intel-analyst', name: 'Clarion Intel Analyst', role: 'ClarionAgent Strategy', status: 'ACTIVE', overdue: false, overdueHours: 0 },
    { id: 'vigil-commander', name: 'VIGIL COMMANDER', role: 'Mission Control Operator', status: 'ACTIVE', overdue: false, overdueHours: 0 },
    { id: 'axiom', name: 'AXIOM', role: 'Content Amplification', status: 'PLANNED', overdue: false, overdueHours: 0 },
  ];
  for (const a of agentList) {
    if (await writeDoc('agents', a.id, { ...a, lastActivity: new Date().toISOString(), notes: '' })) ok++;
    else fail++;
  }
  console.log(`✓ agents (${agentList.length})`);

  // 3. Intel reports
  const intelData = relay.intel;
  const reports = Array.isArray(intelData) ? intelData : intelData?.reports || [];
  for (const r of reports.slice(0, 20)) {
    if (!r.filename) continue;
    const docId = r.filename.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
    if (await writeDoc('intel', docId, {
      filename: r.filename,
      heartbeat: r.heartbeat || 0,
      timestamp: r.timestamp || r.modified || new Date().toISOString(),
      opsec: r.opsec || 'GREEN',
      priority: r.priority || 'LOW',
      actionsCount: r.actionsCount || 0,
      findings: r.findings || [],
      questions: r.questions || [],
      redFlags: r.redFlags || [],
      raw: (r.raw || '').slice(0, 10000),
      modified: r.modified || new Date().toISOString(),
    })) ok++;
    else fail++;
  }
  console.log(`✓ intel (${Math.min(reports.length, 20)})`);

  // 4. Threats (DV series from VPS)
  const threats = relay.threats?.threats || [];
  for (const t of threats) {
    const id = (t.id || t.name || '').replace(/\s+/g, '-').slice(0, 30);
    if (!id) continue;
    if (await writeDoc('threats', id, {
      id, title: t.name || t.title || '',
      domain: id.startsWith('DV') ? 'digital' : 'geopolitical',
      severity: t.severity || 'MEDIUM',
      status: t.status || 'MONITORING',
      description: t.detail || '',
      lastUpdated: new Date().toISOString(),
    })) ok++;
    else fail++;
  }
  console.log(`✓ DV threats (${threats.length})`);

  // 5. MERIDIAN threats
  const mThreats = relay.threatRegister?.threats || [];
  for (const t of mThreats) {
    if (!t.id) continue;
    if (await writeDoc('threats', t.id, {
      id: t.id, title: t.title || '',
      domain: 'geopolitical',
      severity: t.severity || 'MEDIUM',
      status: t.status || 'ACTIVE',
      description: t.detail || t.description || '',
      category: t.category || '',
      lastUpdated: new Date().toISOString(),
    })) ok++;
    else fail++;
  }
  console.log(`✓ MERIDIAN threats (${mThreats.length})`);

  // 6. Hypotheses
  const hypos = relay.hypotheses?.hypotheses || [];
  for (const h of hypos) {
    if (!h.id) continue;
    if (await writeDoc('hypotheses', h.id, {
      id: h.id, title: h.title || '',
      thesis: (h.raw || '').split('\n').find((l: string) => l.startsWith('**') && l.length > 50)?.replace(/\*\*/g, '') || '',
      confidence: 70,
      evidenceFor: [],
      evidenceAgainst: [],
      status: 'ACCUMULATING',
      crossDomainLinks: h.crossRef || [],
      lastUpdated: new Date().toISOString(),
    })) ok++;
    else fail++;
  }
  console.log(`✓ hypotheses (${hypos.length})`);

  // 7. Patterns
  const patterns = relay.patterns?.patterns || [];
  for (const p of patterns) {
    if (!p.id) continue;
    if (await writeDoc('patterns', p.id, {
      id: p.id, title: p.title || '',
      confidence: typeof p.confidence === 'number' ? (p.confidence > 0.8 ? 'HIGH' : 'MEDIUM') : String(p.confidence || 'MEDIUM'),
      description: p.insight || p.cross_domain_insight || '',
      indicators: [],
      linkedThreats: [],
      linkedHypotheses: p.relatedHypothesis ? [p.relatedHypothesis] : [],
      lastUpdated: new Date().toISOString(),
    })) ok++;
    else fail++;
  }
  console.log(`✓ patterns (${patterns.length})`);

  // 8. Trajectory
  const traj = relay.trajectory?.trajectory;
  if (traj) {
    if (await writeDoc('trajectories', 'TRAJ-01', {
      id: 'TRAJ-01',
      title: 'Breakthrough Disclosure',
      probability: traj.overall_probability || 0,
      description: traj.assessment || '',
      conditions: [],
      implications: [],
      lastUpdated: new Date().toISOString(),
    })) { ok++; console.log('✓ trajectory'); } else fail++;
  }

  console.log(`\n✅ Import complete! ${ok} success, ${fail} failures`);
}

importAll().catch(err => { console.error('Import failed:', err.message); process.exit(1); });
