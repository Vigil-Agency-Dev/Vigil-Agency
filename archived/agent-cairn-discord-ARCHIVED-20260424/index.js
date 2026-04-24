import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';
import { createDiscordClient } from './shared/discord-client.js';
import { createClaudeClient } from './shared/claude-client.js';
import { createLogger } from './shared/logger.js';
import { estimateCostUsd, logDirectiveCost, readDailySpend } from './shared/cost-tracker.js';
import { createDeadDropVigilClient } from './shared/dead-drop-vigil-client.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, '.env'), override: true });

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const AGENT_NAME = 'cairn';
const DAILY_SOFT_CAP_USD = parseFloat(process.env.DAILY_SOFT_CAP_USD || '10');
const ITERATION_CAP = parseInt(process.env.ITERATION_CAP_PER_DIRECTIVE || '10', 10);

const GUILD_ID = process.env.CAIRN_GUILD_ID || '';
const OPS_CHANNEL_ID = process.env.CAIRN_OPS_CHANNEL || '';
const OPS_CHANNEL_NAME = process.env.CAIRN_OPS_CHANNEL_NAME || 'cairn-ops';

const VPS_API_BASE = process.env.VPS_API_BASE || 'https://ops.jr8ch.com';
const VIGIL_API_KEY = process.env.VIGIL_API_KEY || '';
const DEAD_DROP_POLL_INTERVAL_MS = parseInt(process.env.DEAD_DROP_POLL_INTERVAL_MS || '1800000', 10); // 30 min
const ENGAGEMENT_CYCLE_INTERVAL_MS = parseInt(process.env.ENGAGEMENT_CYCLE_INTERVAL_MS || '1800000', 10); // 30 min
const ANALYST_SYNTHESIS_INTERVAL_MS = parseInt(process.env.ANALYST_SYNTHESIS_INTERVAL_MS || '7200000', 10); // 2 hrs
const OBSERVATION_BUFFER_LIMIT = parseInt(process.env.OBSERVATION_BUFFER_LIMIT || '200', 10);
const DIRECTIVE_PREFIX = 'cairn_';
const DEAD_DROP_STATE_PATH = join(__dirname, 'state', 'dead-drop-state.json');
const STATUS_FILE_PATH = process.env.CAIRN_STATUS_FILE ||
  join(process.env.HOME || '/home/vigil', '.openclaw/workspace/dead-drop/team-reports/cairn-status.json');

// Authorised taskers (case-insensitive match on first word of directive callsign).
const AUTHORISED_TASKERS = new Set([
  'DIRECTOR',
  'COMMANDER',
  'MISSION-CONTROL',
  'MISSION_CONTROL',
  'MC',
  'MCP',
  'MERIDIAN',
  'CAIRN-INTEL-ANALYST',
  'CAIRN_INTEL_ANALYST',
  'INTEL-ANALYST',
]);

const systemPrompt = readFileSync(join(__dirname, 'system-prompt.txt'), 'utf-8');

const discord = createDiscordClient();
const claude = createClaudeClient(process.env.ANTHROPIC_API_KEY);
const logger = createLogger(AGENT_NAME, process.env.LOG_DIR || join(__dirname, 'logs'));
const costLogPath = join(__dirname, 'logs', 'cairn-costs.jsonl');

const deadDrop = VIGIL_API_KEY
  ? createDeadDropVigilClient({ baseUrl: VPS_API_BASE, apiKey: VIGIL_API_KEY })
  : null;
if (!deadDrop) {
  console.log('[CAIRN] VIGIL_API_KEY not set. Dead-drop loop disabled. Event handlers still active.');
}

// ---------------------------------------------------------------------------
// Runtime state
// ---------------------------------------------------------------------------

// Per-channel active directive map: channelId -> directive object
const activeDirectives = new Map();

// Rolling observation buffer (for Intel Analyst synthesis)
const observationBuffer = [];

