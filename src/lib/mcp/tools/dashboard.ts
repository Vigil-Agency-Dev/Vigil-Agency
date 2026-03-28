import { getDB, toISO } from '../firestore';
import type { MCPTool } from './index';

export const dashboardTools: MCPTool[] = [
  {
    name: 'get_dashboard',
    description: 'Get a comprehensive operational dashboard — mission status, all agent statuses, threat summary, recent intel, latest strategy, operational tempo. The single-call overview for mobile check-ins.',
    inputSchema: { type: 'object', properties: {}, required: [] },
    handler: async () => {
      const db = getDB();
      const [configDoc, agentsSnap, threatsSnap, intelSnap, stratSnap, reportsSnap, hypoSnap, trajSnap] = await Promise.all([
        db.doc('config/mission').get(),
        db.collection('agents').get(),
        db.collection('threats').get(),
        db.collection('intel').orderBy('timestamp', 'desc').limit(3).get(),
        db.collection('strategies').orderBy('timestamp', 'desc').limit(1).get(),
        db.collection('teamReports').orderBy('timestamp', 'desc').limit(3).get(),
        db.collection('hypotheses').get(),
        db.collection('trajectories').get(),
      ]);

      const threats = threatsSnap.docs.map(d => d.data());
      const critical = threats.filter((t: any) => t.severity === 'CRITICAL' || t.status === 'IMMINENT');

      return {
        mission: configDoc.data() || {},
        agents: agentsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
        threatSummary: {
          total: threats.length,
          critical: critical.length,
          active: threats.filter((t: any) => t.status === 'ACTIVE').length,
          criticalItems: critical,
        },
        latestIntel: intelSnap.docs.map(d => {
          const data = d.data();
          return { id: d.id, filename: data.filename, heartbeat: data.heartbeat, priority: data.priority, findingsCount: data.findings?.length || 0, timestamp: toISO(data.timestamp) };
        }),
        latestStrategy: stratSnap.empty ? null : { id: stratSnap.docs[0].id, ...stratSnap.docs[0].data(), timestamp: toISO(stratSnap.docs[0].data().timestamp) },
        latestReports: reportsSnap.docs.map(d => {
          const data = d.data();
          return { id: d.id, agent: data.agent, summary: data.summary, threatLevel: data.threatLevel, timestamp: toISO(data.timestamp) };
        }),
        hypotheses: hypoSnap.docs.map(d => {
          const data = d.data();
          return { id: d.id, title: data.title, status: data.status, confidence: data.confidence };
        }),
        trajectories: trajSnap.docs.map(d => {
          const data = d.data();
          return { id: d.id, title: data.title, probability: data.probability };
        }),
        timestamp: new Date().toISOString(),
      };
    },
  },
  {
    name: 'get_operational_timeline',
    description: 'Get a chronological timeline of all significant events across agents — heartbeats, strategies, status changes, escalations.',
    inputSchema: {
      type: 'object',
      properties: {
        hours: { type: 'number', description: 'Look-back window in hours (default 24, max 168)' },
        agent: { type: 'string', description: 'Filter by agent' },
      },
      required: [],
    },
    handler: async (args) => {
      const db = getDB();
      const hours = Math.min(Number(args.hours) || 24, 168);
      const since = new Date(Date.now() - hours * 3600000);

      const [intelSnap, stratSnap, logSnap, reportSnap] = await Promise.all([
        db.collection('intel').where('timestamp', '>', since).orderBy('timestamp', 'desc').limit(50).get(),
        db.collection('strategies').where('timestamp', '>', since).orderBy('timestamp', 'desc').limit(20).get(),
        db.collection('operationalLog').where('timestamp', '>', since).orderBy('timestamp', 'desc').limit(50).get(),
        db.collection('teamReports').where('timestamp', '>', since).orderBy('timestamp', 'desc').limit(20).get(),
      ]);

      const events: any[] = [];
      intelSnap.docs.forEach(d => { const data = d.data(); events.push({ type: 'intel', agent: 'clarion', timestamp: toISO(data.timestamp), detail: `HB${data.heartbeat || '?'}: ${data.findings?.length || 0} findings` }); });
      stratSnap.docs.forEach(d => { const data = d.data(); events.push({ type: 'strategy', agent: data.author || 'unknown', timestamp: toISO(data.timestamp), detail: `${data.classification}: ${data.summary || data.filename}` }); });
      logSnap.docs.forEach(d => { const data = d.data(); events.push({ type: 'log', agent: data.agent, timestamp: toISO(data.timestamp), detail: `${data.action}: ${data.detail}` }); });
      reportSnap.docs.forEach(d => { const data = d.data(); events.push({ type: 'report', agent: data.agent, timestamp: toISO(data.timestamp), detail: data.summary }); });

      events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      let filtered = events;
      if (args.agent) filtered = events.filter(e => e.agent === args.agent);

      return { events: filtered, count: filtered.length, hours, timestamp: new Date().toISOString() };
    },
  },
  {
    name: 'get_cycle_status',
    description: "Get the current operational cycle status — what's due, what's overdue, what's completed this cycle.",
    inputSchema: { type: 'object', properties: {}, required: [] },
    handler: async () => {
      const db = getDB();
      const now = new Date();
      const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);

      const [agentsSnap, intelSnap, stratSnap, reportSnap] = await Promise.all([
        db.collection('agents').get(),
        db.collection('intel').where('timestamp', '>', todayStart).get(),
        db.collection('strategies').where('timestamp', '>', todayStart).get(),
        db.collection('teamReports').where('timestamp', '>', todayStart).get(),
      ]);

      const agents = agentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const overdueAgents = agents.filter((a: any) => a.overdue);

      return {
        date: now.toISOString().split('T')[0],
        agents: agents.map((a: any) => ({ id: a.id, status: a.status, overdue: a.overdue || false, lastActivity: a.lastActivity ? toISO(a.lastActivity) : 'never' })),
        todayIntel: intelSnap.size,
        todayStrategies: stratSnap.size,
        todayReports: reportSnap.size,
        overdueAgents: overdueAgents.map((a: any) => a.id),
        timestamp: now.toISOString(),
      };
    },
  },
];
