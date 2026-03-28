import { getDB } from '../firestore';
import type { MCPTool } from './index';

export const hypothesisTools: MCPTool[] = [
  {
    name: 'get_hypotheses',
    description: 'Get all active hypotheses under evidence accumulation — thesis statements, confidence levels, supporting and opposing evidence.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['ACCUMULATING', 'CONFIRMED', 'REFUTED', 'DORMANT'], description: 'Filter by status' },
      },
      required: [],
    },
    handler: async (args) => {
      const db = getDB();
      let query = db.collection('hypotheses').orderBy('id');
      if (args.status) query = query.where('status', '==', args.status);
      const snap = await query.get();
      return { hypotheses: snap.docs.map(d => ({ id: d.id, ...d.data() })), timestamp: new Date().toISOString() };
    },
  },
  {
    name: 'update_hypothesis',
    description: 'Update a hypothesis — adjust confidence, add evidence for or against, change status.',
    inputSchema: {
      type: 'object',
      properties: {
        hypothesis_id: { type: 'string', description: 'Hypothesis ID (e.g., H-001)' },
        confidence: { type: 'number', description: 'Updated confidence 0-100' },
        add_evidence_for: { type: 'string', description: 'New supporting evidence to append' },
        add_evidence_against: { type: 'string', description: 'New opposing evidence to append' },
        status: { type: 'string', enum: ['ACCUMULATING', 'CONFIRMED', 'REFUTED', 'DORMANT'] },
        note: { type: 'string', description: 'Update note' },
      },
      required: ['hypothesis_id'],
    },
    handler: async (args) => {
      const db = getDB();
      const now = new Date();
      const ref = db.doc(`hypotheses/${args.hypothesis_id}`);
      const doc = await ref.get();
      if (!doc.exists) return { error: 'Hypothesis not found' };
      const data = doc.data() || {};
      const updates: any = { lastUpdated: now };
      if (args.confidence != null) updates.confidence = args.confidence;
      if (args.status) updates.status = args.status;
      if (args.add_evidence_for) {
        updates.evidenceFor = [...(data.evidenceFor || []), String(args.add_evidence_for)];
      }
      if (args.add_evidence_against) {
        updates.evidenceAgainst = [...(data.evidenceAgainst || []), String(args.add_evidence_against)];
      }
      await ref.set(updates, { merge: true });
      await db.collection('operationalLog').add({
        timestamp: now, agent: 'mcp', action: 'HYPOTHESIS_UPDATED',
        detail: `${args.hypothesis_id}: ${args.note || 'Updated'}`,
        classification: 'INTELLIGENCE',
      });
      return { success: true, id: args.hypothesis_id, timestamp: now.toISOString() };
    },
  },
];
