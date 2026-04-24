// One-shot Telegram first-auth helper.
//
// Two modes:
//   1. Interactive (default): prompts stdin for the login code. Needs a TTY.
//   2. File mode: reads code from a file that we poll until content appears.
//      Set CODE_FILE=/path/to/file. Script waits up to 5 minutes for non-empty content.
//      File format: either raw code on single line, or key=value with LOGIN_CODE=12345.
//
// Run as the vigil user on the VPS. On success, persists session to TELEGRAM_SESSION_FILE.

import { config } from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { createTelegramClient } from './shared/telegram-client.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '.env'), override: true });

const TELEGRAM_API_ID = process.env.TELEGRAM_API_ID || '';
const TELEGRAM_API_HASH = process.env.TELEGRAM_API_HASH || '';
const TELEGRAM_PHONE = process.env.TELEGRAM_PHONE || '';
const TELEGRAM_SESSION_FILE = process.env.TELEGRAM_SESSION_FILE ||
  join(__dirname, 'state', 'cairn.session');
const CODE_FILE = process.env.CODE_FILE || '';

if (!TELEGRAM_API_ID || !TELEGRAM_API_HASH || !TELEGRAM_PHONE) {
  console.error('[AUTH] FATAL: TELEGRAM_API_ID, TELEGRAM_API_HASH, TELEGRAM_PHONE required in .env');
  process.exit(1);
}

console.log('[AUTH] Starting first-auth flow.');
console.log(`[AUTH] Phone: ${TELEGRAM_PHONE}`);
console.log(`[AUTH] Session file target: ${TELEGRAM_SESSION_FILE}`);
if (CODE_FILE) {
  console.log(`[AUTH] CODE_FILE=${CODE_FILE} — will poll for login code`);
}
console.log('[AUTH] Telegram will send a login code to the user account in the Telegram app.');
console.log('[AUTH] Watch the Telegram app for a message from "Telegram" service.');
console.log('');

// File-based code reader: polls CODE_FILE every 3s for non-empty content.
// Accepts raw code on its own line, or LOGIN_CODE=NNNNN key=value format.
async function readCodeFromFile(filePath, timeoutMs = 300000) {
  const start = Date.now();
  console.log(`[AUTH] Polling ${filePath} for login code (timeout ${timeoutMs / 1000}s)...`);
  while (Date.now() - start < timeoutMs) {
    if (existsSync(filePath)) {
      try {
        const content = readFileSync(filePath, 'utf-8').trim();
        if (content) {
          // Parse: look for LOGIN_CODE= line or a bare 5-6 digit number.
          const kvMatch = content.match(/^LOGIN_CODE\s*[=:]\s*(\d{4,8})/mi);
          if (kvMatch) {
            console.log(`[AUTH] Code found via LOGIN_CODE= key in file.`);
            return kvMatch[1];
          }
          const bareDigitMatch = content.match(/^\s*(\d{4,8})\s*$/m);
          if (bareDigitMatch) {
            console.log(`[AUTH] Code found as bare digits in file.`);
            return bareDigitMatch[1];
          }
          // Content exists but no code pattern matched. Keep polling (user may still be typing).
        }
      } catch {
        // read race — keep polling
      }
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error(`CODE_FILE poll timed out after ${timeoutMs / 1000}s`);
}

try {
  const { client, me } = await createTelegramClient({
    apiId: TELEGRAM_API_ID,
    apiHash: TELEGRAM_API_HASH,
    phone: TELEGRAM_PHONE,
    sessionFilePath: TELEGRAM_SESSION_FILE,
    onSmsCodeNeeded: CODE_FILE ? () => readCodeFromFile(CODE_FILE) : null,
  });

  console.log('');
  console.log(`[AUTH] SUCCESS. Signed in as ${me.firstName || ''} ${me.lastName || ''} (@${me.username || 'no-username'})`);
  console.log(`[AUTH] User ID: ${me.id}`);
  console.log(`[AUTH] Session persisted to ${TELEGRAM_SESSION_FILE}`);
  console.log('[AUTH] You can now start vigil-cairn.service; it will resume silently from this session.');
  console.log('');
  console.log(`[AUTH] RECOMMENDED: set DIRECTOR_TG_USER_ID=<DIRECTOR's-numeric-user-id> in .env.`);
  console.log(`[AUTH] Cairn's own user ID (for reference): ${me.id}`);

  await client.disconnect();
  process.exit(0);
} catch (err) {
  console.error('[AUTH] FAILED:', err.message);
  process.exit(1);
}
