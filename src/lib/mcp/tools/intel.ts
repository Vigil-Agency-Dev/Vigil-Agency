import { vpsGet } from '../vps-client';
import type { MCPTool } from './index';

export const intelTools: MCPTool[] = [
  {
    name: 'get_intel_reports',
    description: 'Get ClarionAgent heartbeat intel reports with findings, red flags, and raw content.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Number of reports (default 10, max 50)' },
      },
      required: [],
    },
    handler: async (args) => vpsGet(`/api/mission/intel?limit=${args.limit || 10}`),
  },
  {
    name: 'get_latest_heartbeat',
    description: 'Get the most recent ClarionAgent heartbeat with full detail.',
    inputSchema: { type: 'object', properties: {}, required: [] },
    handler: async () => {
      const data = await vpsGet('/api/mission/intel?limit=5');
      const reports = data.reports || [];
      const hb = reports.find((r: any) => r.heartbeat) || reports[0];
      return hb || { error: 'No intel reports found' };
    },
  },
  {
    name: 'get_intel_report',
    description: 'Get a specific intel report by filename.',
    inputSchema: {
      type: 'object',
      properties: { report_id: { type: 'string', description: 'Filename of the report' } },
      required: ['report_id'],
    },
    handler: async (args) => {
      const data = await vpsGet('/api/mission/intel?limit=100');
      const reports = data.reports || [];
      const match = reports.find((r: any) => r.filename === args.report_id || r.filename?.includes(String(args.report_id)));
      return match || { error: 'Report not found' };
    },
  },
  {
    name: 'search_intel',
    description: 'Search across intel reports for keywords in findings, raw content, and red flags.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search term' },
        limit: { type: 'number', description: 'Max results (default 10)' },
      },
      required: ['query'],
    },
    handler: async (args) => {
      const q = String(args.query).toLowerCase();
      const data = await vpsGet('/api/mission/intel?limit=100');
      const reports = data.reports || [];
      const matches = reports.filter((r: any) => {
        const raw = (r.raw || '').toLowerCase();
        const findings = (r.findings || []).join(' ').toLowerCase();
        const flags = (r.redFlags || []).join(' ').toLowerCase();
        return raw.includes(q) || findings.includes(q) || flags.includes(q);
      }).slice(0, Number(args.limit) || 10);
      return { results: matches, count: matches.length, query: args.query };
    },
  },
  {
    name: 'get_intel_stats',
    description: 'Get aggregated intelligence statistics — total heartbeats, findings per heartbeat, priority distribution.',
    inputSchema: {
      type: 'object',
      properties: { period_days: { type: 'number', description: 'Look-back period in days (default 7)' } },
      required: [],
    },
    handler: async () => {
      const data = await vpsGet('/api/mission/intel?limit=100');
      const reports = data.reports || [];
      const withFindings = reports.filter((r: any) => r.findings?.length > 0);
      const priorities: Record<string, number> = {};
      reports.forEach((r: any) => { priorities[r.priority || 'UNKNOWN'] = (priorities[r.priority || 'UNKNOWN'] || 0) + 1; });
      return {
        totalReports: reports.length, reportsWithFindings: withFindings.length,
        avgFindings: withFindings.length > 0 ? (withFindings.reduce((s: number, r: any) => s + (r.findings?.length || 0), 0) / withFindings.length).toFixed(1) : 0,
        priorityDistribution: priorities,
      };
    },
  },
];