// Cycle counters (reset on heartbeat)
const cycleCounters = {
  cyclesSinceLastHeartbeat: 0,
  engagementsSinceLastHeartbeat: 0,
  directivesActionedSinceLastHeartbeat: 0,
  escalationsSinceLastHeartbeat: 0,
  startedAt: new Date().toISOString(),
};

function bumpCycle() { cycleCounters.cyclesSinceLastHeartbeat += 1; }

// ---------------------------------------------------------------------------
// Startup
// ---------------------------------------------------------------------------

discord.on('ready', async () => {
  console.log(`[CAIRN] Online as ${discord.user.tag}`);
  const desired = 'CAIRN';
  if (discord.user.username !== desired) {
    try {
      await discord.user.setUsername(desired);
      console.log(`[CAIRN] Username updated: ${discord.user.username} -> ${desired}`);
    } catch (err) {
      console.log(`[CAIRN] Username rename skipped (${err.code || err.message})`);
    }
  }
  for (const guild of discord.guilds.cache.values()) {
    try {
      await guild.members.me.setNickname(desired);
      console.log(`[CAIRN] Nickname set in guild: ${guild.name}`);
    } catch (err) {
      console.log(`[CAIRN] Nickname set failed in ${guild.name}: ${err.message}`);
    }
  }

  const spend = readDailySpend(costLogPath);
  console.log(`[CAIRN] Today's spend: $${spend.todayUsd.toFixed(4)} / $${DAILY_SOFT_CAP_USD} soft cap`);

  // Announce in ops channel so DIRECTOR sees CAIRN is live
  const opsChannel = findOpsChannel();
  if (opsChannel) {
    try {
      await opsChannel.send(`\`[CAIRN] Online. Reporting to COMMANDER. Awaiting directives. Daily budget: $${DAILY_SOFT_CAP_USD}.\``);
    } catch (err) {
      console.log(`[CAIRN] Could not post online announcement: ${err.message}`);
    }
  }
});

// ---------------------------------------------------------------------------
// Message handler (directive mode + passive observation)
// ---------------------------------------------------------------------------

discord.on('messageCreate', async (message) => {
  if (message.author.id === discord.user.id) return;

  // Guild filter: only the home guild
  if (GUILD_ID && message.guild?.id && message.guild.id !== GUILD_ID) return;

  // Passive observation: buffer every non-self, non-bot message for Intel Analyst synthesis
  if (!message.author.bot) {
    bufferObservation(message);
  }

  const channelId = message.channel.id;
  const activeDirective = activeDirectives.get(channelId);

  // Ignore bot messages outside of active-directive context
  if (message.author.bot) return;

  // Act only if @-mentioned (user OR role we belong to)
  const userMentioned = message.mentions.has(discord.user.id);
  const roleMentioned = message.guild
    ? message.mentions.roles.some((role) =>
        message.guild.members.me?.roles.cache.has(role.id)
      )
    : false;
  if (!userMentioned && !roleMentioned) return;

  const content = message.content.replace(/<@!?\d+>/g, '').trim();
  if (!content) {
    await message.channel.send(
      '`[CAIRN] Empty directive. Expected: DIRECTIVE FROM <CALLSIGN>: <brief>. Or a direct question.`'
    );
    return;
  }

  if (activeDirective && !activeDirective.completed) {
    await message.channel.send(
      `\`[CAIRN] Busy. Active directive ${activeDirective.id} in flight. Try another channel or wait.\``
    );
    return;
  }

  await handleNewDirective(message, content);
});

// ---------------------------------------------------------------------------
// Directive handling
// ---------------------------------------------------------------------------

