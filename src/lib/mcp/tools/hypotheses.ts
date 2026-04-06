import { vpsGet, vpsPost } from '../vps-client';
import type { MCPTool } from './index';

export const hypothesisTools: MCPTool[] = [
  {
    name: 'get_hypotheses',
    description: 'Get all active hypotheses with thesis statements, evidence, cross-references, and full markdown content.',
    inputSchema: { type: 'object', properties: {}, required: [] },
    handler: async () => vpsGet('/api/mission/hypotheses'),
  },
  {
    name: 'get_hypothesis',
    description: 'Get a specific hypothesis by ID (e.g. "H-001", "H-013", "H-SC-001"). Returns full content including raw markdown.',
    inputSchema: {
      type: 'object',
      properties: {
        hypothesis_id: { type: 'string', description: 'Hypothesis ID, e.g. "H-001", "H-013", "H-SC-001"' },
      },
      required: ['hypothesis_id'],
    },
    handler: async (args) => vpsGet(`/api/mission/hypothesis/${encodeURIComponent(String(args.hypothesis_id))}`),
  },
  {
    name: 'create_hypothesis',
    description: 'Create a new formal hypothesis. Writes to the dead-drop in MERIDIAN_HYPOTHESIS format so all agents and the dashboard can see it.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Hypothesis ID, e.g. "H-014" or "H-SC-002"' },
        title: { type: 'string', description: 'Full title of the hypothesis' },
        content: { type: 'string', description: 'Full hypothesis content in markdown: thesis statement, evidential basis, operational implications, cross-references' },
        status: { type: 'string', enum: ['ACTIVE', 'CONFIRMED', 'REFUTED', 'DORMANT', 'CANDIDATE'], description: 'Hypothesis status (default: ACTIVE)' },
        analyst: { type: 'string', description: 'Filing analyst (default: MERIDIAN)' },
        classification: { type: 'string', enum: ['ROUTINE', 'OPERATIONAL', 'ELEVATED', 'CRITICAL'], description: 'Classification level' },
        crossRef: {
          type: 'array',
          items: { type: 'string' },
          description: 'Cross-references to other hypotheses, operations, or threats, e.g. ["H-001", "OP-002", "PM-006"]',
        },
      },
      required: ['id', 'title', 'content'],
    },
    handler: async (args) => vpsPost('/api/mission/hypothesis', {
      id: args.id,
      title: args.title,
      content: args.content,
      status: args.status || 'ACTIVE',
      analyst: args.analyst || 'MERIDIAN',
      classification: args.classification || 'OPERATIONAL',
      crossRef: args.crossRef || [],
    }),
  },
  {
    name: 'update_hypothesis',
    description: 'Update an existing hypothesis: change status, append a note/update, update cross-references, or replace content.',
    inputSchema: {
      type: 'object',
      properties: {
        hypothesis_id: { type: 'string', description: 'Hypothesis ID to update, e.g. "H-013"' },
        status: { type: 'string', enum: ['ACTIVE', 'CONFIRMED', 'REFUTED', 'DORMANT', 'CANDIDATE', 'MAJOR_VALIDATED'], description: 'New status' },
        note: { type: 'string', description: 'Note to append to the hypothesis (timestamped automatically)' },
        crossRef: {
          type: 'array',
          items: { type: 'string' },
          description: 'Updated cross-references (replaces existing)',
        },
        content: { type: 'string', description: 'Full replacement content (replaces everything after frontmatter). Use only for major rewrites.' },
      },
      required: ['hypothesis_id'],
    },
    handler: async (args) => {
      const body: Record<string, unknown> = {};
      if (args.status) body.status = args.status;
      if (args.note) body.note = args.note;
      if (args.crossRef) body.crossRef = args.crossRef;
      if (args.content) body.content = args.content;

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_VPS_ENDPOINT || process.env.VPS_API_BASE || 'https://ops.jr8ch.com'}/api/mission/hypothesis/${encodeURIComponent(String(args.hypothesis_id))}`,
        {
          method: 'PUT',
          headers: {
            'x-api-key': process.env.NEXT_PUBLIC_VIGIL_API_KEY || process.env.VPS_API_KEY || '',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
          cache: 'no-store',
        }
      );
      if (!res.ok) throw new Error(`VPS API ${res.status}: hypothesis update`);
      return res.json();
    },
  },
];
