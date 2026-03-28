import { getDB } from '../firestore';
import type { MCPTool } from './index';

export const patternTools: MCPTool[] = [
  {
    name: 'get_pattern_matches',
    description: 'Get identified pattern matches — recurring behaviours, coordination indicators, and cross-domain structural parallels.',
    inputSchema: {
      type: 'object',
      properties: {
        confidence: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CONFIRMED'], description: 'Minimum confidence filter' },
      },
      required: [],
    },
    handler: async (args) => {
      const db = getDB();
      const snap = await db.collection('patterns').orderBy('id').get();
      let patterns = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (args.confidence) {
        const levels = ['LOW', 'MEDIUM', 'HIGH', 'CONFIRMED'];
        const min = levels.indexOf(String(args.confidence));
        patterns = patterns.filter((p: any) => levels.indexOf(p.confidence) >= min);
      }
      return { patterns, count: patterns.length, timestamp: new Date().toISOString() };
    },
  },
  {
    name: 'update_pattern',
    description: 'Update a pattern match — adjust confidence, add indicators, link threats or hypotheses.',
    inputSchema: {
      type: 'object',
      properties: {
        pattern_id: { type: 'string', description: 'Pattern ID (e.g., PM-005)' },
        confidence: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CONFIRMED'] },
        add_indicator: { type: 'string', description: 'New indicator to append' },
        linked_threats: { type: 'array', items: { type: 'string' } },
        linked_hypotheses: { type: 'array', items: { type: 'string' } },
      },
      required: ['pattern_id'],
    },
    handler: async (args) => {
      const db = getDB();
      const now = new Date();
      const ref = db.doc(`patterns/${args.pattern_id}`);
      const doc = await ref.get();
      if (!doc.exists) return { error: 'Pattern not found' };
      const data = doc.data() || {};
      const updates: any = { lastUpdated: now };
      if (args.confidence) updates.confidence = args.confidence;
      if (args.add_indicator) updates.indicators = [...(data.indicators || []), String(args.add_indicator)];
      if (args.linked_threats) updates.linkedThreats = args.linked_threats;
      if (args.linked_hypotheses) updates.linkedHypotheses = args.linked_hypotheses;
      await ref.set(updates, { merge: true });
      return { success: true, id: args.pattern_id, timestamp: now.toISOString() };
    },
  },
  {
    name: 'get_trajectories',
    description: 'Get probability-weighted outcome trajectories — scenario forecasting with conditions and implications.',
    inputSchema: { type: 'object', properties: {}, required: [] },
    handler: async () => {
      const db = getDB();
      const snap = await db.collection('trajectories').get();
      return { trajectories: snap.docs.map(d => ({ id: d.id, ...d.data() })), timestamp: new Date().toISOString() };
    },
  },
];