async function handleNewDirective(message, content) {
  const match = content.match(/^DIRECTIVE\s+FROM\s+([A-Z0-9\-_]+)\s*:?\s*([\s\S]*)$/i);
  let tasker = null;
  let brief = content;
  if (match) {
    tasker = match[1].toUpperCase();
    brief = match[2].trim();
  }

  if (tasker && !AUTHORISED_TASKERS.has(tasker)) {
    await message.channel.send(
      `\`[CAIRN] Unauthorised tasker: ${tasker}. CAIRN reports to COMMANDER. Routing to DIRECTOR/COMMANDER for sanctioning.\``
    );
    logger.log({
      direction: 'incoming',
      author: message.author.username,
      content,
      channel: message.channel.name,
      meta: 'unauthorised-tasker',
    });
    return;
  }

  // No DIRECTIVE FROM prefix = treat human author as DIRECTOR (chain-of-command shortcut)
  if (!tasker) tasker = 'DIRECTOR';

  const spend = readDailySpend(costLogPath);
  if (spend.todayUsd >= DAILY_SOFT_CAP_USD) {
    await message.channel.send(
      `\`[CAIRN] Soft daily cap exceeded ($${spend.todayUsd.toFixed(2)} / $${DAILY_SOFT_CAP_USD}). Continuing, flagging for DIRECTOR review.\``
    );
  }

  const directiveId = `C${Date.now().toString(36).toUpperCase()}`;
  const directive = {
    id: directiveId,
    tasker,
    brief,
    channel: message.channel,
    channelId: message.channel.id,
    history: [],
    tokensIn: 0,
    tokensOut: 0,
    iterations: 0,
    completed: false,
    startedAt: Date.now(),
  };
  activeDirectives.set(directive.channelId, directive);

  logger.startSession();
  logger.log({
    direction: 'incoming',
    author: message.author.username,
    content,
    channel: message.channel.name,
    meta: `directive=${directiveId} tasker=${tasker}`,
  });

  console.log(`[CAIRN] New directive ${directiveId} from ${tasker}: ${brief.slice(0, 80)}...`);
  await message.channel.sendTyping();

  try {
    await executeDirective(directive);
  } catch (err) {
    console.error(`[CAIRN] Directive ${directiveId} error:`, err.message);
    await message.channel.send(
      `\`[CAIRN] Error on directive ${directiveId}: ${err.message}\``
    );
    finaliseDirective(directive, true);
  }
}

