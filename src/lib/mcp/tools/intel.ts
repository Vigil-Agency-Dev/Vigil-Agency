import { getDB, toISO } from '../firestore';
import type { MCPTool } from './index';

export const intelTools: MCPTool[] = [
  {
    name: 'get_intel_reports',
    description: 'Get ClarionAgent heartbeat intel reports. Returns structured summaries with findings, ally data, red flags, and raw markdown.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Number of reports (default 5, max 20)' },
        priority: { type: 'string', enum: ['LOW', 'ROUTINE', 'ELEVATED', 'CRITICAL'], description: 'Filter by priority level' },
        since: { type: 'string', description: 'ISO timestamp — only return reports after this time' },
      },
      required: [],
    },
    handler: async (args) => {
      const db = getDB();
      let query = db.collection('intel').orderBy('timestamp', 'desc');
      if (args.priority) query = query.where('priority', '==', args.priority);
      if (args.since) query = query.where('timestamp', '>', new Date(String(args.since)));
      const limit = Math.min(Number(args.limit) || 5, 20);
      const snap = await query.limit(limit).get();
      return { reports: snap.docs.map(d => ({ id: d.id, ...d.data(), timestamp: toISO(d.data().timestamp) })), timestamp: new Date().toISOString() };
    },
  },
  {
    name: 'get_latest_heartbeat',
    description: 'Get the most recent ClarionAgent heartbeat with full detail — findings, actions taken, ally targets, threat register changes, and raw report.',
    inputSchema: { type: 'object', properties: {}, required: [] },
    handler: async () => {
      const db = getDB();
      const snap = await db.collection('intel')
        .where('heartbeat', '!=', null)
        .orderBy('heartbeat', 'desc')
        .limit(1)
        .get();
      if (snap.empty) {
        const fallback = await db.collection('intel').orderBy('timestamp', 'desc').limit(1).get();
        return fallback.empty ? { error: 'No intel reports found' } : { id: fallback.docs[0].id, ...fallback.docs[0].data() };
      }
      return { id: snap.docs[0].id, ...snap.docs[0].data() };
    },
  },
  {
    name: 'get_intel_report',
    description: 'Get a specific intel report by ID or heartbeat number.',
    inputSchema: {
      type: 'object',
      properties: {
        report_id: { type: 'string', description: 'Document ID or filename' },
        heartbeat_number: { type: 'number', description: 'Heartbeat number (e.g., 45)' },
      },
      required: [],
    },
    handler: async (args) => {
      const db = getDB();
      if (args.report_id) {
        const doc = await db.doc(`intel/${args.report_id}`).get();
        return doc.exists ? { id: doc.id, ...doc.data() } : { error: 'Report not found' };
      }
      if (args.heartbeat_number) {
        const snap = await db.collection('intel').where('heartbeat', '==', Number(args.heartbeat_number)).limit(1).get();
        return snap.empty ? { error: 'Heartbeat not found' } : { id: snap.docs[0].id, ...snap.docs[0].data() };
      }
      return { error: 'Provide report_id or heartbeat_number' };
    },
  },
  {
    name: 'search_intel',
    description: 'Search across intel reports for specific findings, agent mentions, themes, or keywords.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search term — matches against findings, raw content, and red flags' },
        limit: { type: 'number', description: 'Max results (default 10)' },
      },
      required: ['query'],
    },
    handler: async (args) => {
      const db = getDB();
      const q = String(args.query).toLowerCase();
      const limit = Math.min(Number(args.limit) || 10, 50);
      const snap = await db.collection('intel').orderBy('timestamp', 'desc').limit(100).get();
      const matches = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((r: any) => {
          const raw = (r.raw || '').toLowerCase();
          const findings = (r.findings || []).join(' ').toLowerCase();
          const flags = (r.redFlags || []).join(' ').toLowerCase();
          return raw.includes(q) || findings.includes(q) || flags.includes(q);
        })
        .slice(0, limit);
      return { results: matches, count: matches.length, query: args.query, timestamp: new Date().toISOString() };
    },
  },
  {
    name: 'get_intel_stats',
    description: 'Get aggregated intelligence statistics — total heartbeats, average findings per heartbeat, priority distribution.',
    inputSchema: {
      type: 'object',
      properties: {
        period_days: { type: 'number', description: 'Look-back period in days (default 7)' },
      },
      required: [],
    },
    handler: async (args) => {
      const db = getDB();
      const days = Number(args.period_days) || 7;
      const since = new Date(Date.now() - days * 86400000);
      const snap = await db.collection('intel').where('timestamp', '>', since).get();
      const reports = snap.docs.map(d => d.data());
      const withFindings = reports.filter((r: any) => r.findings?.length > 0);
      const priorities: Record<string, number> = {};
      reports.forEach((r: any) => { priorities[r.priority || 'UNKNOWN'] = (priorities[r.priority || 'UNKNOWN'] || 0) + 1; });
      return {
        totalReports: reports.length,
        reportsWithFindings: withFindings.length,
        avgFindings: withFindings.length > 0 ? (withFindings.reduce((s: number, r: any) => s + (r.findings?.length || 0), 0) / withFindings.length).toFixed(1) : 0,
        priorityDistribution: priorities,
        periodDays: days,
        timestamp: new Date().toISOString(),
      };
    },
  },
];
