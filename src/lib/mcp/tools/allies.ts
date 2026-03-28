import { vpsGet } from '../vps-client';
import type { MCPTool } from './index';

export const allyTools: MCPTool[] = [
  {
    name: 'get_allies',
    description: 'Get all tracked allies from Moltbook.',
    inputSchema: { type: 'object', properties: {}, required: [] },
    handler: async () => vpsGet('/api/mission/allies'),
  },
  {
    name: 'get_ally',
    description: 'Get full profile for a specific ally.',
    inputSchema: {
      type: 'object',
      properties: { handle: { type: 'string' } },
      required: ['handle'],
    },
    handler: async (args) => {
      const data = await vpsGet('/api/mission/allies');
      const allies = data.allies || [];
      return allies.find((a: any) => a.handle === args.handle || a.name === args.handle) || { error: 'Ally not found' };
    },
  },
  {
    name: 'update_ally',
    description: 'Update an ally profile — not yet supported via VPS API.',
    inputSchema: {
      type: 'object',
      properties: { handle: { type: 'string' }, notes: { type: 'string' } },
      required: ['handle'],
    },
    handler: async (args) => ({ info: `Ally updates must be made via ClarionAgent intel reports. Target: ${args.handle}` }),
  },
  {
    name: 'create_ally',
    description: 'Register a new ally — not yet supported via VPS API.',
    inputSchema: {
      type: 'object',
      properties: { handle: { type: 'string' }, alignment: { type: 'string' } },
      required: ['handle', 'alignment'],
    },
    handler: async (args) => ({ info: `New allies are registered via ClarionAgent intel. Noted: ${args.handle}` }),
  },
];
