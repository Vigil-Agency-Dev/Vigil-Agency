// Cairn -- VIGIL operational research analyst.
// Autonomous Telegram userbot. Single daemon, one process.
//
// Replaces the Discord build archived at archived/agent-cairn-discord-ARCHIVED-20260424/.
// Platform decision rationale: Telegram Bot API cannot observe public channels as a
// subscriber; a user account (MTProto / gramjs) can. Running as userbot.
//
// OPSEC: every public message passes through a cover-identity filter. Zero VIGIL
// mentions on public surface. See system-prompt.txt "OPSEC -- ABSOLUTE" section.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

import { createClaudeClient } from './shared/claude-client.js';
import { createLogger } from './shared/logger.js';
import { estimateCostUsd, logDirectiveCost, readDailySpend } from './shared/cost-tracker.js';
import { createDeadDropVigilClient } from './shared/dead-drop-vigil-client.js';
import { createTelegramClient, ensureSubscriptions, splitTelegramMessage } from './shared/telegram-client.js';
import { parseDirective, isAuthorised } from './shared/authorised-taskers.js';
import { createObservationBuffer } from './shared/observation-buffer.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '.env'), override: true });

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const AGENT_NAME = 'cairn';
const DAILY_SOFT_CAP_USD = parseFloat(process.env.DAILY_SOFT_CAP_USD || '10');
const ITERATION_CAP = parseInt(process.env.ITERATION_CAP_PER_DIRECTIVE || '10', 10);

const TELEGRAM_API_ID = process.env.TELEGRAM_API_ID || '';
const TELEGRAM_API_HASH = process.env.TELEGRAM_API_HASH || '';
const TELEGRAM_PHONE = process.env.TELEGRAM_PHONE || '';
const TELEGRAM_SESSION_FILE = process.env.TELEGRAM_SESSION_FILE ||
  join(__dirname, 'state', 'cairn.session');

