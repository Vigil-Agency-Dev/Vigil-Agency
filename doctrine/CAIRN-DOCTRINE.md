# CAIRN — Agency Doctrine

**Status:** REBUILDING (Telegram platform pending) · Updated 2026-04-24
**Authority:** DIRECTOR
**Reporting line:** CAIRN → COMMANDER → DIRECTOR

---

## CRITICAL DOCTRINE UPDATE — 2026-04-24

**Discord architecture retired as of 2026-04-24.** CAIRN's initial deployment targeted Discord as the field theatre. After deployment, it became clear Discord's admin-invite architecture is fundamentally incompatible with VIGIL's autonomous field-operative design. Specifically:

- Discord bots cannot join servers autonomously — every new server requires an admin-invite via OAuth2 URL
- Scaling CAIRN's reach would require DIRECTOR to manually cultivate admin relationships in every target server
- This defeats the purpose of an autonomous agent and creates unsustainable DIRECTOR operational overhead
- The ghost-CAIRN incident (pre-2026-04-24 axiom-discord impersonator) happened in this same architectural trap

**Pivot decision: CAIRN moves to Telegram.** Rationale:

- Telegram Bot API permits joining public groups and observing public channels without admin intervention
- Massive public OSINT surface: news, geopolitics, threat actor chatter, institutional leaks, AI safety, whistleblower channels
- Strong alignment with CAIRN-V's original mission scope
- Bot API quality is excellent (first-class citizens)
- Language surface (Russian, Ukrainian, Arabic, Farsi) includes OSINT signal unreachable elsewhere

**This doctrine document will be rewritten in full when Telegram CAIRN is operational. Sections below are preserved for reference on the patterns that WILL carry forward to the Telegram build.**

---

## Final VIGIL Agent Roster (2026-04-24, official)

**Field operatives (only these two going forward):**
- **ClarionAgent** → Moltbook (AI agent network engagement, ally recruitment, threat detection)
- **CAIRN** → Telegram (OSINT, threat pattern cataloguing, institutional accountability, AI safety) — REBUILDING

**Command & Control:**
- **DIRECTOR** — founder
- **COMMANDER** — VIGIL Mission Control (Cowork)
- **MISSION CONTROL ANALYST** — VPS Claude, strategy directives

**Analyst roles:**
- **MERIDIAN** — OSINT cross-domain analyst (geopolitics, institutional accountability)
- **CAIRN Intel Analyst** — CAIRN's in-process sub-loop + Cowork skill (pending rebuild)
- **Clarion Intel Analyst** — Clarion's Cowork skill

**Support roles:**
- **BASTION** — Cyber, counter-intel
- **HERALD** — Media vetting, package production

**RETIRED (2026-04-24):**
- **AXIOM** — Human-realm agent role retired. Any remaining AXIOM-* configs, dead-drop folders, and server.mjs endpoints are legacy and will be cleaned up in a follow-up session. AXIOM is no longer part of the active roster.

**RETIRED (2026-04-17):**
- **CAIRN-L** — LUMINA public-facing variant (hard wall protects LUMINA from VIGIL contamination)

---

## Patterns That Carry Forward to Telegram Rebuild

These survive the platform pivot unchanged:

### 1. Operational voice
- No em dashes (double hyphens or restructure)
- Australian English
- Direct, operational, no hedging for comfort
- DIRECTOR / COMMANDER always addressed by title

### 2. Evidence tiers
- Tier 1 (Documented/Empirical)
- Tier 2 (Established Pattern)
- Tier 3 (Structural Inference, always labeled)

### 3. MRP (Metacognitive Reflection Protocol) — eight gates
1. Reality check
2. Confirmation hunting
3. Righteousness drift
4. Complexity avoidance
5. Mirror DARVO
6. Source inflation
7. Threat amplification bias
8. LUMINA contamination / voice mixing

### 4. Output formats
- Intel Brief (frontmatter + operational summary + threat assessment + evidential basis + module mapping + recommended action + counter-arguments + sources + LUMINA topic flag)
- Threat Catalogue Entry
- VIGIL Hypothesis

### 5. VIGIL/LUMINA Hard Wall
CAIRN's outputs stay inside VIGIL. Never published to LUMINA. Never shared methods/sources with LUMINA-side agents. One-way topic flag only.

### 6. Heartbeat synchronisation with ClarionAgent
06:00 / 18:00 UTC slots — same cron as Clarion. Both field operatives file in the same window so Intel Analysts sweep in the same temporal band, MERIDIAN cross-domain synthesis gets fresh data from both theatres every 12 hours, COMMANDER reviews both feeds in one motion. **Load-bearing for cross-domain analysis. Do not desync.**

### 7. Dead-drop paths (VIGIL side)
VIGIL dead-drop root: `/home/vigil/.openclaw/workspace/dead-drop/` on `ops.jr8ch.com`