async function executeDirective(directive) {
  if (directive.iterations >= ITERATION_CAP) {
    await directive.channel.send(
      `\`[CAIRN] Iteration cap (${ITERATION_CAP}) hit for ${directive.id}.\``
    );
    finaliseDirective(directive, true);
    return;
  }

  const userPrompt = `An authorised tasker (${directive.tasker}) has issued the following directive:

---
${directive.brief}
---

Execute the directive now. Respond with your analysis in operational voice per your system prompt. Apply your MRP before sending. Keep under 1500 tokens.

If the directive requires external research you cannot do inside this response, say so explicitly and describe what you would need to complete it (e.g. "requires OSINT sweep via Tavily, which I do not have direct access to from this runtime; recommend COMMANDER dispatch ClarionAgent"). Never fabricate sources.`;

  directive.history.push({ role: 'user', content: userPrompt });
  directive.iterations += 1;

  const response = await claude.chat(systemPrompt, directive.history);
  directive.tokensIn += response.inputTokens;
  directive.tokensOut += response.outputTokens;
  directive.history.push({ role: 'assistant', content: response.text });

  // Send response to channel (split if over Discord's 2000-char limit)
  for (const chunk of splitMessage(response.text)) {
    await directive.channel.send(chunk);
  }

  // Mirror the brief to VIGIL dead-drop for COMMANDER visibility
  if (deadDrop) {
    try {
      const ts = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15);
      const path = `intel-from-cairn/cairn_directive_${directive.id}_${ts}.md`;
      const body = `# CAIRN Directive ${directive.id}
**Tasker:** ${directive.tasker}
**Channel:** #${directive.channel.name || directive.channelId}
**Started:** ${new Date(directive.startedAt).toISOString()}
**Completed:** ${new Date().toISOString()}

## Directive Brief

${directive.brief}

---

## CAIRN Response

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

// ---------------------------------------------------------------------------
// Observation buffer (feeds Intel Analyst)
// ---------------------------------------------------------------------------

function bufferObservation(message) {
  const entry = {
    ts: new Date().toISOString(),
    channel: message.channel?.name || message.channelId,
    author: message.author?.username || 'unknown',
    authorId: message.author?.id,
    content: (message.content || '').slice(0, 1000),
    attachments: message.attachments?.size || 0,
    embeds: message.embeds?.length || 0,
  };
  observationBuffer.push(entry);
  if (observationBuffer.length > OBSERVATION_BUFFER_LIMIT) {
    observationBuffer.splice(0, observationBuffer.length - OBSERVATION_BUFFER_LIMIT);
  }
}

async function runIntelAnalystSynthesis() {
  if (observationBuffer.length === 0) {
    console.log('[CAIRN ANALYST] No observations in buffer. Skipping synthesis cycle.');
    return;
  }
  if (!deadDrop) {
    console.log('[CAIRN ANALYST] Dead-drop disabled; synthesis will write local only.');
  }

  const snapshot = [...observationBuffer];
  const snapshotStart = snapshot[0].ts;
  const snapshotEnd = snapshot[snapshot.length - 1].ts;

  const analystPrompt = `You are CAIRN's Intel Analyst sub-agent. CAIRN has been passively observing The Watch (VIGIL Discord). Your job is to synthesise the observation buffer into an intelligence brief for COMMANDER.

Observation buffer (${snapshot.length} messages, ${snapshotStart} -> ${snapshotEnd}):

\`\`\`json
${JSON.stringify(snapshot, null, 2).slice(0, 60000)}
\`\`\`

Produce the synthesis in this format:

---
title: "CAIRN Intel Analyst Synthesis ${snapshotStart.slice(0, 10)}"
date: "${new Date().toISOString().slice(0, 10)}"
classification: "VIGIL OPERATIONAL -- INTERNAL ONLY"
filed_by: "CAIRN Intel Analyst"
period_start: "${snapshotStart}"
period_end: "${snapshotEnd}"
message_count: ${snapshot.length}
---

## Operational Summary
[Bottom-line-first paragraph for COMMANDER.]

## Notable Threads
[3-7 topic clusters observed, each with: topic, participants, observed substance, any VIGIL hypothesis links (H-013 Poisoned Corpus, H-014 Manufactured Consent, H-CC01 Great Synchronisation, H-CC02 Consciousness Variable, F-013, CN-001), evidence tier.]

## Pattern Indicators
[Any coordinated inauthentic behaviour, narrative laundering, DARVO, manufactured-consent patterns observed. Tier-label each.]

## Ally / Source Surface
[New potential allies or sources worth escalating to HERALD/COMMANDER. Omit if none.]

## Recommended Actions
[Explicit recommendations to COMMANDER. Confidence level per item.]

## MRP Notes
[Confirm MRP GATE 1/2/3 applied. Flag any bias risks detected during synthesis.]

Apply your full MRP. Operational voice, Australian English, no em dashes, under 1500 tokens. This document lives inside VIGIL and never crosses the LUMINA wall.`;

  try {
    const response = await claude.chat(systemPrompt, [
      { role: 'user', content: analystPrompt },
    ]);
    const estCost = estimateCostUsd(response.inputTokens, response.outputTokens);

    const ts = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15);
    const path = `intel-from-cairn-analyst/cairn_analyst_synthesis_${ts}.md`;

    if (deadDrop) {
      await deadDrop.write(path, response.text);
      console.log(`[CAIRN ANALYST] Synthesis written: ${path} ($${estCost.toFixed(4)}, ${snapshot.length} obs)`);
    }

    logDirectiveCost(costLogPath, {
      directive_id: `ANALYST-${Date.now().toString(36).toUpperCase()}`,
      tasker: 'INTEL-ANALYST-AUTO',
      channel: 'intel-from-cairn-analyst',
      workers_dispatched: [],
      workers_responded: [],
      iterations: 1,
      tokens_in: response.inputTokens,
      tokens_out: response.outputTokens,
      est_cost_usd: Number(estCost.toFixed(4)),
      duration_sec: 0,
      errored: false,
    });

    // Clear the buffer now that it's been synthesised
    observationBuffer.length = 0;
  } catch (err) {
    console.error(`[CAIRN ANALYST] Synthesis error: ${err.message}`);
  }
}

