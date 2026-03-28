import { getDB, toISO } from '../firestore';
import type { MCPTool } from './index';

export const reportTools: MCPTool[] = [
  {
    name: 'get_team_reports',
    description: 'Get team reports submitted by any VIGIL agent — analysis summaries, cycle metrics, escalation counts.',
    inputSchema: {
      type: 'object',
      properties: {
        agent: { type: 'string', description: 'Filter by agent ID' },
        cycle: { type: 'string', enum: ['morning', 'evening', 'ad-hoc'], description: 'Filter by cycle' },
        limit: { type: 'number', description: 'Number of reports (default 10)' },
        since: { type: 'string', description: 'ISO timestamp — reports after this time' },
      },
      required: [],
    },
    handler: async (args) => {
      const db = getDB();
      let query = db.collection('teamReports').orderBy('timestamp', 'desc');
      if (args.agent) query = query.where('agent', '==', args.agent);
      if (args.cycle) query = query.where('cycle', '==', args.cycle);
      if (args.since) query = query.where('timestamp', '>', new Date(String(args.since)));
      const limit = Math.min(Number(args.limit) || 10, 50);
      const snap = await query.limit(limit).get();
      return { reports: snap.docs.map(d => ({ id: d.id, ...d.data(), timestamp: toISO(d.data().timestamp) })), timestamp: new Date().toISOString() };
    },
  },
  {
    name: 'get_team_report',
    description: 'Get a specific team report by ID with full content.',
    inputSchema: {
      type: 'object',
      properties: { report_id: { type: 'string' } },
      required: ['report_id'],
    },
    handler: async (args) => {
      const db = getDB();
      const doc = await db.doc(`teamReports/${args.report_id}`).get();
      return doc.exists ? { id: doc.id, ...doc.data() } : { error: 'Report not found' };
    },
  },
  {
    name: 'push_team_report',
    description: 'Submit a team report from any VIGIL agent.',
    inputSchema: {
      type: 'object',
      properties: {
        agent: { type: 'string', description: 'Reporting agent ID' },
        cycle: { type: 'string', enum: ['morning', 'evening', 'ad-hoc'] },
        summary: { type: 'string', description: 'One-line summary' },
        metrics: { type: 'object', description: 'Key-value metrics (flexible schema)' },
        escalations: { type: 'number', description: 'Number of escalations this cycle' },
        threat_level: { type: 'string', enum: ['GREEN', 'AMBER', 'ORANGE', 'RED'] },
        content: { type: 'string', description: 'Full report content (markdown)' },
      },
      required: ['agent', 'cycle', 'summary', 'content'],
    },
    handler: async (args) => {
      const db = getDB();
      const now = new Date();
      const ref = await db.collection('teamReports').add({
        agent: args.agent, cycle: args.cycle, summary: args.summary,
        metrics: args.metrics || {}, escalations: Number(args.escalations) || 0,
        threatLevel: args.threat_level || 'GREEN',
        content: args.content, timestamp: now,
      });
      return { success: true, id: ref.id, timestamp: now.toISOString() };
    },
  },
];
