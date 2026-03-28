import { vpsGet, vpsPost } from '../vps-client';
import type { MCPTool } from './index';

export const missionTools: MCPTool[] = [
  {
    name: 'get_mission_overview',
    description: 'Get VIGIL Agency mission status — phase, threat level, OPSEC status, operational tempo, and summary of all agent statuses.',
    inputSchema: { type: 'object', properties: {}, required: [] },
    handler: async () => vpsGet('/api/mission/overview'),
  },
  {
    name: 'get_agent_statuses',
    description: 'Get status of all VIGIL agents — ClarionAgent, MC Analyst, MERIDIAN, AXIOM, Clarion Intel Analyst.',
    inputSchema: {
      type: 'object',
      properties: { agent_id: { type: 'string', description: 'Optional. Filter to a specific agent.' } },
      required: [],
    },
    handler: async () => vpsGet('/api/mission/agents'),
  },
  {
    name: 'get_centcom_assessment',
    description: "Get the latest VIGIL COMMANDER situational assessment.",
    inputSchema: {
      type: 'object',
      properties: { limit: { type: 'number', description: 'Number of assessments (default 1)' } },
      required: [],
    },
    handler: async () => vpsGet('/api/mission/team-reports'),
  },
  {
    name: 'update_threat_level',
    description: 'Update the mission-wide threat level. Requires justification.',
    inputSchema: {
      type: 'object',
      properties: {
        level: { type: 'string', enum: ['GREEN', 'AMBER', 'ORANGE', 'RED', 'BLACK'] },
        justification: { type: 'string' },
        source_agent: { type: 'string' },
      },
      required: ['level', 'justification'],
    },
    handler: async (args) => vpsPost('/api/mission/team-report', {
      team: args.source_agent || 'MCP',
      status: { type: 'threat_level_change', level: args.level, justification: args.justification, last_run: new Date().toISOString() },
    }),
  },
  {
    name: 'update_agent_status',
    description: "Update an agent's operational status.",
    inputSchema: {
      type: 'object',
      properties: {
        agent_id: { type: 'string' },
        status: { type: 'string', enum: ['ACTIVE', 'AMBER', 'OFFLINE', 'PLANNED'] },
        notes: { type: 'string' },
      },
      required: ['agent_id', 'status'],
    },
    handler: async (args) => vpsPost('/api/mission/team-report', {
      team: String(args.agent_id),
      status: { type: 'status_update', status: args.status, notes: args.notes || '', last_run: new Date().toISOString() },
    }),
  },
  {
    name: 'get_operational_log',
    description: 'Retrieve the operational audit trail.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Number of entries (default 20)' },
        agent: { type: 'string' },
      },
      required: [],
    },
    handler: async () => vpsGet('/api/mission/team-reports'),
  },
];
