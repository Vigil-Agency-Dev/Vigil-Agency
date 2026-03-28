import { vpsGet } from '../vps-client';
import type { MCPTool } from './index';

export const dashboardTools: MCPTool[] = [
  {
    name: 'get_dashboard',
    description: 'Full operational dashboard — mission status, agents, threats, intel, strategy, trajectories. The single-call overview for mobile check-ins.',
    inputSchema: { type: 'object', properties: {}, required: [] },
    handler: async () => {
      const [overview, threats, intel, strategy, hypotheses, patterns, trajectory, teamReports] = await Promise.all([
        vpsGet('/api/mission/overview'),
        vpsGet('/api/mission/threats'),
        vpsGet('/api/mission/intel?limit=5'),
        vpsGet('/api/mission/strategy?limit=3'),
        vpsGet('/api/mission/hypotheses').catch(() => ({ hypotheses: [] })),
        vpsGet('/api/mission/patterns').catch(() => ({ patterns: [] })),
        vpsGet('/api/mission/trajectory').catch(() => ({ trajectory: null })),
        vpsGet('/api/mission/team-reports').catch(() => ({ reports: [] })),
      ]);
      return {
        mission: overview.mission || {},
        agents: overview.agents || {},
        stats: overview.stats || {},
        threats: threats.threats || [],
        latestIntel: (intel.reports || []).slice(0, 3),
        latestStrategy: (strategy.updates || [])[0] || null,
        hypotheses: (hypotheses.hypotheses || []).map((h: any) => ({ id: h.id, title: h.title, status: h.status })),
        patterns: (patterns.patterns || []).map((p: any) => ({ id: p.id, title: p.title, confidence: p.confidence })),
        trajectory: trajectory.trajectory || null,
        teamReports: (teamReports.reports || []).slice(0, 3),
        timestamp: new Date().toISOString(),
      };
    },
  },
  {
    name: 'get_operational_timeline',
    description: 'Chronological timeline of significant events across agents.',
    inputSchema: {
      type: 'object',
      properties: { hours: { type: 'number', description: 'Look-back hours (default 24)' } },
      required: [],
    },
    handler: async () => {
      const [intel, strategy, reports] = await Promise.all([
        vpsGet('/api/mission/intel?limit=20'),
        vpsGet('/api/mission/strategy?limit=10'),
        vpsGet('/api/mission/team-reports'),
      ]);
      const events: any[] = [];
      (intel.reports || []).forEach((r: any) => events.push({ type: 'intel', timestamp: r.timestamp || r.modified, detail: `${r.filename}: ${r.findings?.length || 0} findings` }));
      (strategy.updates || []).forEach((s: any) => events.push({ type: 'strategy', timestamp: s.timestamp, detail: s.filename }));
      (reports.reports || []).forEach((r: any) => events.push({ type: 'report', agent: r.team, timestamp: r.status?.last_run, detail: r.status?.summary }));
      events.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
      return { events: events.slice(0, 50), count: events.length, timestamp: new Date().toISOString() };
    },
  },
  {
    name: 'get_cycle_status',
    description: "Current operational cycle — what's due, overdue, completed.",
    inputSchema: { type: 'object', properties: {}, required: [] },
    handler: async () => {
      const [overview, mcStatus] = await Promise.all([
        vpsGet('/api/mission/overview'),
        vpsGet('/api/mission-control/status').catch(() => ({})),
      ]);
      return {
        overview: { stats: overview.stats, mission: overview.mission, agents: overview.agents },
        mcAnalyst: mcStatus,
        timestamp: new Date().toISOString(),
      };
    },
  },
];