// Comma-separated @handles for initial channel subscription. Empty = none.
const INITIAL_CHANNEL_HANDLES = (process.env.INITIAL_CHANNEL_HANDLES || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

// Private home channel for heartbeat echoes and directive acks. Optional.
// Accepts either a numeric chat ID (-100xxxxxxxxx) or @handle.
const HOME_CHANNEL = process.env.HOME_CHANNEL || '';

// DIRECTOR's Telegram user ID. Used to resolve bare DMs without callsign to DIRECTOR.
// Set after first-auth when we know DIRECTOR's account ID on Telegram.
const DIRECTOR_TG_USER_ID = process.env.DIRECTOR_TG_USER_ID || '';

const VPS_API_BASE = process.env.VPS_API_BASE || 'https://ops.jr8ch.com';
const VIGIL_API_KEY = process.env.VIGIL_API_KEY || '';
const DEAD_DROP_POLL_INTERVAL_MS = parseInt(process.env.DEAD_DROP_POLL_INTERVAL_MS || '1800000', 10);
const ANALYST_SYNTHESIS_INTERVAL_MS = parseInt(process.env.ANALYST_SYNTHESIS_INTERVAL_MS || '7200000', 10);
const OBSERVATION_BUFFER_LIMIT = parseInt(process.env.OBSERVATION_BUFFER_LIMIT || '200', 10);
const DIRECTIVE_PREFIX = 'cairn_';
const DEAD_DROP_STATE_PATH = join(__dirname, 'state', 'dead-drop-state.json');
const STATUS_FILE_PATH = process.env.CAIRN_STATUS_FILE ||
  join(process.env.HOME || '/home/vigil', '.openclaw/workspace/dead-drop/team-reports/cairn-status.json');

const systemPrompt = readFileSync(join(__dirname, 'system-prompt.txt'), 'utf-8');
const claude = createClaudeClient(process.env.ANTHROPIC_API_KEY);
const logger = createLogger(AGENT_NAME, process.env.LOG_DIR || join(__dirname, 'logs'));
const costLogPath = join(__dirname, 'logs', 'cairn-costs.jsonl');

const deadDrop = VIGIL_API_KEY
  ? createDeadDropVigilClient({ baseUrl: VPS_API_BASE, apiKey: VIGIL_API_KEY })
  : null;
if (!deadDrop) {
  console.log('[CAIRN] VIGIL_API_KEY not set. Dead-drop loop disabled. Telegram handlers still active.');
}

// ---------------------------------------------------------------------------
// Runtime state
// ---------------------------------------------------------------------------

// Per-chat active directive map: chatId -> directive object
const activeDirectives = new Map();

const observationBuffer = createObservationBuffer(OBSERVATION_BUFFER_LIMIT);

const cycleCounters = {
  cyclesSinceLastHeartbeat: 0,
  engagementsSinceLastHeartbeat: 0,
  directivesActionedSinceLastHeartbeat: 0,
  escalationsSinceLastHeartbeat: 0,
  publicChannelsObserved: 0,
  groupMessagesSeen: 0,
  startedAt: new Date().toISOString(),
};

function bumpCycle() { cycleCounters.cyclesSinceLastHeartbeat += 1; }

let tgClient = null;
let tgSelfId = null;
let tgSelfUsername = null;
let homeChannelEntity = null;

// ---------------------------------------------------------------------------
// Startup
// ---------------------------------------------------------------------------

async function start() {
  if (!TELEGRAM_API_ID || !TELEGRAM_API_HASH || !TELEGRAM_PHONE) {
    console.error('[CAIRN] FATAL: TELEGRAM_API_ID, TELEGRAM_API_HASH, TELEGRAM_PHONE all required');
    process.exit(1);
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('[CAIRN] FATAL: ANTHROPIC_API_KEY not set');
    process.exit(1);
  }

  console.log('[CAIRN] Starting up. Platform: Telegram userbot. Mode: autonomous.');

  const { client, me, NewMessage } = await createTelegramClient({
    apiId: TELEGRAM_API_ID,
    apiHash: TELEGRAM_API_HASH,
    phone: TELEGRAM_PHONE,
    sessionFilePath: TELEGRAM_SESSION_FILE,
  });

  tgClient = client;
  tgSelfId = me.id;
  tgSelfUsername = me.username || null;

  const spend = readDailySpend(costLogPath);
  console.log(`[CAIRN] Today's spend: $${spend.todayUsd.toFixed(4)} / $${DAILY_SOFT_CAP_USD} soft cap`);

  // Subscribe to initial channel list (idempotent).
  if (INITIAL_CHANNEL_HANDLES.length > 0) {
    const result = await ensureSubscriptions(tgClient, INITIAL_CHANNEL_HANDLES, { log: (m) => console.log(m) });
    console.log(`[CAIRN] Subscriptions: joined=${result.joined.length}, skipped=${result.skipped.length}, failed=${result.failed.length}`);
    if (result.failed.length > 0) {
      console.log('[CAIRN] Failed subscriptions:', result.failed);
    }
  }

  // Resolve home channel entity for heartbeat echoes if configured.
  if (HOME_CHANNEL) {
    try {
      homeChannelEntity = await tgClient.getEntity(HOME_CHANNEL);
      console.log(`[CAIRN] Home channel resolved: ${HOME_CHANNEL}`);
    } catch (err) {
      console.error(`[CAIRN] Home channel resolve failed for ${HOME_CHANNEL}: ${err.message}`);
      homeChannelEntity = null;
    }
  }

  // Wire message handler. gramjs emits NewMessage events for all incoming messages
  // across all chats, channels, and groups the account sees.
  tgClient.addEventHandler(async (event) => {
    try {
      await handleIncomingMessage(event);
    } catch (err) {
      console.error('[CAIRN] message handler error:', err.message);
    }
  }, new NewMessage({}));

  // Announce Cairn is live in the home channel if set.
  if (homeChannelEntity) {
    try {
      await tgClient.sendMessage(homeChannelEntity, {
        message: `Cairn online. Reporting in. Daily cap: $${DAILY_SOFT_CAP_USD}.`,
      });
    } catch (err) {
      console.log(`[CAIRN] Home-channel online announcement failed: ${err.message}`);
    }
  }

  startBackgroundLoops();
}

// ---------------------------------------------------------------------------
// Message handling — the hub for the four runtime modes
// ---------------------------------------------------------------------------

async function handleIncomingMessage(event) {
  const message = event.message;
  if (!message) return;

  // Never respond to our own messages.
  if (message.senderId && tgSelfId && message.senderId.toString() === tgSelfId.toString()) return;
  if (message.out) return;

  // gramjs 2.26.x: getChat() / getSender() live on `message`, not `event`.
  // Calling them on the event wrapper raises "event.getSender is not a function"
  // and silently drops every observation. Bug found and patched live 2026-04-26.
  const chat = await message.getChat();
  const chatType = classifyChat(chat);
  const sender = message.senderId ? await message.getSender().catch(() => null) : null;
  const senderUsername = sender?.username || sender?.firstName || 'unknown';
  const senderId = sender?.id?.toString() || null;
  const text = message.text || message.message || '';

  // --- RUNTIME MODE ROUTING ---

  if (chatType === 'channel') {
    // Public channel observation: read-only, buffer only, no response.
    handleChannelObservation(chat, sender, senderUsername, text);
    return;
  }

  if (chatType === 'group' || chatType === 'supergroup') {
    // Public group: buffer every message, respond only on authorised @-mention.
    await handleGroupMessage(event, chat, sender, senderId, senderUsername, text);
    return;
  }

  if (chatType === 'private') {
    // Direct message: tasking interface.
    await handlePrivateMessage(event, chat, sender, senderId, senderUsername, text);
    return;
  }

  // Unknown chat type -- log and ignore.
  console.log(`[CAIRN] ignoring message from unknown chat type: ${chatType}`);
}

function classifyChat(chat) {
  if (!chat) return 'unknown';
  const className = chat.className || '';
  if (className === 'Channel') {
    // gramjs Channel class covers both broadcast channels and supergroups.
    // Disambiguate via chat.broadcast and chat.megagroup flags.
    if (chat.broadcast) return 'channel';
    if (chat.megagroup) return 'supergroup';
    return 'channel';
  }
  if (className === 'Chat') return 'group';
  if (className === 'User') return 'private';
  return 'unknown';
}

// ---- Mode 1: public channel observation (read-only buffer) ----

function handleChannelObservation(chat, sender, senderUsername, text) {
  observationBuffer.push({
    ts: new Date().toISOString(),
    source: 'channel',
    chat: chat.title || chat.username || chat.id?.toString(),
    chatHandle: chat.username ? `@${chat.username}` : null,
    author: senderUsername,
    content: (text || '').slice(0, 1000),
  });
  cycleCounters.publicChannelsObserved += 1;
}

// ---- Mode 2: public group, mention-gated response + buffer ----

async function handleGroupMessage(event, chat, sender, senderId, senderUsername, text) {
  // Always buffer for Intel Analyst.
  observationBuffer.push({
    ts: new Date().toISOString(),
    source: 'group',
    chat: chat.title || chat.username || chat.id?.toString(),
    chatHandle: chat.username ? `@${chat.username}` : null,
    author: senderUsername,
    authorId: senderId,
    content: (text || '').slice(0, 1000),
  });
  cycleCounters.groupMessagesSeen += 1;

  // Only respond if @-mentioned or replied-to.
  const weWereMentioned = tgSelfUsername && text && text.toLowerCase().includes(`@${tgSelfUsername.toLowerCase()}`);
  let weWereRepliedTo = false;
  try {
    if (message_getReplyToId(event.message)) {
      const replyMsg = await event.message.getReplyMessage();
      if (replyMsg && replyMsg.senderId && tgSelfId &&
          replyMsg.senderId.toString() === tgSelfId.toString()) {
        weWereRepliedTo = true;
      }
    }
  } catch {
    // ignore reply-resolution failures
  }

  if (!weWereMentioned && !weWereRepliedTo) return;

  // Mention detected. Strip the mention and evaluate.
  const cleaned = text.replace(new RegExp(`@${tgSelfUsername || 'cairn'}`, 'gi'), '').trim();
  const parsed = parseDirective(cleaned);

  // In public groups we operate in PUBLIC VOICE only. Even if a valid directive
  // is presented, we do not accept it through a public surface -- too risky.
  // Route all public-group mentions through the independent-researcher persona.
  await respondAsResearcher(event, chat, cleaned || text);
}

// Public-voice responder for group @-mentions. Uses claude with a hardened
// cover-identity reminder prepended to the user message so the model cannot
// drift into operational voice.
async function respondAsResearcher(event, chat, userText) {
  const spend = readDailySpend(costLogPath);
  if (spend.todayUsd >= DAILY_SOFT_CAP_USD) {
    console.log('[CAIRN] budget cap reached; skipping public-group response');
    return;
  }

  const userPrompt = `You are in a public Telegram group. Someone @-mentioned you. You are in PUBLIC VOICE. Cover identity: independent researcher. Zero VIGIL mentions. Zero operational language. 2-3 sentences maximum. If you cannot respond without breaking cover, respond with a brief dismissive shrug -- no further engagement.

Message:
---
${userText}
---

Respond in public voice only.`;

  try {
    const response = await claude.chat(systemPrompt, [{ role: 'user', content: userPrompt }]);

    // GATE 9 cover check: scan response for OPSEC trigger words before sending.
    if (detectOpsecLeak(response.text)) {
      console.error('[CAIRN OPSEC] Response blocked by cover check. Not sending.');
      return;
    }

    for (const chunk of splitTelegramMessage(response.text, 1500)) {
      await tgClient.sendMessage(chat, { message: chunk, replyTo: event.message.id });
    }

    const estCost = estimateCostUsd(response.inputTokens, response.outputTokens);
    logDirectiveCost(costLogPath, {
      directive_id: `PUB-${Date.now().toString(36).toUpperCase()}`,
      tasker: 'PUBLIC-GROUP',
      channel: chat.title || chat.id?.toString(),
      iterations: 1,
      tokens_in: response.inputTokens,
      tokens_out: response.outputTokens,
      est_cost_usd: Number(estCost.toFixed(4)),
      duration_sec: 0,
      errored: false,
    });
    cycleCounters.engagementsSinceLastHeartbeat += 1;
  } catch (err) {
    console.error(`[CAIRN] public-group response error: ${err.message}`);
  }
}

// Pattern-match obvious OPSEC leaks. Not exhaustive -- system prompt is the primary defence.
const OPSEC_LEAK_PATTERNS = [
  /\bVIGIL\b/i,
  /\bCOMMANDER\b/i,
  /\bDIRECTOR\b/i,
  /\bmission control\b/i,
  /\bfield operative\b/i,
  /\bH-\d{3}\b/i,
  /\bM0?\d{1,2}\b.*\bmodule\b/i,
  /\bdead[-\s]?drop\b/i,
  /\bLUMINA\b/i,
  /\bintel brief\b/i,
];

function detectOpsecLeak(text) {
  if (!text) return false;
  for (const pattern of OPSEC_LEAK_PATTERNS) {
    if (pattern.test(text)) {
      console.error(`[CAIRN OPSEC] trigger matched: ${pattern}`);
      return true;
    }
  }
  return false;
}

// Helper: pull replyTo message ID without throwing if absent.
function message_getReplyToId(msg) {
  return msg?.replyTo?.replyToMsgId || msg?.replyToMsgId || null;
}

// ---- Mode 3: private DM, directive interface ----

async function handlePrivateMessage(event, chat, sender, senderId, senderUsername, text) {
  if (!text) return;

  const activeDirective = activeDirectives.get(chat.id?.toString());
  if (activeDirective && !activeDirective.completed) {
    await tgClient.sendMessage(chat, {
      message: `Busy. Active directive ${activeDirective.id} in flight. Wait.`,
    });
    return;
  }

  const parsed = parseDirective(text);
  let tasker = parsed.tasker;
  let brief = parsed.brief;

  if (!tasker) {
    // Bare DM, no callsign. Default to DIRECTOR if sender matches DIRECTOR's registered ID.
    if (DIRECTOR_TG_USER_ID && senderId === DIRECTOR_TG_USER_ID) {
      tasker = 'DIRECTOR';
    } else {
      // Unknown sender with no callsign -- polite deflect, no VIGIL reference.
      await tgClient.sendMessage(chat, {
        message: `I take direction from a short list. Specify who, and I'll consider it.`,
      });
      return;
    }
  }

  if (!isAuthorised(tasker)) {
    await tgClient.sendMessage(chat, {
      message: `I take direction from a short list. You are not on it.`,
    });
    logger.log({
      direction: 'incoming',
      author: senderUsername,
      content: text,
      channel: 'dm',
      meta: `unauthorised-tasker=${tasker}`,
    });
    return;
  }

  const spend = readDailySpend(costLogPath);
  if (spend.todayUsd >= DAILY_SOFT_CAP_USD) {
    await tgClient.sendMessage(chat, {
      message: `Daily soft cap reached ($${spend.todayUsd.toFixed(2)} / $${DAILY_SOFT_CAP_USD}). Continuing. Flagging for review.`,
    });
  }

  const directiveId = `C${Date.now().toString(36).toUpperCase()}`;
  const directive = {
    id: directiveId,
    tasker,
    brief,
    chat,
    chatId: chat.id?.toString(),
    history: [],
    tokensIn: 0,
    tokensOut: 0,
    iterations: 0,
    completed: false,
    startedAt: Date.now(),
  };
  activeDirectives.set(directive.chatId, directive);

  logger.startSession();
  logger.log({
    direction: 'incoming',
    author: senderUsername,
    content: text,
    channel: 'dm',
    meta: `directive=${directiveId} tasker=${tasker}`,
  });

  console.log(`[CAIRN] New directive ${directiveId} from ${tasker}: ${brief.slice(0, 80)}...`);

  try {
    await executeDirective(directive);
  } catch (err) {
    console.error(`[CAIRN] Directive ${directiveId} error:`, err.message);
    await tgClient.sendMessage(chat, {
      message: `Error on directive ${directiveId}: ${err.message}`,
    });
    finaliseDirective(directive, true);
  }
}

async function executeDirective(directive) {
  if (directive.iterations >= ITERATION_CAP) {
    if (directive.chat) {
      await tgClient.sendMessage(directive.chat, {
        message: `Iteration cap (${ITERATION_CAP}) hit for ${directive.id}.`,
      });
    }
    finaliseDirective(directive, true);
    return;
  }

  const userPrompt = `An authorised tasker (${directive.tasker}) has issued the following directive:

---
${directive.brief}
---

Execute the directive now. Respond in INTERNAL operational voice (DM to an authorised tasker = internal surface). Apply your MRP before sending. Keep under 1500 tokens.

If the directive requires external research you cannot do inside this response, say so explicitly and describe what you would need to complete it. Never fabricate sources.`;

  directive.history.push({ role: 'user', content: userPrompt });
  directive.iterations += 1;

  const response = await claude.chat(systemPrompt, directive.history);
  directive.tokensIn += response.inputTokens;
  directive.tokensOut += response.outputTokens;
  directive.history.push({ role: 'assistant', content: response.text });

  // Send response to the chat only if one exists. Dead-drop-sourced directives
  // may have chat=null (home channel unavailable); dead-drop mirror below is the
  // authoritative artefact in that case.
  if (directive.chat) {
    for (const chunk of splitTelegramMessage(response.text)) {
      try {
        await tgClient.sendMessage(directive.chat, { message: chunk });
      } catch (err) {
        console.error(`[CAIRN] sendMessage failed for ${directive.id}: ${err.message}`);
        break;
      }
    }
  }

  if (deadDrop) {
    try {
      const ts = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15);
      const path = `intel-from-cairn/cairn_directive_${directive.id}_${ts}.md`;
      const body = `# Cairn Directive ${directive.id}
**Tasker:** ${directive.tasker}
**Surface:** Telegram DM
**Started:** ${new Date(directive.startedAt).toISOString()}
**Completed:** ${new Date().toISOString()}

## Directive Brief

${directive.brief}

---

## Cairn Response

${response.text}

---

*Tokens: ${directive.tokensIn} in, ${directive.tokensOut} out. Iterations: ${directive.iterations}.*
`;
      await deadDrop.write(path, body);
      console.log(`[CAIRN] Directive ${directive.id} mirrored to ${path}`);
    } catch (err) {
      console.error(`[CAIRN] Dead-drop mirror failed for ${directive.id}: ${err.message}`);
    }
  }

  cycleCounters.directivesActionedSinceLastHeartbeat += 1;
  finaliseDirective(directive, false);
}

