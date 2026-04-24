// One-shot helper: resolve a private Telegram invite link to a channel ID
// and ensure Cairn is a member. Writes the resolved ID to stdout.
//
// Usage: INVITE_URL=https://t.me/+HASH node resolve-invite.js
//
// Private invite links have format: https://t.me/+<HASH> or https://t.me/joinchat/<HASH>.
// We extract the hash and call messages.checkChatInvite then messages.importChatInvite.

import { config } from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '.env'), override: true });

const INVITE_URL = process.env.INVITE_URL || process.argv[2] || '';
const TELEGRAM_API_ID = process.env.TELEGRAM_API_ID || '';
const TELEGRAM_API_HASH = process.env.TELEGRAM_API_HASH || '';
const TELEGRAM_SESSION_FILE = process.env.TELEGRAM_SESSION_FILE ||
  join(__dirname, 'state', 'cairn.session');

if (!INVITE_URL) {
  console.error('[RESOLVE] FATAL: pass invite URL as arg or INVITE_URL env');
  process.exit(1);
}

const hashMatch = INVITE_URL.match(/t\.me\/(?:\+|joinchat\/)([A-Za-z0-9_-]+)/);
if (!hashMatch) {
  console.error('[RESOLVE] FATAL: could not extract hash from URL');
  process.exit(1);
}
const inviteHash = hashMatch[1];
console.log(`[RESOLVE] Invite hash: ${inviteHash}`);

const sessionString = readFileSync(TELEGRAM_SESSION_FILE, 'utf-8').trim();
const session = new StringSession(sessionString);
const client = new TelegramClient(session, parseInt(TELEGRAM_API_ID, 10), TELEGRAM_API_HASH, {
  connectionRetries: 3,
});
await client.connect();

const me = await client.getMe();
console.log(`[RESOLVE] Acting as @${me.username || me.firstName} (id=${me.id})`);

// Check the invite first to see if we're already a member
let inviteInfo;
try {
  inviteInfo = await client.invoke(new Api.messages.CheckChatInvite({ hash: inviteHash }));
  console.log(`[RESOLVE] Invite check className: ${inviteInfo.className}`);
} catch (err) {
  console.error(`[RESOLVE] checkChatInvite failed: ${err.message}`);
  await client.disconnect();
  process.exit(1);
}

let chatEntity = null;
if (inviteInfo.className === 'ChatInviteAlready') {
  // Already a member
  chatEntity = inviteInfo.chat;
  console.log(`[RESOLVE] Already a member of channel.`);
} else if (inviteInfo.className === 'ChatInvite' || inviteInfo.className === 'ChatInvitePeek') {
  // Not a member yet; join
  console.log(`[RESOLVE] Not yet a member — joining via importChatInvite...`);
  try {
    const updates = await client.invoke(new Api.messages.ImportChatInvite({ hash: inviteHash }));
    chatEntity = updates.chats?.[0] || null;
    console.log(`[RESOLVE] Join successful.`);
  } catch (err) {
    console.error(`[RESOLVE] importChatInvite failed: ${err.message}`);
    await client.disconnect();
    process.exit(1);
  }
}

if (!chatEntity) {
  console.error('[RESOLVE] Could not resolve chat entity from invite.');
  await client.disconnect();
  process.exit(1);
}

// Channel IDs in MTProto are positive bigints; the -100<id> form is the 'bot API' prefixed form.
const rawId = chatEntity.id?.toString();
const apiId = `-100${rawId}`;
console.log(`[RESOLVE] Channel title: "${chatEntity.title}"`);
console.log(`[RESOLVE] Raw channel ID (MTProto): ${rawId}`);
console.log(`[RESOLVE] Bot-API channel ID (for HOME_CHANNEL env): ${apiId}`);
console.log(`[RESOLVE] Access hash: ${chatEntity.accessHash?.toString() || 'n/a'}`);
console.log('');
console.log(`[RESOLVE] SUGGESTED .env entry:`);
console.log(`HOME_CHANNEL=${apiId}`);

// Test: send a handshake message so DIRECTOR sees Cairn is reachable in the channel
try {
  await client.sendMessage(chatEntity, {
    message: 'Cairn online. Home channel resolved. Heartbeats and directive acks will post here. Daily cap $10.',
  });
  console.log('[RESOLVE] Test handshake message sent.');
} catch (err) {
  console.log(`[RESOLVE] Handshake send failed (non-fatal): ${err.message}`);
}

await client.disconnect();
process.exit(0);
