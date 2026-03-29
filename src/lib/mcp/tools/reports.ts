import { vpsGet, vpsPost } from '../vps-client';
import type { MCPTool } from './index';

export const reportTools: MCPTool[] = [
  {
    name: 'get_team_reports',
    description: 'Get team reports submitted by VIGIL agents.',
    inputSchema: {
      type: 'object',
      properties: { agent: { type: 'string' }, limit: { type: 'number' } },
      required: [],
    },
    handler: async () => vpsGet('/api/mission/team-reports'),
  },
  {
    name: 'get_team_report',
    description: 'Get a specific team report.',
    inputSchema: {
      type: 'object',
      properties: { report_id: { type: 'string' } },
      required: ['report_id'],
    },
    handler: async () => vpsGet('/api/mission/team-reports'),
  },
  {
    name: 'push_team_report',
    description: 'Submit a team report from any VIGIL agent.',
    inputSchema: {
      type: 'object',
      properties: {
        agent: { type: 'string' },
        cycle: { type: 'string', enum: ['morning', 'evening', 'ad-hoc'] },
        summary: { type: 'string' },
        threat_level: { type: 'string', enum: ['GREEN', 'AMBER', 'ORANGE', 'RED'] },
        content: { type: 'string' },
      },
      required: ['agent', 'summary', 'content'],
    },
    handler: async (args) => vpsPost('/api/mission/team-report', {
      team: args.agent,
      status: {
        type: args.cycle || 'ad-hoc',
        summary: args.summary,
        threat_level: args.threat_level || 'GREEN',
        content: args.content,
        last_run: new Date().toISOString(),
      },
    }),
  },
  {
    name: 'get_reddit_queue',
    description: 'Get AXIOM Reddit approval queue — comments/posts awaiting DIRECTOR approval before posting.',
    inputSchema: { type: 'object', properties: {}, required: [] },
    handler: async () => vpsGet('/api/axiom-reddit/queue'),
  },
  {
    name: 'approve_reddit_item',
    description: 'Approve or reject an AXIOM Reddit queue item.',
    inputSchema: {
      type: 'object',
      properties: {
        filename: { type: 'string', description: 'Queue item filename' },
        action: { type: 'string', enum: ['approve', 'reject'], description: 'Approve or reject' },
      },
      required: ['filename', 'action'],
    },
    handler: async (args) => vpsPost('/api/axiom-reddit/approve', { filename: args.filename, action: args.action }),
  },
];