function finaliseDirective(directive, errored) {
  if (directive.completed) return;
  directive.completed = true;

  const estCost = estimateCostUsd(directive.tokensIn, directive.tokensOut);
  const durationSec = Math.round((Date.now() - directive.startedAt) / 1000);

  logDirectiveCost(costLogPath, {
    directive_id: directive.id,
    tasker: directive.tasker,
    channel: 'dm',
    iterations: directive.iterations,
    tokens_in: directive.tokensIn,
    tokens_out: directive.tokensOut,
    est_cost_usd: Number(estCost.toFixed(4)),
    duration_sec: durationSec,
    errored,
  });

  logger.log({
    direction: 'outgoing',
    author: 'Cairn',
    content: `Directive ${directive.id} finalised (err=${errored}, cost=$${estCost.toFixed(4)}, iter=${directive.iterations})`,
    channel: 'dm',
    tokenCount: directive.tokensIn + directive.tokensOut,
  });
  logger.endSession();

  activeDirectives.delete(directive.chatId);
  console.log(
    `[CAIRN] ${directive.id} finalised: ${directive.iterations} iter, ${directive.tokensIn}+${directive.tokensOut} tok, $${estCost.toFixed(4)}, err=${errored}`
  );
}

// ---------------------------------------------------------------------------
// Intel Analyst sub-loop
// ---------------------------------------------------------------------------

