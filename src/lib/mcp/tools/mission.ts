import { getDB, toISO } from '../firestore';
import type { MCPTool } from './index';

export const missionTools: MCPTool[] = [
  {
    name: 'get_mission_overview',
    description: 'Get VIGIL Agency mission status — phase, threat level, OPSEC status, operational tempo, and summary of all agent statuses.',
    inputSchema: { type: 'object', properties: {}, required: [] },
    handler: async () => {
      const db = getDB();
      const configDoc = await db.doc('config/mission').get();
      const agentsSnap = await db.collection('agents').get();
      const agents = agentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      return { mission: configDoc.data() || {}, agents, timestamp: new Date().toISOString() };
    },
  },
  {
    name: 'get_agent_statuses',
    description: 'Get status of all VIGIL agents — ClarionAgent, MC Analyst, MERIDIAN, AXIOM, Clarion Intel Analyst. Shows active/offline, last activity, overdue flags.',
    inputSchema: {
      type: 'object',
      properties: {
        agent_id: { type: 'string', description: 'Optional. Filter to a specific agent: clarion, mc-analyst, meridian, axiom, clarion-intel-analyst' },
      },
      required: [],
    },
    handler: async (args) => {
      const db = getDB();
      if (args.agent_id) {
        const doc = await db.doc(`agents/${args.agent_id}`).get();
        return doc.exists ? { id: doc.id, ...doc.data() } : { error: 'Agent not found' };
      }
      const snap = await db.collection('agents').get();
      return { agents: snap.docs.map(d => ({ id: d.id, ...d.data() })), timestamp: new Date().toISOString() };
    },
  },
  {
    name: 'get_centcom_assessment',
    description: "Get the latest VIGIL COMMANDER situational assessment — operational status, agent health, threat environment, recommended actions.",
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Number of assessments to return (default 1, max 10)' },
      },
      required: [],
    },
    handler: async (args) => {
      const db = getDB();
      const limit = Math.min(Number(args.limit) || 1, 10);
      const snap = await db.collection('teamReports')
        .where('agent', '==', 'vigil-commander')
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();
      return { assessments: snap.docs.map(d => ({ id: d.id, ...d.data() })), timestamp: new Date().toISOString() };
    },
  },
  {
    name: 'update_threat_level',
    description: 'Update the mission-wide threat level. Requires justification. Logs to operational audit trail.',
    inputSchema: {
      type: 'object',
      properties: {
        level: { type: 'string', enum: ['GREEN', 'AMBER', 'ORANGE', 'RED', 'BLACK'], description: 'New threat level' },
        justification: { type: 'string', description: 'Reason for the change' },
        source_agent: { type: 'string', description: 'Agent making the assessment' },
      },
      required: ['level', 'justification'],
    },
    handler: async (args) => {
      const db = getDB();
      await db.doc('config/mission').set({ threatLevel: args.level, lastUpdated: new Date() }, { merge: true });
      await db.collection('operationalLog').add({
        timestamp: new Date(), agent: args.source_agent || 'unknown',
        action: 'THREAT_LEVEL_CHANGE', detail: `${args.level}: ${args.justification}`,
        classification: 'OPERATIONAL',
      });
      return { success: true, threatLevel: args.level, timestamp: new Date().toISOString() };
    },
  },
  {
    name: 'update_agent_status',
    description: "Update an agent's operational status (ACTIVE, AMBER, OFFLINE, PLANNED).",
    inputSchema: {
      type: 'object',
      properties: {
        agent_id: { type: 'string', description: 'Agent ID: clarion, mc-analyst, meridian, axiom, clarion-intel-analyst' },
        status: { type: 'string', enum: ['ACTIVE', 'AMBER', 'OFFLINE', 'PLANNED'] },
        notes: { type: 'string', description: 'Status note or reason' },
      },
      required: ['agent_id', 'status'],
    },
    handler: async (args) => {
      const db = getDB();
      await db.doc(`agents/${args.agent_id}`).set({
        status: args.status, notes: args.notes || '', lastActivity: new Date(),
      }, { merge: true });
      await db.collection('operationalLog').add({
        timestamp: new Date(), agent: String(args.agent_id),
        action: 'STATUS_CHANGE', detail: `${args.status}: ${args.notes || ''}`,
        classification: 'OPERATIONAL',
      });
      return { success: true, agent: args.agent_id, status: args.status, timestamp: new Date().toISOString() };
    },
  },
  {
    name: 'get_operational_log',
    description: 'Retrieve the operational audit trail — all status changes, escalations, and significant actions.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Number of entries (default 20, max 100)' },
        agent: { type: 'string', description: 'Filter by agent ID' },
        since: { type: 'string', description: 'ISO timestamp — only return entries after this time' },
      },
      required: [],
    },
    handler: async (args) => {
      const db = getDB();
      let query = db.collection('operationalLog').orderBy('timestamp', 'desc');
      if (args.agent) query = query.where('agent', '==', args.agent);
      if (args.since) query = query.where('timestamp', '>', new Date(String(args.since)));
      const limit = Math.min(Number(args.limit) || 20, 100);
      const snap = await query.limit(limit).get();
      return { entries: snap.docs.map(d => ({ id: d.id, ...d.data(), timestamp: toISO(d.data().timestamp) })), timestamp: new Date().toISOString() };
    },
  },
];
