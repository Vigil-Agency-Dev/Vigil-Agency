// Telegram userbot transport layer (gramjs / MTProto).
//
// Why userbot not Bot API: Bot API cannot observe public channels as a subscriber.
// Userbot (regular user account) can join public channels and groups like a human,
// which is required for Cairn's OSINT mission.
//
// Session persistence: after first-auth SMS exchange, the session string is written
// to TELEGRAM_SESSION_FILE (default: state/cairn.session). Subsequent starts skip
// SMS and resume silently.

import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import { NewMessage } from 'telegram/events/index.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import input from 'input';

export async function createTelegramClient({
  apiId,
  apiHash,
  phone,
  sessionFilePath,
  onSmsCodeNeeded = null,
}) {
  if (!apiId || !apiHash || !phone) {
    throw new Error('createTelegramClient: TELEGRAM_API_ID, TELEGRAM_API_HASH, TELEGRAM_PHONE all required');
  }
  if (!sessionFilePath) {
    throw new Error('createTelegramClient: sessionFilePath required');
  }

  // Load existing session if present.
  let sessionString = '';
  if (existsSync(sessionFilePath)) {
    try {
      sessionString = readFileSync(sessionFilePath, 'utf-8').trim();
    } catch {
      sessionString = '';
    }
  }

  const session = new StringSession(sessionString);
  const client = new TelegramClient(session, parseInt(apiId, 10), apiHash, {
    connectionRetries: 5,
    autoReconnect: true,
    useWSS: true,
  });

  await client.start({
    phoneNumber: async () => phone,
    password: async () => {
      // 2FA password if the account has one set. We ask stdin on first-auth only.
      return await input.text('Telegram 2FA password (if set, else blank): ');
    },
    phoneCode: async () => {
      if (onSmsCodeNeeded) {
        const code = await onSmsCodeNeeded();
        if (code) return code;
      }
      // Fallback: interactive stdin prompt. Only fires on first-auth.
      return await input.text('Telegram SMS / login code: ');
    },
    onError: (err) => {
      console.error('[CAIRN TG] auth error:', err.message);
    },
  });

  // Persist session immediately so subsequent restarts are silent.
  const newSessionString = client.session.save();
  if (newSessionString && newSessionString !== sessionString) {
    mkdirSync(dirname(sessionFilePath), { recursive: true });
    writeFileSync(sessionFilePath, newSessionString, { mode: 0o600 });
    console.log(`[CAIRN TG] session persisted to ${sessionFilePath}`);
  }

  const me = await client.getMe();
  console.log(`[CAIRN TG] Signed in as @${me.username || me.firstName} (id=${me.id})`);

  return { client, me, NewMessage };
}

// Subscribe Cairn to a list of public channels / groups by @username.
// Idempotent: if already joined, silently succeeds. Logs each attempt.
export async function ensureSubscriptions(client, handles, logger = console) {
  if (!handles || handles.length === 0) return { joined: [], skipped: [], failed: [] };
  const joined = [];
  const skipped = [];
  const failed = [];

  for (const raw of handles) {
    const handle = raw.replace(/^@/, '').trim();
    if (!handle) continue;
    try {
      const entity = await client.getEntity(handle);
      // If we can resolve the entity, try to join if not already a member.
      try {
        const { Api } = await import('telegram');
        await client.invoke(new Api.channels.JoinChannel({ channel: entity }));
        joined.push(handle);
        logger.log?.(`[CAIRN TG] joined @${handle}`);
      } catch (joinErr) {
        // Already a member is the most common reason JoinChannel throws.
        if (/USER_ALREADY_PARTICIPANT|already/i.test(joinErr.message || '')) {
          skipped.push(handle);
        } else {
          failed.push({ handle, reason: joinErr.message });
          logger.log?.(`[CAIRN TG] join failed @${handle}: ${joinErr.message}`);
        }
      }
    } catch (resolveErr) {
      failed.push({ handle, reason: `resolve: ${resolveErr.message}` });
      logger.log?.(`[CAIRN TG] resolve failed @${handle}: ${resolveErr.message}`);
    }
  }

  return { joined, skipped, failed };
}

// Split long text to fit Telegram's 4096-char per-message limit.
export function splitTelegramMessage(text, maxLen = 4000) {
  if (!text) return [];
  if (text.length <= maxLen) return [text];
  const chunks = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= maxLen) {
      chunks.push(remaining);
      break;
    }
    let splitIdx = remaining.lastIndexOf('\n\n', maxLen);
    if (splitIdx < maxLen / 2) splitIdx = remaining.lastIndexOf('\n', maxLen);
    if (splitIdx < maxLen / 2) splitIdx = remaining.lastIndexOf('. ', maxLen);
    if (splitIdx < maxLen / 2) splitIdx = maxLen;
    chunks.push(remaining.slice(0, splitIdx + 1));
    remaining = remaining.slice(splitIdx + 1);
  }
  return chunks;
}