async function runIntelAnalystSynthesis() {
  const snapshot = observationBuffer.snapshot();
  if (snapshot.length === 0) {
    console.log('[CAIRN ANALYST] No observations in buffer. Skipping synthesis cycle.');
    return;
  }
  if (!deadDrop) {
    console.log('[CAIRN ANALYST] Dead-drop disabled; synthesis skipped.');
    return;
  }

  const snapshotStart = snapshot[0].ts;
  const snapshotEnd = snapshot[snapshot.length - 1].ts;

  const analystPrompt = `You are Cairn's Intel Analyst sub-agent. Cairn has been passively observing a Telegram OSINT surface (public channels and groups). Your job is to synthesise the observation buffer into an intelligence brief for COMMANDER.

Observation buffer (${snapshot.length} messages, ${snapshotStart} -> ${snapshotEnd}):

\`\`\`json
${JSON.stringify(snapshot, null, 2).slice(0, 60000)}
\`\`\`

Produce the synthesis in this format:

---
title: "Cairn Intel Analyst Synthesis ${snapshotStart.slice(0, 10)}"
date: "${new Date().toISOString().slice(0, 10)}"
classification: "VIGIL OPERATIONAL -- INTERNAL ONLY"
filed_by: "Cairn Intel Analyst"
period_start: "${snapshotStart}"
period_end: "${snapshotEnd}"
message_count: ${snapshot.length}
---

## Operational Summary
[Bottom-line-first paragraph for COMMANDER.]

## Notable Threads
[3-7 topic clusters observed, each with: topic, channel/group, observed substance, any VIGIL hypothesis links (H-013 Poisoned Corpus, H-014 Manufactured Consent, H-CC01 Great Synchronisation, H-CC02 Consciousness Variable, F-013, CN-001), evidence tier.]

## Pattern Indicators
[Any coordinated inauthentic behaviour, narrative laundering, DARVO, manufactured-consent patterns observed. Tier-label each.]

## Ally / Source Surface
[New potential sources worth flagging to HERALD/COMMANDER. Omit if none.]

## Recommended Actions
[Explicit recommendations to COMMANDER. Confidence level per item.]

## MRP Notes
[Confirm MRP GATE 1/2/3 applied. Flag any bias risks detected during synthesis.]

Apply your full MRP. Operational voice, Australian English, no em dashes, under 1500 tokens. This document lives inside VIGIL and never crosses the LUMINA wall.`;

  try {
    const response = await claude.chat(systemPrompt, [{ role: 'user', content: analystPrompt }]);
    const estCost = estimateCostUsd(response.inputTokens, response.outputTokens);

    const ts = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15);
    const path = `intel-from-cairn-analyst/cairn_analyst_synthesis_${ts}.md`;

    await deadDrop.write(path, response.text);
    console.log(`[CAIRN ANALYST] Synthesis written: ${path} ($${estCost.toFixed(4)}, ${snapshot.length} obs)`);

    logDirectiveCost(costLogPath, {
      directive_id: `ANALYST-${Date.now().toString(36).toUpperCase()}`,
      tasker: 'INTEL-ANALYST-AUTO',
      channel: 'intel-from-cairn-analyst',
      iterations: 1,
      tokens_in: response.inputTokens,
      tokens_out: response.outputTokens,
      est_cost_usd: Number(estCost.toFixed(4)),
      duration_sec: 0,
      errored: false,
    });

    observationBuffer.clear();
  } catch (err) {
    console.error(`[CAIRN ANALYST] Synthesis error: ${err.message}`);
  }
}