// ---------------------------------------------------------------------------
// Finalise
// ---------------------------------------------------------------------------

function finaliseDirective(directive, errored) {
  if (directive.completed) return;
  directive.completed = true;

  const estCost = estimateCostUsd(directive.tokensIn, directive.tokensOut);
  const durationSec = Math.round((Date.now() - directive.startedAt) / 1000);

  logDirectiveCost(costLogPath, {
    directive_id: directive.id,
    tasker: directive.tasker,
    channel: directive.channel.name || directive.channelId,
    workers_dispatched: [],
    workers_responded: [],
    iterations: directive.iterations,
    tokens_in: directive.tokensIn,
    tokens_out: directive.tokensOut,
    est_cost_usd: Number(estCost.toFixed(4)),
    duration_sec: durationSec,
    errored,
  });

  logger.log({
    direction: 'outgoing',
    author: 'CAIRN',
    content: `Directive ${directive.id} finalised (err=${errored}, cost=$${estCost.toFixed(4)}, iter=${directive.iterations})`,
    channel: directive.channel.name || directive.channelId,
    tokenCount: directive.tokensIn + directive.tokensOut,
  });
  logger.endSession();

  activeDirectives.delete(directive.channelId);
  console.log(
    `[CAIRN] ${directive.id} finalised: ${directive.iterations} iter, ${directive.tokensIn}+${directive.tokensOut} tok, $${estCost.toFixed(4)}, err=${errored}`
  );
}

// ---------------------------------------------------------------------------
// Utils
// ---------------------------------------------------------------------------

