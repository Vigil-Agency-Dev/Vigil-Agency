import { vpsGet, vpsPost } from '../vps-client';
import type { MCPTool } from './index';

export const threatTools: MCPTool[] = [
  {
    name: 'get_threats',
    description: 'Get the live threat register — all active threats across digital and geopolitical domains.',
    inputSchema: {
      type: 'object',
      properties: {
        domain: { type: 'string', enum: ['digital', 'geopolitical', 'all'] },
      },
      required: [],
    },
    handler: async () => {
      const [dv, meridian] = await Promise.all([
        vpsGet('/api/mission/threats'),
        vpsGet('/api/mission/threat-register').catch(() => ({ threats: [] })),
      ]);
      return { digitalThreats: dv.threats || [], meridianThreats: meridian.threats || [], timestamp: new Date().toISOString() };
    },
  },
  {
    name: 'get_threat',
    description: 'Get detail on a specific threat by ID.',
    inputSchema: {
      type: 'object',
      properties: { threat_id: { type: 'string' } },
      required: ['threat_id'],
    },
    handler: async (args) => {
      const [dv, meridian] = await Promise.all([
        vpsGet('/api/mission/threats'),
        vpsGet('/api/mission/threat-register').catch(() => ({ threats: [] })),
      ]);
      const all = [...(dv.threats || []), ...(meridian.threats || [])];
      return all.find((t: any) => t.id === args.threat_id) || { error: 'Threat not found' };
    },
  },
  {
    name: 'create_threat',
    description: 'Register a new threat.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' }, title: { type: 'string' },
        domain: { type: 'string', enum: ['digital', 'geopolitical', 'operational'] },
        severity: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
        status: { type: 'string', enum: ['MONITORING', 'ACTIVE', 'ESCALATED', 'IMMINENT'] },
        description: { type: 'string' },
      },
      required: ['id', 'title', 'severity', 'status', 'description'],
    },
    handler: async (args) => vpsPost('/api/mission/team-report', {
      team: 'MCP', status: { type: 'threat_created', ...args, last_run: new Date().toISOString() },
    }),
  },
  {
    name: 'update_threat',
    description: 'Update an existing threat.',
    inputSchema: {
      type: 'object',
      properties: {
        threat_id: { type: 'string' },
        severity: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
        status: { type: 'string', enum: ['MONITORING', 'ACTIVE', 'ESCALATED', 'IMMINENT', 'RESOLVED'] },
        note: { type: 'string' },
      },
      required: ['threat_id'],
    },
    handler: async (args) => vpsPost('/api/mission/team-report', {
      team: 'MCP', status: { type: 'threat_updated', ...args, last_run: new Date().toISOString() },
    }),
  },
  {
    name: 'get_threat_summary',
    description: 'High-level threat environment summary — counts by severity, critical items.',
    inputSchema: { type: 'object', properties: {}, required: [] },
    handler: async () => {
      const [dv, meridian] = await Promise.all([
        vpsGet('/api/mission/threats'),
        vpsGet('/api/mission/threat-register').catch(() => ({ threats: [] })),
      ]);
      const all = [...(dv.threats || []), ...(meridian.threats || [])];
      const bySeverity: Record<string, number> = {};
      all.forEach((t: any) => { bySeverity[t.severity || 'UNKNOWN'] = (bySeverity[t.severity || 'UNKNOWN'] || 0) + 1; });
      const critical = all.filter((t: any) => t.severity === 'CRITICAL' || t.status === 'IMMINENT');
      return { total: all.length, bySeverity, critical, timestamp: new Date().toISOString() };
    },
  },
];