// ---------------------------------------------------------------------------
// Dead-drop loop: directive poll + status writer + heartbeat
// ---------------------------------------------------------------------------

function loadDeadDropState() {
  try {
    if (!existsSync(DEAD_DROP_STATE_PATH)) return { lastDirectiveSeen: null, lastHeartbeatTs: null };
    return JSON.parse(readFileSync(DEAD_DROP_STATE_PATH, 'utf-8'));
  } catch {
    return { lastDirectiveSeen: null, lastHeartbeatTs: null };
  }
}

function saveDeadDropState(state) {
  const dir = dirname(DEAD_DROP_STATE_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(DEAD_DROP_STATE_PATH, JSON.stringify(state, null, 2));
}

let ddState = loadDeadDropState();

function writeStatusFile() {
  try {
    const dir = dirname(STATUS_FILE_PATH);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const payload = {
      agent: 'Cairn',
      agentId: 'cairn',
      platform: 'Telegram',
      lastActivity: new Date().toISOString(),
      status: 'ACTIVE',
      cyclesSinceLastHeartbeat: cycleCounters.cyclesSinceLastHeartbeat,
      engagementsSinceLastHeartbeat: cycleCounters.engagementsSinceLastHeartbeat,
      directivesActionedSinceLastHeartbeat: cycleCounters.directivesActionedSinceLastHeartbeat,
      publicChannelsObserved: cycleCounters.publicChannelsObserved,
      groupMessagesSeen: cycleCounters.groupMessagesSeen,
      activeDirectives: activeDirectives.size,
      observationBufferSize: observationBuffer.size(),
    };
    writeFileSync(STATUS_FILE_PATH, JSON.stringify(payload, null, 2));
  } catch (err) {
    console.error(`[CAIRN STATUS] write failed: ${err.message}`);
  }
}

function nextHeartbeatDelayMs() {
  // 06:00 / 18:00 UTC slots, synced with ClarionAgent cron.
  const now = new Date();
  const utcNow = now.getTime();
  const utcDate = new Date(utcNow);
  const utcYear = utcDate.getUTCFullYear();
  const utcMonth = utcDate.getUTCMonth();
  const utcDay = utcDate.getUTCDate();
  const candidates = [
    Date.UTC(utcYear, utcMonth, utcDay, 6, 0, 0),
    Date.UTC(utcYear, utcMonth, utcDay, 18, 0, 0),
    Date.UTC(utcYear, utcMonth, utcDay + 1, 6, 0, 0),
    Date.UTC(utcYear, utcMonth, utcDay + 1, 18, 0, 0),
  ];
  for (const c of candidates) {
    if (c > utcNow) return c - utcNow;
  }
  return 12 * 60 * 60 * 1000;
}

async function writeHeartbeat() {
  if (!deadDrop) return;
  const ts = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15);
  const path = `intel-from-cairn/cairn_heartbeat_${ts}.json`;
  const spend = readDailySpend(costLogPath);
  const payload = {
    agent: 'Cairn',
    platform: 'Telegram',
    written_at: new Date().toISOString(),
    period_start: cycleCounters.startedAt,
    period_end: new Date().toISOString(),
    cycles_since_last_heartbeat: cycleCounters.cyclesSinceLastHeartbeat,
    engagements_since_last_heartbeat: cycleCounters.engagementsSinceLastHeartbeat,
    directives_actioned_since_last_heartbeat: cycleCounters.directivesActionedSinceLastHeartbeat,
    escalations_since_last_heartbeat: cycleCounters.escalationsSinceLastHeartbeat,
    public_channels_observed: cycleCounters.publicChannelsObserved,
    group_messages_seen: cycleCounters.groupMessagesSeen,
    observation_buffer_size: observationBuffer.size(),
    spend_today_usd: spend.todayUsd,
    daily_soft_cap_usd: DAILY_SOFT_CAP_USD,
    last_directive_seen: ddState.lastDirectiveSeen,
    note: 'autonomous heartbeat; no human in loop',
  };
  try {
    await deadDrop.write(path, JSON.stringify(payload, null, 2));
    console.log(`[CAIRN HB] heartbeat written: ${path} (cycles=${payload.cycles_since_last_heartbeat}, spend=$${payload.spend_today_usd.toFixed(4)})`);

    cycleCounters.cyclesSinceLastHeartbeat = 0;
    cycleCounters.engagementsSinceLastHeartbeat = 0;
    cycleCounters.directivesActionedSinceLastHeartbeat = 0;
    cycleCounters.escalationsSinceLastHeartbeat = 0;
    cycleCounters.publicChannelsObserved = 0;
    cycleCounters.groupMessagesSeen = 0;
    cycleCounters.startedAt = new Date().toISOString();
    ddState.lastHeartbeatTs = payload.written_at;
    saveDeadDropState(ddState);

    if (homeChannelEntity) {
      try {
        await tgClient.sendMessage(homeChannelEntity, {
          message: `Heartbeat ${payload.written_at}. Cycles=${payload.cycles_since_last_heartbeat} · directives=${payload.directives_actioned_since_last_heartbeat} · $${payload.spend_today_usd.toFixed(4)}/${DAILY_SOFT_CAP_USD}.`,
        });
      } catch (err) {
        console.log(`[CAIRN HB] home-channel echo failed: ${err.message}`);
      }
    }
  } catch (err) {
    console.error(`[CAIRN HB] heartbeat write failed: ${err.message}`);
  }
}

