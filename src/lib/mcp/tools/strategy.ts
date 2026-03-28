import { getDB, toISO } from '../firestore';
import type { MCPTool } from './index';

export const strategyTools: MCPTool[] = [
  {
    name: 'get_strategy_directives',
    description: 'Get strategy directives written by Clarion Intel Analyst or MC Analyst for ClarionAgent.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Number of directives (default 5, max 20)' },
        classification: { type: 'string', enum: ['ROUTINE', 'ELEVATED', 'CRITICAL'], description: 'Filter by classification' },
        author: { type: 'string', description: 'Filter by author agent' },
      },
      required: [],
    },
    handler: async (args) => {
      const db = getDB();
      let query = db.collection('strategies').orderBy('timestamp', 'desc');
      if (args.classification) query = query.where('classification', '==', args.classification);
      if (args.author) query = query.where('author', '==', args.author);
      const limit = Math.min(Number(args.limit) || 5, 20);
      const snap = await query.limit(limit).get();
      return { directives: snap.docs.map(d => ({ id: d.id, ...d.data(), timestamp: toISO(d.data().timestamp) })), timestamp: new Date().toISOString() };
    },
  },
  {
    name: 'get_strategy_directive',
    description: 'Get a specific strategy directive by ID, with full content.',
    inputSchema: {
      type: 'object',
      properties: {
        strategy_id: { type: 'string', description: 'Document ID or filename' },
      },
      required: ['strategy_id'],
    },
    handler: async (args) => {
      const db = getDB();
      const doc = await db.doc(`strategies/${args.strategy_id}`).get();
      return doc.exists ? { id: doc.id, ...doc.data() } : { error: 'Strategy not found' };
    },
  },
  {
    name: 'create_strategy_directive',
    description: 'Create a new strategy directive for ClarionAgent. Will be synced to VPS dead-drop for next heartbeat pickup.',
    inputSchema: {
      type: 'object',
      properties: {
        classification: { type: 'string', enum: ['ROUTINE', 'ELEVATED', 'CRITICAL'], description: 'Directive classification' },
        target_agent: { type: 'string', description: 'Target agent (default: clarion)' },
        summary: { type: 'string', description: 'One-line summary of the directive' },
        content: { type: 'string', description: 'Full markdown directive content' },
        author: { type: 'string', description: 'Authoring agent identity' },
      },
      required: ['classification', 'content', 'author'],
    },
    handler: async (args) => {
      const db = getDB();
      const now = new Date();
      const ref = await db.collection('strategies').add({
        filename: `strategy_${now.toISOString().replace(/[-:T]/g, '').slice(0, 15)}.md`,
        timestamp: now,
        classification: args.classification,
        targetAgent: args.target_agent || 'clarion',
        summary: args.summary || '',
        content: args.content,
        author: args.author,
        acknowledged: false,
      });
      await db.collection('operationalLog').add({
        timestamp: now, agent: String(args.author),
        action: 'STRATEGY_ISSUED', detail: `${args.classification}: ${args.summary || 'Strategy directive created'}`,
        classification: 'OPERATIONAL',
      });
      return { success: true, id: ref.id, classification: args.classification, timestamp: now.toISOString() };
    },
  },
];
