import { vpsGet } from '../vps-client';
import type { MCPTool } from './index';

export const hypothesisTools: MCPTool[] = [
  {
    name: 'get_hypotheses',
    description: 'Get all active hypotheses — thesis statements, evidence, cross-references, full markdown.',
    inputSchema: { type: 'object', properties: {}, required: [] },
    handler: async () => vpsGet('/api/mission/hypotheses'),
  },
  {
    name: 'update_hypothesis',
    description: 'Update a hypothesis — not yet supported via VPS API. Use dead-drop file update instead.',
    inputSchema: {
      type: 'object',
      properties: { hypothesis_id: { type: 'string' }, note: { type: 'string' } },
      required: ['hypothesis_id'],
    },
    handler: async (args) => ({ info: `Hypothesis updates must be made via MERIDIAN dead-drop files. Target: ${args.hypothesis_id}` }),
  },
];