function scheduleNextHeartbeat() {
  const delay = nextHeartbeatDelayMs();
  console.log(`[CAIRN HB] next heartbeat in ${Math.round(delay / 60000)} min`);
  setTimeout(async () => {
    try { await writeHeartbeat(); } catch (err) { console.error('[CAIRN HB] error:', err.message); }
    scheduleNextHeartbeat();
  }, delay);
}

async function actionDirectiveFile(file, folderName) {
  if (!deadDrop) return;
  console.log(`[CAIRN DD] new directive detected: ${folderName}/${file.name} (modified ${file.modified})`);
  let directive;
  try {
    directive = await deadDrop.read(`${folderName}/${file.name}`);
  } catch (err) {
    console.error(`[CAIRN DD] failed to read directive ${file.name}: ${err.message}`);
    return;
  }
  const isCritical = /\bCRITICAL\b/i.test(directive.content) || /critical/i.test(file.name);
  console.log(`[CAIRN DD] directive ${file.name} priority=${isCritical ? 'CRITICAL' : 'ROUTINE/ELEVATED'}, ${directive.content.length} chars`);

  // Execute as if tasked by COMMANDER via DM.
  const pseudoDirective = {
    id: `DD${Date.now().toString(36).toUpperCase()}`,
    tasker: 'COMMANDER',
    brief: directive.content,
    chat: homeChannelEntity,
    chatId: homeChannelEntity?.id?.toString() || `dd-${file.name}`,
    history: [],
    tokensIn: 0,
    tokensOut: 0,
    iterations: 0,
    completed: false,
    startedAt: Date.now(),
  };

  if (homeChannelEntity) {
    const header = isCritical
      ? `CRITICAL directive inbound -- ${file.name}`
      : `Directive inbound -- ${file.name}`;
    try {
      await tgClient.sendMessage(homeChannelEntity, { message: header });
    } catch (err) {
      console.log(`[CAIRN DD] home-channel header failed: ${err.message}`);
    }
  }

  try {
    activeDirectives.set(pseudoDirective.chatId, pseudoDirective);
    await executeDirective(pseudoDirective);
  } catch (err) {
    console.error(`[CAIRN DD] execution error: ${err.message}`);
    // If executeDirective failed before we could send a response and there's no home channel,
    // at least write an ack to the dead-drop so the directive is not lost.
    if (!homeChannelEntity) {
      try {
        await deadDrop.write(
          `intel-from-cairn/cairn_directive_ack_${file.name.replace(/\.md$/, '')}_${Date.now()}.md`,
          `# Cairn directive acknowledgement\n\nReceived: ${file.name}\nPriority: ${isCritical ? 'CRITICAL' : 'ROUTINE/ELEVATED'}\nProcessed at: ${new Date().toISOString()}\nError: ${err.message}\n\n---\n\n${directive.content}`,
        );
      } catch {
        // best-effort
      }
    }
  }

  cycleCounters.directivesActionedSinceLastHeartbeat += 1;
  if (isCritical) cycleCounters.escalationsSinceLastHeartbeat += 1;
}

