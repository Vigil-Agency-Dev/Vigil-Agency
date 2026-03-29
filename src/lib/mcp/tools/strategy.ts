import { vpsGet, vpsPost } from '../vps-client';
import type { MCPTool } from './index';

export const strategyTools: MCPTool[] = [
  {
    name: 'get_strategy_directives',
    description: 'Get strategy directives sent to ClarionAgent.',
    inputSchema: {
      type: 'object',
      properties: { limit: { type: 'number', description: 'Number of directives (default 5)' } },
      required: [],
    },
    handler: async (args) => vpsGet(`/api/mission/strategy?limit=${args.limit || 5}`),
  },
  {
    name: 'get_strategy_directive',
    description: 'Get a specific strategy directive by filename.',
    inputSchema: {
      type: 'object',
      properties: { strategy_id: { type: 'string' } },
      required: ['strategy_id'],
    },
    handler: async (args) => {
      const data = await vpsGet('/api/mission/strategy?limit=20');
      const updates = data.updates || [];
      return updates.find((s: any) => s.filename === args.strategy_id || s.filename?.includes(String(args.strategy_id))) || { error: 'Not found' };
    },
  },
  {
    name: 'create_strategy_directive',
    description: 'Create a new strategy directive for ClarionAgent.',
    inputSchema: {
      type: 'object',
      properties: {
        classification: { type: 'string', enum: ['ROUTINE', 'ELEVATED', 'CRITICAL'] },
        content: { type: 'string', description: 'Full markdown directive' },
        author: { type: 'string' },
        summary: { type: 'string' },
      },
      required: ['classification', 'content', 'author'],
    },
    handler: async (args) => vpsPost('/api/mission/strategy-directive', {
      classification: args.classification,
      content: args.content,
      author: args.author,
      summary: args.summary || '',
      target_agent: 'clarion',
    }),
  },
];
