import { vpsGet, vpsPost } from '../vps-client';
import type { MCPTool } from './index';

export const heraldTools: MCPTool[] = [
  {
    name: 'send_herald_email',
    description: 'Send an email via HERALD distribution (Proton Mail). Used for press tips, journalist outreach, and distribution packages. All emails logged to audit trail.',
    inputSchema: {
      type: 'object',
      properties: {
        to: {
          oneOf: [
            { type: 'string', description: 'Recipient email address' },
            { type: 'array', items: { type: 'string' }, description: 'Multiple recipient email addresses' },
          ],
          description: 'Recipient(s). Single email or array of emails.',
        },
        subject: { type: 'string', description: 'Email subject line' },
        body: { type: 'string', description: 'Plain text email body' },
        html: { type: 'string', description: 'HTML email body (optional, overrides plain text in email clients that support HTML)' },
        from_name: { type: 'string', description: 'Display name for sender (default: "VIGIL Agency")' },
        from_address: { type: 'string', enum: ['press', 'herald', 'ops', 'director', 'default'], description: 'Which @vigil-agency.com address to send from: press, herald, ops, director. Default: vigilops@proton.me' },
      },
      required: ['to', 'subject', 'body'],
    },
    handler: async (args) => vpsPost('/api/herald/send-email', {
      to: args.to,
      subject: args.subject,
      body: args.body,
      html: args.html,
      from_name: args.from_name,
      from_address: args.from_address,
    }),
  },
  {
    name: 'get_herald_email_log',
    description: 'Get the audit trail of all emails sent via HERALD. Shows recipients, subjects, timestamps, and message IDs.',
    inputSchema: { type: 'object', properties: {}, required: [] },
    handler: async () => vpsGet('/api/herald/email-log'),
  },
  {
    name: 'get_herald_packages',
    description: 'Get all HERALD distribution packages (press briefs, tip sheets, social amp packages).',
    inputSchema: { type: 'object', properties: {}, required: [] },
    handler: async () => vpsGet('/api/herald/packages'),
  },
  {
    name: 'get_herald_registry',
    description: 'Get the HERALD media contact registry with trust levels and profiles.',
    inputSchema: { type: 'object', properties: {}, required: [] },
    handler: async () => vpsGet('/api/herald/registry'),
  },
  {
    name: 'review_herald_package',
    description: 'Submit a DIRECTOR review decision on a HERALD distribution package (approve or hold).',
    inputSchema: {
      type: 'object',
      properties: {
        filename: { type: 'string', description: 'Package filename to review' },
        action: { type: 'string', enum: ['approve', 'hold', 'reject'], description: 'Review decision' },
        notes: { type: 'string', description: 'Review notes (optional, required for hold)' },
      },
      required: ['filename', 'action'],
    },
    handler: async (args) => vpsPost('/api/herald/review', {
      filename: args.filename,
      action: args.action,
      notes: args.notes || '',
    }),
  },
];