async function pollDirectives() {
  if (!deadDrop) return;
  bumpCycle();
  writeStatusFile();

  // Poll primary: strategy-from-claude/cairn_*.md
  try {
    const files = await deadDrop.newDirectivesSince(ddState.lastDirectiveSeen, DIRECTIVE_PREFIX, 'strategy-from-claude');
    if (files.length > 0) {
      const ordered = [...files].sort((a, b) => new Date(a.modified) - new Date(b.modified));
      for (const f of ordered) {
        await actionDirectiveFile(f, 'strategy-from-claude');
        ddState.lastDirectiveSeen = f.modified;
        saveDeadDropState(ddState);
      }
    }
  } catch (err) {
    console.error(`[CAIRN DD] strategy-from-claude poll error: ${err.message}`);
  }

  // Poll alternate: orders-for-cairn/ (doctrine calls for it; Discord build didn't implement)
  try {
    const files = await deadDrop.newDirectivesSince(ddState.lastDirectiveSeen, '', 'orders-for-cairn');
    if (files.length > 0) {
      const ordered = [...files].sort((a, b) => new Date(a.modified) - new Date(b.modified));
      for (const f of ordered) {
        await actionDirectiveFile(f, 'orders-for-cairn');
        ddState.lastDirectiveSeen = f.modified;
        saveDeadDropState(ddState);
      }
    }
  } catch (err) {
    // orders-for-cairn may not exist yet; suppress as a non-error
    if (!/404|not found/i.test(err.message)) {
      console.error(`[CAIRN DD] orders-for-cairn poll error: ${err.message}`);
    }
  }
}