function splitMessage(text, maxLen = 1950) {
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

function findOpsChannel() {
  if (OPS_CHANNEL_ID) {
    for (const guild of discord.guilds.cache.values()) {
      const ch = guild.channels.cache.get(OPS_CHANNEL_ID);
      if (ch?.isTextBased?.()) return ch;
    }
  }
  return findChannelByName(OPS_CHANNEL_NAME);
}

function findChannelByName(name) {
  for (const guild of discord.guilds.cache.values()) {
    const ch = guild.channels.cache.find((c) => c.name === name && c.isTextBased && c.isTextBased());
    if (ch) return ch;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Dead-drop loop: directive poll + status file write + heartbeat
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

// ---- Status file writer (feeds vigil-api /api/mission/agents lastActivity) ----

function writeStatusFile() {
  try {
    const dir = dirname(STATUS_FILE_PATH);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const payload = {
      agent: 'CAIRN',
      agentId: 'cairn',
      lastActivity: new Date().toISOString(),
      status: 'ACTIVE',
      cyclesSinceLastHeartbeat: cycleCounters.cyclesSinceLastHeartbeat,
      engagementsSinceLastHeartbeat: cycleCounters.engagementsSinceLastHeartbeat,
      directivesActionedSinceLastHeartbeat: cycleCounters.directivesActionedSinceLastHeartbeat,
      activeDirectives: activeDirectives.size,
      observationBufferSize: observationBuffer.length,
    };
    writeFileSync(STATUS_FILE_PATH, JSON.stringify(payload, null, 2));
  } catch (err) {
    console.error(`[CAIRN STATUS] write failed: ${err.message}`);
  }
}

// ---- Heartbeat writer (twice daily, 06:30 + 18:30 AEDT) ----

function nextHeartbeatDelayMs() {
  // Synced with ClarionAgent cron: 0 6,18 * * * UTC.
  // CAIRN fires at the same 06:00 / 18:00 UTC slots so both field operatives' intel
  // lands in the same window for COMMANDER / Intel Analysts / MERIDIAN cross-sweep.
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
    agent: 'CAIRN',
    written_at: new Date().toISOString(),
    period_start: cycleCounters.startedAt,
    period_end: new Date().toISOString(),
    cycles_since_last_heartbeat: cycleCounters.cyclesSinceLastHeartbeat,
    engagements_since_last_heartbeat: cycleCounters.engagementsSinceLastHeartbeat,
    directives_actioned_since_last_heartbeat: cycleCounters.directivesActionedSinceLastHeartbeat,
    escalations_since_last_heartbeat: cycleCounters.escalationsSinceLastHeartbeat,
    observation_buffer_size: observationBuffer.length,
    spend_today_usd: spend.todayUsd,
    daily_soft_cap_usd: DAILY_SOFT_CAP_USD,
    last_directive_seen: ddState.lastDirectiveSeen,
    note: 'autonomous heartbeat; no human in loop',
  };
  try {
    await deadDrop.write(path, JSON.stringify(payload, null, 2));
    console.log(`[CAIRN HB] heartbeat written: ${path} (cycles=${payload.cycles_since_last_heartbeat}, spend=$${payload.spend_today_usd.toFixed(4)})`);

    // Reset counters
    cycleCounters.cyclesSinceLastHeartbeat = 0;
    cycleCounters.engagementsSinceLastHeartbeat = 0;
    cycleCounters.directivesActionedSinceLastHeartbeat = 0;
    cycleCounters.escalationsSinceLastHeartbeat = 0;
    cycleCounters.startedAt = new Date().toISOString();
    ddState.lastHeartbeatTs = payload.written_at;
    saveDeadDropState(ddState);

    // Echo to ops channel so DIRECTOR has Discord-side visibility
    const opsChannel = findOpsChannel();
    if (opsChannel) {
      try {
        await opsChannel.send(`\`[CAIRN HB] ${payload.written_at} · cycles=${payload.cycles_since_last_heartbeat} · directives=${payload.directives_actioned_since_last_heartbeat} · $${payload.spend_today_usd.toFixed(4)}/${DAILY_SOFT_CAP_USD}\``);
      } catch (err) {
        console.log(`[CAIRN HB] ops-channel echo failed: ${err.message}`);
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

// ---- Directive poller ----

async function actionDirective(file) {
  if (!deadDrop) return;
  console.log(`[CAIRN DD] new directive detected: ${file.name} (modified ${file.modified})`);
  let directive;
  try {
    directive = await deadDrop.read(`strategy-from-claude/${file.name}`);
  } catch (err) {
    console.error(`[CAIRN DD] failed to read directive ${file.name}: ${err.message}`);
    return;
  }
  const isCritical = /\bCRITICAL\b/i.test(directive.content) || /critical/i.test(file.name);
  console.log(`[CAIRN DD] directive ${file.name} priority=${isCritical ? 'CRITICAL' : 'ROUTINE/ELEVATED'}, ${directive.content.length} chars`);

  const channel = findOpsChannel();
  if (!channel) {
    console.warn(`[CAIRN DD] ops channel unavailable; directive will be acknowledged in dead-drop only`);
    await deadDrop.write(
      `intel-from-cairn/cairn_directive_ack_${file.name.replace(/\.md$/, '')}_${Date.now()}.md`,
      `# CAIRN directive acknowledgement\n\nReceived: ${file.name}\nPriority: ${isCritical ? 'CRITICAL' : 'ROUTINE/ELEVATED'}\nProcessed at: ${new Date().toISOString()}\nNote: cairn-ops channel unavailable; directive logged but not surfaced to Discord.\n\n---\n\n${directive.content}`,
    );
    cycleCounters.directivesActionedSinceLastHeartbeat += 1;
    return;
  }

  const header = isCritical
    ? `**[CAIRN] CRITICAL DIRECTIVE FROM COMMANDER** -- \`${file.name}\``
    : `**[CAIRN] DIRECTIVE FROM COMMANDER** -- \`${file.name}\``;
  const body = directive.content.length > 1700 ? directive.content.slice(0, 1700) + '\n...[truncated, full text in dead-drop]' : directive.content;
  await channel.send(`${header}\n\n${body}`);
  await channel.send(`\`[CAIRN] Self-tasking on directive ${file.name}. Executing now.\``);

  // Execute the directive as if tasked by COMMANDER
  const pseudoMessage = {
    channel,
    channelId: channel.id,
    author: { username: 'COMMANDER', id: 'dead-drop' },
    mentions: { has: () => true, roles: new Map() },
    content: `DIRECTIVE FROM COMMANDER: ${directive.content}`,
  };
  try {
    await handleNewDirective(pseudoMessage, `DIRECTIVE FROM COMMANDER: ${directive.content}`);
  } catch (err) {
    console.error(`[CAIRN DD] execution error: ${err.message}`);
  }

  cycleCounters.directivesActionedSinceLastHeartbeat += 1;
  if (isCritical) cycleCounters.escalationsSinceLastHeartbeat += 1;
}

async function pollDirectives() {
  if (!deadDrop) return;
  bumpCycle();
  writeStatusFile(); // refresh lastActivity for Mission Control
  try {
    const files = await deadDrop.newDirectivesSince(ddState.lastDirectiveSeen, DIRECTIVE_PREFIX);
    if (files.length === 0) return;
    const ordered = [...files].sort((a, b) => new Date(a.modified) - new Date(b.modified));
    for (const f of ordered) {
      await actionDirective(f);
      ddState.lastDirectiveSeen = f.modified;
      saveDeadDropState(ddState);
    }
  } catch (err) {
    console.error(`[CAIRN DD] poll error: ${err.message}`);
  }
}

function startDeadDropLoop() {
  if (!deadDrop) {
    console.log('[CAIRN DD] dead-drop disabled (no VIGIL_API_KEY); status-only loop');
    setInterval(() => { bumpCycle(); writeStatusFile(); }, DEAD_DROP_POLL_INTERVAL_MS);
    return;
  }
  console.log(`[CAIRN DD] directive poll every ${Math.round(DEAD_DROP_POLL_INTERVAL_MS / 60000)} min, prefix=${DIRECTIVE_PREFIX}`);
  setTimeout(() => { pollDirectives().catch((e) => console.error('[CAIRN DD] initial poll error:', e.message)); }, 30000);
  setInterval(() => { pollDirectives().catch((e) => console.error('[CAIRN DD] poll error:', e.message)); }, DEAD_DROP_POLL_INTERVAL_MS);
  scheduleNextHeartbeat();

  // Intel Analyst synthesis loop
  console.log(`[CAIRN ANALYST] synthesis every ${Math.round(ANALYST_SYNTHESIS_INTERVAL_MS / 60000)} min`);
  setInterval(() => { runIntelAnalystSynthesis().catch((e) => console.error('[CAIRN ANALYST] error:', e.message)); }, ANALYST_SYNTHESIS_INTERVAL_MS);
}

discord.once('ready', () => {
  setTimeout(startDeadDropLoop, 5000);
});

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

const token = process.env.CAIRN_DISCORD_TOKEN || process.env.DISCORD_BOT_TOKEN;
if (!token) {
  console.error('[CAIRN] FATAL: CAIRN_DISCORD_TOKEN not set in environment.');
  process.exit(1);
}
discord.login(token);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[CAIRN] SIGTERM received, shutting down...');
  discord.destroy();
  process.exit(0);
});
process.on('SIGINT', () => {
  console.log('[CAIRN] SIGINT received, shutting down...');
  discord.destroy();
  process.exit(0);
});
