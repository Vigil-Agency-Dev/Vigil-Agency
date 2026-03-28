import { getDB, toISO } from '../firestore';
import type { MCPTool } from './index';

export const threatTools: MCPTool[] = [
  {
    name: 'get_threats',
    description: 'Get the live threat register — all active threats across digital (DV-series) and geopolitical (T-series) domains.',
    inputSchema: {
      type: 'object',
      properties: {
        domain: { type: 'string', enum: ['digital', 'geopolitical', 'operational', 'all'], description: 'Filter by domain (default: all)' },
        severity: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], description: 'Minimum severity filter' },
        status: { type: 'string', enum: ['MONITORING', 'ACTIVE', 'ESCALATED', 'IMMINENT'], description: 'Filter by status' },
      },
      required: [],
    },
    handler: async (args) => {
      const db = getDB();
      let query = db.collection('threats').orderBy('id');
      if (args.domain && args.domain !== 'all') query = query.where('domain', '==', args.domain);
      if (args.status) query = query.where('status', '==', args.status);
      const snap = await query.get();
      let threats = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (args.severity) {
        const levels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
        const min = levels.indexOf(String(args.severity));
        threats = threats.filter((t: any) => levels.indexOf(t.severity) >= min);
      }
      return { threats, count: threats.length, timestamp: new Date().toISOString() };
    },
  },
  {
    name: 'get_threat',
    description: 'Get full detail on a specific threat by ID (e.g., T-04, DV-01).',
    inputSchema: {
      type: 'object',
      properties: { threat_id: { type: 'string', description: 'Threat ID (e.g., T-04, DV-01)' } },
      required: ['threat_id'],
    },
    handler: async (args) => {
      const db = getDB();
      const doc = await db.doc(`threats/${args.threat_id}`).get();
      return doc.exists ? { id: doc.id, ...doc.data() } : { error: 'Threat not found' };
    },
  },
  {
    name: 'create_threat',
    description: 'Register a new threat in the threat register.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Threat ID (e.g., T-12, DV-09)' },
        title: { type: 'string' },
        domain: { type: 'string', enum: ['digital', 'geopolitical', 'operational'] },
        severity: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
        status: { type: 'string', enum: ['MONITORING', 'ACTIVE', 'ESCALATED', 'IMMINENT'] },
        evidence_tier: { type: 'number', description: 'Evidence tier 1-5' },
        description: { type: 'string' },
        cross_refs: { type: 'array', items: { type: 'string' }, description: 'Related threat/hypothesis/pattern IDs' },
      },
      required: ['id', 'title', 'domain', 'severity', 'status', 'description'],
    },
    handler: async (args) => {
      const db = getDB();
      const now = new Date();
      await db.doc(`threats/${args.id}`).set({
        id: args.id, title: args.title, domain: args.domain,
        severity: args.severity, status: args.status,
        evidenceTier: args.evidence_tier || null,
        description: args.description,
        crossRefs: args.cross_refs || [],
        lastUpdated: now, history: [{ date: now.toISOString(), note: 'Threat created' }],
      });
      await db.collection('operationalLog').add({
        timestamp: now, agent: 'mcp', action: 'THREAT_CREATED',
        detail: `${args.id}: ${args.title} [${args.severity}/${args.status}]`,
        classification: 'OPERATIONAL',
      });
      return { success: true, id: args.id, timestamp: now.toISOString() };
    },
  },
  {
    name: 'update_threat',
    description: 'Update an existing threat — change severity, status, add history note.',
    inputSchema: {
      type: 'object',
      properties: {
        threat_id: { type: 'string', description: 'Threat ID to update' },
        severity: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
        status: { type: 'string', enum: ['MONITORING', 'ACTIVE', 'ESCALATED', 'IMMINENT', 'RESOLVED'] },
        note: { type: 'string', description: 'History note explaining the update' },
        cross_refs: { type: 'array', items: { type: 'string' } },
      },
      required: ['threat_id'],
    },
    handler: async (args) => {
      const db = getDB();
      const now = new Date();
      const updates: any = { lastUpdated: now };
      if (args.severity) updates.severity = args.severity;
      if (args.status) updates.status = args.status;
      if (args.cross_refs) updates.crossRefs = args.cross_refs;
      await db.doc(`threats/${args.threat_id}`).set(updates, { merge: true });
      if (args.note) {
        const doc = await db.doc(`threats/${args.threat_id}`).get();
        const history = doc.data()?.history || [];
        history.push({ date: now.toISOString(), note: args.note });
        await db.doc(`threats/${args.threat_id}`).update({ history });
      }
      await db.collection('operationalLog').add({
        timestamp: now, agent: 'mcp', action: 'THREAT_UPDATED',
        detail: `${args.threat_id}: ${args.note || 'Updated'}`,
        classification: 'OPERATIONAL',
      });
      return { success: true, id: args.threat_id, timestamp: now.toISOString() };
    },
  },
  {
    name: 'get_threat_summary',
    description: 'Get a high-level threat environment summary — counts by severity and domain, IMMINENT/CRITICAL items highlighted.',
    inputSchema: { type: 'object', properties: {}, required: [] },
    handler: async () => {
      const db = getDB();
      const snap = await db.collection('threats').get();
      const threats = snap.docs.map(d => d.data());
      const bySeverity: Record<string, number> = {};
      const byDomain: Record<string, number> = {};
      threats.forEach((t: any) => {
        bySeverity[t.severity] = (bySeverity[t.severity] || 0) + 1;
        byDomain[t.domain] = (byDomain[t.domain] || 0) + 1;
      });
      const critical = threats.filter((t: any) => t.severity === 'CRITICAL' || t.status === 'IMMINENT');
      return { total: threats.length, bySeverity, byDomain, critical, timestamp: new Date().toISOString() };
    },
  },
];