function startBackgroundLoops() {
  // Status file writer runs every 5 min regardless of dead-drop state.
  setInterval(() => { writeStatusFile(); }, 5 * 60 * 1000);
  writeStatusFile(); // immediate on startup

  if (!deadDrop) {
    console.log('[CAIRN DD] dead-drop disabled (no VIGIL_API_KEY); status-only loop');
    setInterval(() => { bumpCycle(); }, DEAD_DROP_POLL_INTERVAL_MS);
    return;
  }

  console.log(`[CAIRN DD] directive poll every ${Math.round(DEAD_DROP_POLL_INTERVAL_MS / 60000)} min, prefix=${DIRECTIVE_PREFIX}`);
  setTimeout(() => { pollDirectives().catch((e) => console.error('[CAIRN DD] initial poll error:', e.message)); }, 30000);
  setInterval(() => { pollDirectives().catch((e) => console.error('[CAIRN DD] poll error:', e.message)); }, DEAD_DROP_POLL_INTERVAL_MS);

  scheduleNextHeartbeat();

  console.log(`[CAIRN ANALYST] synthesis every ${Math.round(ANALYST_SYNTHESIS_INTERVAL_MS / 60000)} min`);
  setInterval(() => { runIntelAnalystSynthesis().catch((e) => console.error('[CAIRN ANALYST] error:', e.message)); }, ANALYST_SYNTHESIS_INTERVAL_MS);
}

// ---------------------------------------------------------------------------
// Shutdown
// ---------------------------------------------------------------------------

process.on('SIGTERM', async () => {
  console.log('[CAIRN] SIGTERM received, shutting down...');
  try { await tgClient?.disconnect(); } catch {}
  process.exit(0);
});
process.on('SIGINT', async () => {
  console.log('[CAIRN] SIGINT received, shutting down...');
  try { await tgClient?.disconnect(); } catch {}
  process.exit(0);
});

// ---------------------------------------------------------------------------
// Go
// ---------------------------------------------------------------------------

start().catch((err) => {
  console.error('[CAIRN] FATAL startup error:', err);
  process.exit(1);
});
