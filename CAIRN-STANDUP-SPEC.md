# CAIRN Standup — Build Spec

**Status:** Ready to build when session allocated.
**Estimated:** 4–8 hours, medium complexity.
**Approach:** Port TARN's Discord daemon (LUMINA), swap scope to VIGIL.

---

## 1. What CAIRN is

VIGIL-side Discord field operative. Mirrors ClarionAgent's runtime pattern (autonomous Node daemon on VPS, dead-drop bridge to COMMANDER, twice-daily heartbeat) but talks to Discord instead of scraping Moltbook. Has its own Intel Analyst as a chain-of-command sub-agent. Reports to COMMANDER, receives orders from COMMANDER.

- **Scope:** OSINT, Geopolitical, Institutional, AI, news-source Discord channels
- **Persona:** Single-agent (no workers like TARN's ROWAN/ASHE)
- **Runtime location:** VPS (like ClarionAgent, not like TARN which is local)
- **Logging:** JSONL to VPS + mirror to Discord UI for DIRECTOR visibility

---

## 2. Discord identity + target channels

| Field | Value |
|---|---|
| Bot account | `CAIRN | cairnfield` |
| Bot App ID | `1489256721867083846` |
| Target server | The Watch (`https://discord.gg/5ajjjxW9`) |
| Server ID | `1489279266393952316` |
| Primary ops channel | `1497162750885888063` ([link](https://discord.com/channels/1489279266393952316/1497162750885888063)) |
| Bot token | **NOT IN REPO.** Must be provisioned on VPS `.env` as `CAIRN_DISCORD_TOKEN` before first run. |

**Channel allowlist to confirm with DIRECTOR before build:** the primary ops channel above is confirmed; need list of OSINT / Geopolitical / Institutional / AI / news-source channels CAIRN should observe (read) vs. post to (write).

---

## 3. Port plan (TARN → CAIRN)

### 3.1 Files to copy as-is (portable transport)

Source: `C:\Users\jhyde_zzz3b9b\Documents\Claude\Projects\LUMINA\06_Build\lumina-content-lab\shared\`

- `discord-client.js` — discord.js v14 wrapper, zero LUMINA knowledge
- `claude-client.js` — Anthropic SDK wrapper
- `dead-drop-lumina-client.js` — HTTP client for dead-drop; **rename to `dead-drop-vigil-client.js`**, repoint endpoint and key
- `logger.js` — JSONL session logging, agent-name-agnostic
- `cost-tracker.js` — token cost tallying

### 3.2 Files to adapt (LUMINA → VIGIL)

Source: `C:\Users\jhyde_zzz3b9b\Documents\Claude\Projects\LUMINA\06_Build\lumina-content-lab\agent-tarn\index.js`

Port as `agent-cairn/index.js` with these changes:
- Strip ROWAN/ASHE worker dispatch entirely (single-agent)
- Replace LUMINA agent names/auth list with VIGIL roster (DIRECTOR, COMMANDER, CAIRN INTEL ANALYST)
- Replace channel allowlist with CAIRN's channels (see §2)
- Replace system prompt file path
- Swap dead-drop paths: write to `intel-from-cairn/`, read from `strategy-from-claude/cairn_*.md` and `orders-for-cairn/`
- Swap heartbeat path to `intel-from-cairn/cairn_heartbeat_*.json`
- Strip external-mode H-013 logging (LUMINA-specific research artifact)
- Keep external-mode keyword-filter + observation buffer (useful for VIGIL field observation)

### 3.3 New files to write

- `agent-cairn/system-prompt.txt` — adapt from `.claude/skills/vigil-cairn/SKILL.md`. The skill doc is already there; runtime form just needs the system-prompt translation.
- `agent-cairn/.env.example` — document required env vars
- Intel Analyst sub-loop — CAIRN's chain of command includes a Claude Intel Analyst child. Pattern: CAIRN writes observations → Intel Analyst synthesises → Analyst output written to `intel-from-cairn-analyst/`. Specify in spec doc before build — does the Analyst run as a separate cron task (like ClarionAgent's pattern) or inside CAIRN's process (sub-call)?

### 3.4 Env vars needed on VPS

```bash
CAIRN_DISCORD_TOKEN=<bot token>              # from Discord dev portal
CAIRN_GUILD_ID=1489279266393952316
CAIRN_PRIMARY_CHANNEL=1497162750885888063
CAIRN_OBSERVE_CHANNELS=<comma-separated channel IDs>
VPS_API_BASE=https://ops.jr8ch.com
VIGIL_API_KEY=<existing key, same as ClarionAgent uses>
ANTHROPIC_API_KEY=<existing key>
DEAD_DROP_POLL_INTERVAL_MS=1800000           # 30 min
HEARTBEAT_SCHEDULE=06:30,18:30 AEDT          # twice-daily, matches EXPECTED_INTERVALS
```

### 3.5 Deployment

- Deploy as Node daemon on VPS under `vigil` user (same pattern as ClarionAgent)
- Systemd unit `vigil-cairn.service` (new — TARN runs manually, this is VIGIL-side improvement)
- Logs: `/home/vigil/logs/cairn.log` (stdout/stderr) + JSONL session logs
- Add cron only for heartbeat-enforcer if the daemon dies silently; primary lifecycle is the daemon staying up.

### 3.6 Mission Control wiring

- Once CAIRN is posting heartbeats, `AgentStatusTab` already has `cairn: 12` in `EXPECTED_INTERVALS` so it'll display correctly.
- `getTeamReport` map in `AgentStatusTab.tsx:145` already lists `cairn: ['cairn', 'CAIRN', 'axiom-discord', 'axiom-telegram', ...]` — the existing mapping should work. Verify Intel Analyst team reports map to a CAIRN-associated name.
- The "ghost" `lastActivity: 2026-04-24T05:21:01Z` signal we observed — you confirmed it's the incorrectly-set-up original CAIRN. **Before deploy**, identify and remove whatever is currently writing to the `cairn` agent record on VPS so the new daemon's signal isn't overwritten by ghost data.

---

## 4. Test plan

Before declaring CAIRN live:

1. Bot logs into Discord, shows online in The Watch server
2. Bot observes primary ops channel; `messageCreate` handler fires on test message
3. Heartbeat writes to `intel-from-cairn/` at scheduled time; `/api/mission/agents` returns updated `lastHeartbeat` for `cairn` (not `lastActivity`)
4. Test directive from DIRECTOR in dead-drop → CAIRN reads → acks in Discord channel
5. Intel Analyst sub-loop: test observation flows through to analyst output
6. Mission Control UI: CAIRN card shows "ON SCHEDULE" after first heartbeat; health label does not flicker

---

## 5. Open questions to resolve before build

- [ ] Full channel allowlist (observe vs. post) — partial answer received (primary ops channel)
- [ ] Intel Analyst architecture — separate cron task or in-process sub-call?
- [ ] Which CAIRN skill prompt to use — `.claude/skills/vigil-cairn/SKILL.md` as authoritative source, or rewrite?
- [ ] VPS-side cleanup — identify and retire the "ghost CAIRN" that's writing `lastActivity` currently
- [ ] Discord bot invite URL — if the bot hasn't been added to The Watch server yet, need OAuth2 URL with full-autonomy perms (see §7)

---

## 6. Non-goals for first build

Defer until after CAIRN v1 is stable:
- Voice channel observation
- Multi-guild support (first version: The Watch only)
- Field agent spawning (CAIRN is single-agent per DIRECTOR spec)

---

## 7. Discord permission scope — FULL AUTONOMY

Per DIRECTOR 2026-04-24: CAIRN runs with full autonomy on Discord. Not least-privilege — intentional operational scope. CAIRN may: watch all channels, comment, post, send DMs, read DMs, react, manage threads, attach files.

### Required OAuth2 scopes

- `bot`
- `applications.commands` (for future slash-command use)

### Required bot permissions (decimal: 532441780800)

From Discord's permission integer calculator:

| Permission | Why |
|---|---|
| Read Messages / View Channels | Observe all channels |
| Send Messages | Post + comment |
| Send Messages in Threads | Participate in threads |
| Create Public Threads | Initiate conversations |
| Create Private Threads | Operational privacy |
| Read Message History | Context beyond live feed |
| Add Reactions | Lightweight signalling |
| Attach Files | Share intel artefacts |
| Embed Links | Rich content |
| Mention Everyone | Escalation signals (use sparingly) |
| Use External Emojis | Full expressiveness |
| Read Message History in DMs | Handle DMs as channel-equivalent |
| Send DMs | Handle DMs as channel-equivalent |
| Manage Messages | Delete own posts, pin intel |
| Manage Threads | Housekeeping |
| Manage Webhooks | If CAIRN wires downstream integrations |

### Discord Developer Portal — gateway intents

On the CAIRN bot app page, enable all three **privileged intents**:

- [x] **Presence Intent** — see who's online in observed channels
- [x] **Server Members Intent** — resolve user IDs to names
- [x] **Message Content Intent** — **critical** — without this, CAIRN sees message metadata but not actual text content. TARN already has this enabled.

If not enabled, `messageCreate` events arrive with empty `.content` and CAIRN is effectively blind.

### OAuth2 invite URL (paste into browser as server admin)

```
https://discord.com/api/oauth2/authorize?client_id=1489256721867083846&permissions=532441780800&scope=bot%20applications.commands
```

This URL grants the full-autonomy permission set above. Server admin clicks, picks The Watch server, authorises. Done.

### Security implications

- Token lives in VPS `/home/vigil/.env` only (provisioned 2026-04-24). Never in repo.
- If token rotates in future: re-run the SSH stdin flow from memory `reference_cairn_token_provisioning.md` (to be written tonight if process gets reused).
- CAIRN runs as `vigil` user on VPS, same sandbox as ClarionAgent.
- COMMANDER retains override authority per VIGIL chain of command.
