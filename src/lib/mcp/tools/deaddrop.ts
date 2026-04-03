import { vpsGet, vpsPost } from '../vps-client';
import type { MCPTool } from './index';

export const deadDropTools: MCPTool[] = [
  {
    name: 'write_dead_drop_file',
    description: 'Write a file to the VIGIL dead-drop. Accepts a path (relative to dead-drop root) and content. Use this to drop intel, orders, reports, or any file into the dead-drop for other agents to pick up. Creates parent directories automatically.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'File path relative to dead-drop root, e.g. "intel-from-director/DIRECTOR-INTEL-001_20260403.md" or "orders-for-axiom/order-001.json"',
        },
        content: {
          type: 'string',
          description: 'File content (markdown, JSON string, or plain text)',
        },
      },
      required: ['path', 'content'],
    },
    handler: async (args) => vpsPost('/api/dead-drop/write', {
      path: args.path,
      content: args.content,
      mkdir: true,
    }),
  },
  {
    name: 'read_dead_drop_file',
    description: 'Read a file from the VIGIL dead-drop. Returns the raw content of the file at the given path.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'File path relative to dead-drop root, e.g. "intel-from-director/DIRECTOR-INTEL-001_20260403.md"',
        },
      },
      required: ['path'],
    },
    handler: async (args) => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_VPS_ENDPOINT || process.env.VPS_API_BASE || 'https://ops.jr8ch.com'}/api/dead-drop/file?path=${encodeURIComponent(String(args.path))}`,
        {
          headers: { 'x-api-key': process.env.NEXT_PUBLIC_VIGIL_API_KEY || process.env.VPS_API_KEY || '' },
          cache: 'no-store',
        }
      );
      if (!res.ok) throw new Error(`VPS API ${res.status}: dead-drop/file?path=${args.path}`);
      const text = await res.text();
      return { path: args.path, content: text, size: text.length };
    },
  },
  {
    name: 'list_dead_drop',
    description: 'List all folders and files in the VIGIL dead-drop. Returns folder names with file counts and file details.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
    handler: async () => vpsGet('/api/dead-drop/listing'),
  },
  {
    name: 'push_director_intel',
    description: 'Push DIRECTOR field intel into the dedicated intel channel. Used when DIRECTOR sources intel in the field and needs it assimilated by COMMANDER and the analysis pipeline.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Short title for the intel' },
        content: { type: 'string', description: 'Full intel content' },
        priority: { type: 'string', enum: ['ROUTINE', 'ELEVATED', 'CRITICAL'], description: 'Priority level' },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Domain tags, e.g. ["epstein", "source-lead"] or ["geopolitical", "iran"]',
        },
        source: { type: 'string', description: 'Source description, e.g. "DIRECTOR (field)" or "Claude.ai mobile session"' },
      },
      required: ['title', 'content'],
    },
    handler: async (args) => vpsPost('/api/mission/director-intel', {
      title: args.title,
      content: args.content,
      priority: args.priority || 'ROUTINE',
      tags: args.tags || [],
      source: args.source || 'DIRECTOR (field)',
    }),
  },
  {
    name: 'get_director_intel',
    description: 'Get all DIRECTOR field intel drops. Returns intel items newest first.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Max items to return (default 20)' },
      },
      required: [],
    },
    handler: async (args) => vpsGet(`/api/mission/director-intel?limit=${args.limit || 20}`),
  },
];
