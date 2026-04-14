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
    name: 'check_herald_inbox',
    description: 'Check the HERALD inbound email inbox (Proton Mail). Returns recent emails received across all VIGIL addresses. Use to monitor replies from journalists, contacts, and external parties.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Max emails to return (default 30, max 100)' },
        unread_only: { type: 'boolean', description: 'Only return unread/unseen emails (default false)' },
        since: { type: 'string', description: 'Only return emails after this ISO date (e.g. "2026-04-06"). Default: last 7 days' },
        folder: { type: 'string', description: 'Mailbox folder to check (default "INBOX"). Options: INBOX, Sent, Archive, Spam, Trash' },
      },
      required: [],
    },
    handler: async (args) => vpsGet(
      '/api/herald/inbox?' + new URLSearchParams({
        ...(args.limit != null && { limit: String(args.limit) }),
        ...(args.unread_only != null && { unread_only: String(args.unread_only) }),
        ...(args.since ? { since: String(args.since) } : {}),
        ...(args.folder ? { folder: String(args.folder) } : {}),
      }).toString()
    ),
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
  {
    name: 'send_herald_signal',
    description: 'Send a Signal message via HERALD (signal-cli daemon on VPS). Uses the "Josh - Lumina Research" Signal identity (+61437087042). For autonomous research/peer-review correspondence on Signal. All messages logged to herald-signal-log/outbox in dead-drop.',
    inputSchema: {
      type: 'object',
      properties: {
        to: {
          oneOf: [
            { type: 'string', description: 'Recipient phone number in E.164 format (e.g. "+61476300498") or Australian format ("0476300498" — will be normalised)' },
            { type: 'array', items: { type: 'string' }, description: 'Multiple recipient phone numbers' },
          ],
          description: 'Recipient(s). Single number or array.',
        },
        message: { type: 'string', description: 'Signal message body (plain text). Keep concise and professional — this is the research/peer-review identity.' },
      },
      required: ['to', 'message'],
    },
    handler: async (args) => vpsPost('/api/herald/signal/send', {
      to: args.to,
      message: args.message,
    }),
  },
  {
    name: 'check_herald_signal',
    description: 'Check the HERALD Signal inbox. Returns recent inbound Signal messages received by the "Josh - Lumina Research" identity. Use to monitor replies from research/peer-review contacts.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Max messages to return (default 50, max 200)' },
        since: { type: 'string', description: 'Only return messages after this ISO date (e.g. "2026-04-14"). Default: last 7 days' },
      },
      required: [],
    },
    handler: async (args) => vpsGet(
      '/api/herald/signal/inbox?' + new URLSearchParams({
        ...(args.limit != null && { limit: String(args.limit) }),
        ...(args.since ? { since: String(args.since) } : {}),
      }).toString()
    ),
  },
  {
    name: 'get_herald_signal_status',
    description: 'Get the HERALD Signal daemon health status, account info, and connection state.',
    inputSchema: { type: 'object', properties: {}, required: [] },
    handler: async () => vpsGet('/api/herald/signal/status'),
  },
  {
    name: 'get_herald_signal_log',
    description: 'Get the HERALD Signal audit trail summary — total messages sent and received via the Signal identity.',
    inputSchema: { type: 'object', properties: {}, required: [] },
    handler: async () => vpsGet('/api/herald/signal/log'),
  },
];