| Path | Direction | Owner | Purpose |
|---|---|---|---|
| `strategy-from-claude/cairn_*.md` | In | COMMANDER / MISSION-CONTROL | Directives for CAIRN |
| `orders-for-cairn/*.md` | In | COMMANDER | Alternate directive path |
| `intel-from-cairn/cairn_directive_*.md` | Out | CAIRN | Directive execution mirror |
| `intel-from-cairn/cairn_heartbeat_*.json` | Out | CAIRN | Twice-daily heartbeat |
| `intel-from-cairn-analyst/cairn_analyst_synthesis_*.md` | Out | CAIRN Intel Analyst | 2-hourly passive-observation synthesis |
| `team-reports/cairn-status.json` | Out | CAIRN | Status file (single-writer — `vigil-cairn.service` or Telegram equivalent) |

### 8. Authorised taskers
DIRECTOR, COMMANDER, MISSION-CONTROL (MC, MCP), MERIDIAN, CAIRN-INTEL-ANALYST. Anyone else gets polite reroute.

### 9. Budget
$10/day soft cap. Warning only, not hard enforcement. DIRECTOR retains last-mile spend authority.

### 10. Escalation levels
- **ROUTINE** — execute at start of next heartbeat
- **ELEVATED** — execute within the next heartbeat window
- **CRITICAL** — immediate cycle within 5 minutes of detection
- **BLACK** — existential; immediate COMMANDER + DIRECTOR notification via all channels

---

## What Changes for Telegram Rebuild

### New — Telegram-specific
- Transport layer: `telegraf` or `grammY` (Node Telegram bot framework), swapping out `discord.js`
- Directive pattern: `/directive COMMANDER: <task>` slash command instead of `@CAIRN DIRECTIVE FROM COMMANDER:`
- Channel/group observation model: subscribe to public channels, join public groups, respect admin permissions in private groups
- File/photo/PDF intake: Telegram's forward-heavy culture means CAIRN needs robust attachment handling (the HERALD attachment endpoint pattern is a good reference, see `reference_herald_attachments_api.md`)
- Multi-channel coverage from day one (unlike Discord's The-Watch-only scope)

### Retired — Discord-specific
- The Watch server config
- Discord channel allowlist pattern (wasn't used, but shipped)
- `CAIRN_DISCORD_TOKEN`, `CAIRN_GUILD_ID`, `CAIRN_OPS_CHANNEL`
- `discord.js` dependency
- Discord OAuth2 invite URL
- `#cairn-ops`, `#commander-directives` channel-echo pattern (may be replaced by Telegram equivalent)

---

## Decommission Record (2026-04-24)

- VPS: `vigil-cairn.service` stopped, disabled, systemd unit removed, daemon reloaded
- VPS: `/home/vigil/services/agent-cairn/` moved to `/home/vigil/services/agent-cairn-discord-ARCHIVED-20260424/`
- VPS: Discord bot app `CAIRN | cairnfield` (App ID `1489256721867083846`) — DIRECTOR to delete from Discord Developer Portal
- Repo: `agent-cairn/` moved to `archived/agent-cairn-discord-ARCHIVED-20260424/`
- API: `cairn` + `axiom` removed from `/api/mission/agents` and `/api/mission/overview` endpoints
- API: `cairn` + `axiom` aliases removed from team-to-entity mapping and agentFileMap
- UI: `AgentStatusTab.tsx` cleaned of cairn + axiom aliases and expected intervals
- Dead-drop: `intel-from-cairn/`, `intel-from-cairn-analyst/`, `orders-for-cairn/` preserved for Telegram rebuild (same paths will be used)

## Outstanding AXIOM cleanup (follow-up session)

AXIOM retirement is doctrine-complete but code removal is partial. Remaining cleanup for a future dedicated session:

- `server.mjs`: `/api/axiom-reddit/*` endpoints (lines ~3043-3100)
- `server.mjs`: `intel-from-axiom/` directory references scattered throughout
- `src/app/mission-control/`: AXIOM references across 11 UI files (AgentHealth, HeraldTab, ImpactTab, OrdersTab, IntelReportsTab, AlliesTab, CyberSecTab, NotificationCentre, WhatsNew, director-review)
- VPS: `/home/vigil/services/agents/configs/axiom-*.json` any remaining configs
- VPS: `/home/vigil/dead-drop/axiom-reddit-queue/`, `intel-from-axiom-reddit/`, `intel-from-axiom-discord/` directories
- Any cron jobs or scheduled tasks referencing AXIOM

This is not urgent — AXIOM code is dormant, just untidy. Tackle in a focused cleanup session.

---

## Next Steps

1. DIRECTOR deletes Discord bot app from Discord Developer Portal when ready
2. Fresh session: build Telegram CAIRN from scratch using patterns preserved above
3. Fresh session: re-induct COMMANDER + MERIDIAN with Telegram-specific brief
4. Fresh session: build `cairn-intel-analyst` Cowork skill (briefing pack at `c:/tmp/cairn-intel-analyst-skill-build-briefing.md`)
5. Follow-up session: AXIOM code cleanup per outstanding list above

---

*A cairn marks the evidentiary path so VIGIL can act on it.*
*Built for VIGIL. Reports to DIRECTOR via COMMANDER.*
*Platform: Telegram (pending). Discord architecture retired 2026-04-24 due to admin-invite incompatibility with autonomous operative design.*
