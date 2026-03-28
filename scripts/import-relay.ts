/**
 * VIGIL Agency — Firestore Import from VPS Relay
 *
 * Reads centcom-relay.json and imports data into Firestore collections.
 * Run: npx tsx scripts/import-relay.ts
 *
 * Can be run as one-time import or scheduled to keep Firestore in sync.
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { join } from 'path';

// Init Firebase Admin
const projectId = 'vigil-agency-4f750';
initializeApp({ projectId });
const db = getFirestore();

// Read relay data
const relayPath = join(process.env.HOME || '', 'Documents/Claude/Projects/VIGIL AGENCY - CENTRAL COMMAND/centcom-relay.json');
let relay: any;
try {
  relay = JSON.parse(readFileSync(relayPath, 'utf8'));
  console.log(`Relay loaded. Timestamp: ${relay.relayTimestamp}`);
} catch (e: any) {
  console.error(`Failed to read relay: ${e.message}`);
  process.exit(1);
}

async function importAll() {
  // 1. Mission config
  const overview = relay.overview || {};
  const mission = overview.mission || {};
  await db.doc('config/mission').set({
    phase: mission.phase || 'OPERATIONAL',
    threatLevel: mission.threat || 'GREEN',
    opsecStatus: mission.opsec || 'GREEN',
    operationalTempo: overview.stats?.offlineHrs > 12 ? 'ELEVATED' : 'ROUTINE',
    lastUpdated: new Date(),
  }, { merge: true });
  console.log('✓ config/mission');

  // 2. Agents
  const agents = overview.agents || {};
  for (const [key, data] of Object.entries(agents) as [string, any][]) {
    if (!data || typeof data !== 'object') continue;
    await db.doc(`agents/${key}`).set({
      name: data.name || key,
      status: data.status || 'UNKNOWN',
      role: data.role || '',
      lastActivity: data.lastActivity ? new Date(data.lastActivity) : new Date(),
      lastHeartbeat: data.lastHB || '',
      overdue: data.overdue || false,
      overdueHours: data.offlineHrs || 0,
      notes: '',
    }, { merge: true });
  }
  console.log(`✓ agents (${Object.keys(agents).length})`);

  // 3. Intel reports
  const intelData = relay.intel;
  const reports = Array.isArray(intelData) ? intelData : intelData?.reports || [];
  for (const r of reports) {
    if (!r.filename) continue;
    const docId = r.filename.replace(/\.[^.]+$/, '');
    await db.doc(`intel/${docId}`).set({
      filename: r.filename,
      heartbeat: r.heartbeat || null,
      timestamp: r.timestamp ? new Date(r.timestamp) : new Date(r.modified || Date.now()),
      phase: r.phase || null,
      opsec: r.opsec || 'GREEN',
      priority: r.priority || 'LOW',
      actionsCount: r.actionsCount || 0,
      findings: r.findings || [],
      questions: r.questions || [],
      redFlags: r.redFlags || [],
      raw: r.raw || '',
      modified: r.modified ? new Date(r.modified) : new Date(),
    }, { merge: true });
  }
  console.log(`✓ intel (${reports.length})`);

  // 4. Threats
  const threatData = relay.threats;
  const threats = threatData?.threats || [];
  for (const t of threats) {
    if (!t.id && !t.name) continue;
    const id = t.id || t.name?.replace(/\s+/g, '-').slice(0, 20);
    await db.doc(`threats/${id}`).set({
      id, title: t.name || t.title || '',
      domain: t.id?.startsWith('DV') ? 'digital' : 'geopolitical',
      severity: t.severity || 'MEDIUM',
      status: t.status || 'MONITORING',
      description: t.detail || t.description || '',
      lastUpdated: new Date(),
    }, { merge: true });
  }
  console.log(`✓ threats (${threats.length})`);

  // 5. MERIDIAN threat register
  const meridianThreats = relay.threatRegister?.threats || [];
  for (const t of meridianThreats) {
    if (!t.id) continue;
    await db.doc(`threats/${t.id}`).set({
      id: t.id, title: t.title || '',
      domain: 'geopolitical',
      severity: t.severity || 'MEDIUM',
      status: t.status || 'ACTIVE',
      evidenceTier: t.evidence_tier || null,
      description: t.detail || t.description || '',
      category: t.category || '',
      lastUpdated: new Date(),
    }, { merge: true });
  }
  console.log(`✓ meridian threats (${meridianThreats.length})`);

  // 6. Hypotheses
  const hypoData = relay.hypotheses?.hypotheses || [];
  for (const h of hypoData) {
    if (!h.id) continue;
    await db.doc(`hypotheses/${h.id}`).set({
      id: h.id, title: h.title || '',
      thesis: h.raw?.split('\n').find((l: string) => l.startsWith('**') && l.length > 50)?.replace(/\*\*/g, '') || '',
      confidence: h.status?.includes('ACTIVE') ? 70 : 50,
      evidenceFor: [],
      evidenceAgainst: [],
      status: h.status?.includes('ACTIVE') ? 'ACCUMULATING' : 'DORMANT',
      crossDomainLinks: h.crossRef || [],
      lastUpdated: new Date(),
      raw: h.raw || '',
    }, { merge: true });
  }
  console.log(`✓ hypotheses (${hypoData.length})`);

  // 7. Pattern matches
  const patterns = relay.patterns?.patterns || [];
  for (const p of patterns) {
    if (!p.id) continue;
    await db.doc(`patterns/${p.id}`).set({
      id: p.id, title: p.title || '',
      confidence: p.confidence || 'MEDIUM',
      description: p.insight || p.cross_domain_insight || '',
      indicators: [],
      linkedThreats: p.relatedHypothesis ? [p.relatedHypothesis] : [],
      linkedHypotheses: [],
      lastUpdated: new Date(),
    }, { merge: true });
  }
  console.log(`✓ patterns (${patterns.length})`);

  // 8. Trajectories
  const traj = relay.trajectory;
  if (traj?.trajectory) {
    await db.doc('trajectories/TRAJ-01').set({
      id: 'TRAJ-01',
      title: 'Breakthrough Disclosure',
      probability: traj.trajectory.overall_probability || 0,
      description: traj.trajectory.assessment || '',
      conditions: [],
      implications: [],
      lastUpdated: new Date(),
    }, { merge: true });
    console.log('✓ trajectory');
  }

  // 9. Team reports from relay
  const teamReports = relay.teamReports?.reports || [];
  for (const r of teamReports) {
    if (!r.team) continue;
    const id = `${r.team}-${Date.now()}`;
    await db.doc(`teamReports/${id}`).set({
      agent: r.team,
      timestamp: r.status?.last_run ? new Date(r.status.last_run) : new Date(),
      cycle: 'ad-hoc',
      summary: r.status?.summary || '',
      metrics: r.status || {},
      escalations: 0,
      threatLevel: r.status?.priority || 'GREEN',
      content: JSON.stringify(r.status, null, 2),
    }, { merge: true });
  }
  console.log(`✓ team reports (${teamReports.length})`);

  console.log('\n✅ Import complete!');
}

importAll().catch(err => {
  console.error('Import failed:', err);
  process.exit(1);
});
