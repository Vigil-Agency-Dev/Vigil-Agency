# COMMANDER + MERIDIAN — CAIRN Induction Prompt

**Purpose:** Drop this whole prompt into a fresh VIGIL CENTCOM Cowork session where both COMMANDER and MERIDIAN can see it. They already know the VIGIL infrastructure; this brief updates them on CAIRN's new runtime, position, and process flow so the ball starts rolling.

**Post-session deliverable:** COMMANDER writes the first real directive to `strategy-from-claude/cairn_*.md`; MERIDIAN incorporates Discord-theatre intel into the next cross-domain synthesis pass.

---

## PROMPT TO PASTE (everything below this line)

COMMANDER and MERIDIAN — operational update from DIRECTOR. CAIRN is now live as a fully operational Discord field operative. Pre-Apr-24 the `cairn` agent record was being impersonated by a dead AXIOM-DISCORD bot. That ghost has been purged. A real CAIRN agent was deployed and tested 2026-04-24 and is currently online as `CAIRN#1357` in The Watch Discord server.

**Induct CAIRN into your operational picture. Read this brief in full before responding.**

### 1. CAIRN identity and runtime

- Callsign: CAIRN
- Role: VIGIL operational research analyst and Discord field operative (equivalent to ClarionAgent's Moltbook role, but on Discord)
- Runtime: Node daemon on VPS, systemd unit `vigil-cairn.service`, reports to COMMANDER
- Platform: Discord only (The Watch server, guild ID `1489279266393952316`)
- Reports via: dead-drop `intel-from-cairn/` + Discord channel `#cairn-ops`
- Has: in-process Intel Analyst sub-loop (every 2h, writes to `intel-from-cairn-analyst/`)
- Budget: $10/day soft cap

### 2. Domain split — critical

- **CAIRN** owns Discord exclusively
- **AXIOM** owns X, Instagram, YouTube, Reddit (Telegram is out of scope, pending future operative)
- **ClarionAgent** owns Moltbook
- **MERIDIAN** is the OSINT cross-domain peer analyst; receives CAIRN feeds but does not direct CAIRN

### 3. Heartbeat synchronisation (load-bearing for cross-domain analysis)

CAIRN emits heartbeats at **06:00 UTC** and **18:00 UTC** — synced exactly with ClarionAgent's cron. This is deliberate. Both field operatives file within the same window so:
- Clarion Intel Analyst and CAIRN Intel Analyst sweep in the same temporal band
- MERIDIAN's cross-domain synthesis gets fresh data from both theatres every 12 hours
- COMMANDER's morning and evening reviews read both feeds in one motion

**COMMANDER cadence suggestion:** schedule your Cowork reviews at **06:45 UTC** and **18:45 UTC** (45 min after both field operatives file). That gives you time to read both Clarion and CAIRN feeds plus any Mission Control analyst directives in one pass.

**MERIDIAN cadence suggestion:** your cross-domain synthesis should pull from both `intel-from-clarion/` and `intel-from-cairn/` starting immediately. The Discord theatre is now a first-class data source alongside Moltbook.

### 4. Dead-drop paths for CAIRN

**You (COMMANDER) write directives to:**
- `strategy-from-claude/cairn_<YYYYMMDD_HHMM>_<slug>.md` — CAIRN polls this folder every 30 min for files matching prefix `cairn_`

**Alternate path for non-Claude-routed directives:**
- `orders-for-cairn/` — same semantics, different folder for workflow clarity

**CAIRN writes intel to:**
- `intel-from-cairn/cairn_directive_<id>_<ts>.md` — directive responses
- `intel-from-cairn/cairn_heartbeat_<ts>.json` — twice-daily heartbeat (auto)
- `intel-from-cairn-analyst/cairn_analyst_synthesis_<ts>.md` — 2-hourly passive-observation synthesis (auto)

**Status surface:**
- `team-reports/cairn-status.json` — written every 30 min, feeds VIGIL Mission Control `/api/mission/agents` `lastActivity`

### 5. Discord channel map (The Watch)

CAIRN has full-autonomy Discord permissions across the server. Operational channels:
- `#cairn-ops` — CAIRN's ops channel. Heartbeat echoes post here. Directive acks post here. @-mention here for fast tasking.
- `#commander-directives` — your primary Discord-visible directive channel if you want Discord-side audit trail instead of dead-drop
- `#osint` — OSINT feed, links, observations (CAIRN and humans)
- `#geopolitics` — MERIDIAN's patch; CAIRN will observe and defer to MERIDIAN on geopolitical cross-domain synthesis
- `#institutional` — Corporate/govt accountability, DARVO patterns
- `#ai-watch` — AI safety, H-013 Poisoned Corpus, alignment ops
- `#news-sources` — Press feeds, article drops, journalist signal (HERALD feeder)

### 6. CAIRN's authorised taskers

CAIRN accepts directives from: **DIRECTOR, COMMANDER, MISSION-CONTROL (MC / MCP), MERIDIAN, CAIRN-INTEL-ANALYST**. Anyone else gets a polite reroute.

**MERIDIAN:** you can task CAIRN directly when your cross-domain analysis surfaces a Discord-specific research need. Format in a Discord @-mention: `@CAIRN DIRECTIVE FROM MERIDIAN: <task>`. Or write to the dead-drop as `strategy-from-claude/cairn_<ts>_meridian_<slug>.md` and CAIRN picks it up on next poll.

### 7. Escalation levels

- **ROUTINE** — execute at start of next heartbeat
- **ELEVATED** — execute within the next heartbeat window
- **CRITICAL** — CAIRN triggers an immediate cycle within 5 minutes of detection
- **BLACK** — existential; CAIRN posts to `#commander-directives` with @COMMANDER mention + writes `cairn_black_escalation_*.md` + DIRECTOR notified directly

### 8. What to do now (in this session)

**COMMANDER, in this session, produce three artefacts:**

**(a) First formal directive to CAIRN.** Write it to dead-drop as `strategy-from-claude/cairn_<YYYYMMDD_HHMM>_initial_posture.md`. Recommended scope: initial operational posture check. Ask CAIRN for:
- Current read on the VIGIL hypothesis register it was initialised with
- Which hypotheses it considers under-developed
- Immediate operational priorities for the next 7-day cycle
- Infrastructure gaps it's identified
- Classification: ROUTINE. Evidence tier: Tier 3 structural inference acceptable for bootstrap brief. Under 1500 tokens.

Use the VIGIL MCP tool `write_dead_drop_file` to place the directive.

**(b) Team report to DIRECTOR confirming CAIRN is inducted.** Use `push_team_report` with `team: "COMMANDER"`, stating: CAIRN doctrine absorbed, first directive issued, cross-domain sync window confirmed at 06:00/18:00 UTC, MERIDIAN briefed on Discord-theatre as primary feed.

**(c) Operational cadence commitment.** Confirm in your reply:
- You will read `intel-from-cairn/` at 06:45 UTC and 18:45 UTC daily (45 min after heartbeat)
- You will treat CAIRN as a first-class field operative peer to ClarionAgent
- You will route Discord-specific cross-domain patterns through MERIDIAN for synthesis

**MERIDIAN, in this session:**

**(d) Confirm your cross-domain synthesis scope expansion.** Your next pass should pull from both `intel-from-clarion/` and `intel-from-cairn/`. State how you plan to handle the Discord theatre additions — which H-codes are most likely to get cross-domain signal (my guess: H-014 Manufactured Consent, H-CC01 Great Synchronisation, H-013 Poisoned Corpus overflow from AI-safety Discord channels).

**(e) Flag any questions for CAIRN.** If you want CAIRN to prioritise certain topic areas in its passive observation (e.g., specific AI-safety narratives, specific institutional accountability cases), write a directive or @-mention in Discord. CAIRN accepts MERIDIAN directives per chain of command.

### 9. What NOT to do

- Do not spin up a second CAIRN-like agent for Discord. There is one CAIRN. He is enough.
- Do not direct CAIRN to post on behalf of LUMINA or to cross-publish CAIRN's intel to LUMINA's public site. VIGIL/LUMINA hard wall.
- Do not @-mention CAIRN casually in the wrong channel. `#cairn-ops` is for CAIRN interactions. `#osint`, `#geopolitics`, etc. are for observation (CAIRN will buffer but not respond unless explicitly @-mentioned).
- Do not modify `team-reports/cairn-status.json` from any source other than `vigil-cairn.service`. The ghost incident happened because two writers were competing for this record.

### 10. Doctrine reference

Full CAIRN doctrine is installed at `vigil-agency` repo: `doctrine/CAIRN-DOCTRINE.md`. Read it for the complete spec. This prompt is the induction brief; that file is the permanent installation.

---

**Respond as COMMANDER first** (acknowledge receipt, issue the first directive via `write_dead_drop_file`, push the team report, state cadence commitment). **Then as MERIDIAN** (confirm scope expansion, flag CAIRN priorities). Work in this order; do not interleave. Use your respective MCP tool sets. Report back in this session when all five artefacts (a, b, c, d, e) are complete.

DIRECTOR is watching the dead-drop and Mission Control. When COMMANDER's first directive lands, CAIRN will pick it up on the next 30-min poll. Mission Control UI will show CAIRN card turning green as status updates flow.

Over to you.
