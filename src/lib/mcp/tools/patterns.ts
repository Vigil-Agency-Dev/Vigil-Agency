import { vpsGet } from '../vps-client';
import type { MCPTool } from './index';

export const patternTools: MCPTool[] = [
  {
    name: 'get_pattern_matches',
    description: 'Get identified cross-domain pattern matches.',
    inputSchema: { type: 'object', properties: {}, required: [] },
    handler: async () => vpsGet('/api/mission/patterns'),
  },
  {
    name: 'update_pattern',
    description: 'Update a pattern match — not yet supported via VPS API.',
    inputSchema: {
      type: 'object',
      properties: { pattern_id: { type: 'string' } },
      required: ['pattern_id'],
    },
    handler: async (args) => ({ info: `Pattern updates must be made via dead-drop files. Target: ${args.pattern_id}` }),
  },
  {
    name: 'get_trajectories',
    description: 'Get probability-weighted outcome trajectories.',
    inputSchema: { type: 'object', properties: {}, required: [] },
    handler: async () => vpsGet('/api/mission/trajectory'),
  },
];
