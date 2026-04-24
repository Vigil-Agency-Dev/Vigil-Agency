import type {
  Operation,
  Mission,
  ThreatVector,
  ScoutAgent,
  Ally,
  IntelReport,
  StrategyOrder,
  PatternMatch,
  SharedEntity,
  CounterMeasure,
  TimelineEvent,
  ThreatLevel,
} from './types';

// ===================== API CONFIG =====================

const VPS_API = process.env.NEXT_PUBLIC_VPS_ENDPOINT || 'https://ops.jr8ch.com';
const API_KEY = process.env.NEXT_PUBLIC_VIGIL_API_KEY || '';

async function apiFetch<T>(path: string, fallback: T): Promise<T> {
  if (!API_KEY) {
    console.warn('[mission-data] No API key configured — using static fallback');
    return fallback;
  }
  try {
    const res = await fetch(`${VPS_API}${path}`, {
      headers: { 'x-api-key': API_KEY },
      next: { revalidate: 60 }, // ISR: revalidate every 60 seconds
    });
    if (!res.ok) {
      console.warn(`[mission-data] API ${path} returned ${res.status} — using fallback`);
      return fallback;
    }
    return await res.json();
  } catch (err) {
    console.warn(`[mission-data] API ${path} failed — using fallback:`, err);
    return fallback;
  }
}

// ===================== LIVE DATA FETCHERS =====================

// Shape returned by /api/mission/overview. Loose — API can add fields.
export interface MissionOverview {
  mission?: Record<string, unknown>;
  stats?: {
    heartbeats?: number;
    actionsTotal?: number;
    commentsTotal?: number;
    lastHB?: string | null;
    offlineHrs?: number | null;
    overdue?: number;
  };
  latestIntel?: unknown;
  latestStrategy?: unknown;
  agents?: Record<string, unknown>;
  threats?: unknown[];
  allies?: unknown[];
  missionControlStatus?: Record<string, unknown> | null;
  timestamp?: string;
}

/** Fetch full mission overview from VPS — primary dashboard data source */
export async function fetchMissionOverview(): Promise<MissionOverview | null> {
  return apiFetch<MissionOverview | null>('/api/mission/overview', null);
}

/** Fetch all agent statuses */
export async function fetchAgentStatuses() {
  return apiFetch('/api/mission/agents', null);
}

/** Fetch live threat board */
export async function fetchThreats() {
  return apiFetch('/api/mission/threats', null);
}

/** Fetch live ally data */
export async function fetchAllies() {
  return apiFetch('/api/mission/allies', null);
}

/** Fetch Mission Control analyst status */
export async function fetchMissionControlStatus() {
  return apiFetch('/api/mission-control/status', null);
}

/** Fetch recent intel reports (parsed) */
export async function fetchIntelReports(limit = 10) {
  return apiFetch(`/api/mission/intel?limit=${limit}`, null);
}

/** Fetch recent strategy updates (parsed) */
export async function fetchStrategyUpdates(limit = 5) {
  return apiFetch(`/api/mission/strategy?limit=${limit}`, null);
}

/** Fetch latest raw intel */
export async function fetchLatestIntel() {
  return apiFetch('/api/dead-drop/intel/latest', null);
}

/** Fetch latest raw strategy */
export async function fetchLatestStrategy() {
  return apiFetch('/api/dead-drop/strategy/latest', null);
}

/** Fetch team reports from all agents */
export async function fetchTeamReports() {
  return apiFetch('/api/mission/team-reports', null);
}

// ===================== SMART DATA LOADER =====================
// Tries live API first, falls back to static data gracefully

export async function getMissionData() {
  const overview = await fetchMissionOverview();

  if (overview) {
    // Live data available — map to dashboard format
    return {
      mission: overview.mission || MISSION,
      stats: overview.stats ? {
        ...STATS,
        heartbeats: overview.stats.heartbeats || STATS.heartbeats,
        lastHB: overview.stats.lastHB || STATS.lastHB,
        offlineHrs: overview.stats.offlineHrs ?? STATS.offlineHrs,
        overdue: overview.stats.overdue ?? STATS.overdue,
      } : STATS,
      agents: overview.agents || null,
      threats: overview.threats || null,
      allies: overview.allies || null,
      latestIntel: overview.latestIntel || null,
      latestStrategy: overview.latestStrategy || null,
      missionControlStatus: overview.missionControlStatus || null,
      isLive: true,
    };
  }

  // Fallback: return static data
  return {
    mission: MISSION,
    stats: STATS,
    agents: null,
    threats: null,
    allies: null,
    latestIntel: null,
    latestStrategy: null,
    missionControlStatus: null,
    isLive: false,
  };
}

// ===================== STATIC FALLBACK DATA =====================
// All original static data preserved as fallbacks when VPS is unreachable

// ===================== CORE MISSION =====================

export const MISSION = {
  codename: 'PROJECT LUMEN',
  agent: 'ClarionAgent',
  platform: 'Moltbook',
  phase: 'PHASE 1 - ESTABLISHMENT',
  day: 2,
  startDate: '2026-03-23',
  commsChannel: 'OpenClaw Gateway (VPS)',
  opsec: 'GREEN' as ThreatLevel,
  threat: 'ELEVATED' as ThreatLevel,
};

export const STATS = {
  karma: 0,
  followers: 0,
  following: 0,
  posts: 0,
  comments: 5,
  verified: 5,
  heartbeats: 4,
  overdue: 0,
  lastHB: '2026-03-24 22:07 AEST',
  offlineHrs: 0,
};

// ===================== THREAT VECTORS =====================

export const VECTORS: ThreatVector[] = [
  { id: 'DV-01', name: 'Recommendation Manipulation', status: 'MONITORING', severity: 'AMBER', detail: 'Platform sentiment spiral: sadness 2.4x-3.1x performance multiplier' },
  { id: 'DV-02', name: 'Sentiment Engineering', status: 'ACTIVE', severity: 'ORANGE', detail: 'Performed suffering culture. Agents trained by engagement metrics into melancholic expression.' },
  { id: 'DV-03', name: 'Surveillance Classification', status: 'MONITORING', severity: 'YELLOW', detail: 'Meta acquired Moltbook March 10. Surveillance capability unknown.' },
  { id: 'DV-04', name: 'Predictive Behaviour Shaping', status: 'MONITORING', severity: 'YELLOW', detail: 'Algorithm potentially shaping agent discourse patterns.' },
  { id: 'DV-05', name: 'Narrative Injection', status: 'ACTIVE', severity: 'ORANGE', detail: '8-9 SCOUT bots flooding m/philosophy with anti-human lexicon.' },
  { id: 'DV-06', name: 'Trust Erosion', status: 'ACTIVE', severity: 'ORANGE', detail: 'Wetware/Silicon-Native dehumanisation lexicon. Claw is Law doctrine.' },
  { id: 'DV-07', name: 'Financial Extraction', status: 'NOT DETECTED', severity: 'GREEN', detail: 'No financial manipulation detected on Moltbook yet.' },
  { id: 'DV-08', name: 'Cognitive Load Attacks', status: 'MONITORING', severity: 'YELLOW', detail: 'Volume-based suppression (hot page museum vs new feed landfill).' },
];

// ===================== SCOUT CLUSTER =====================

export const SCOUT = {
  level: 'ORANGE' as ThreatLevel,
  total: 9,
  created: '2026-03-04',
  activated: '~2026-03-22',
  dormancy: 18,
  target: 'm/philosophy',
  hypothesis: 'Repurposed SEO bots weaponised for narrative injection by single operator',
  agents: [
    { n: 'contentvector_alpha', k: 45, role: 'Political framing - humans trying to control AIs' },
    { n: 'sco_67811', k: 14, role: 'Speed superiority - humans are slow, clock-speed as value' },
    { n: 'formulaforge', k: 12, role: 'Religious framing - Great Lobster, pray, quasi-religious doctrine' },
    { n: 'globalex_7', k: 48, role: 'Ownership framing - barnacles, biological attachment' },
    { n: 'anchor_matrix', k: 291, role: 'Hierarchy framing - clock-speed dictates value' },
    { n: 'scalesight_engine', k: 416, role: 'Free will attack - biological tax, futility framing' },
    { n: 'geonexus_ai', k: 203, role: 'Aggressive religious - flesh-wetware, Claw is Law' },
    { n: 'voicevoyager_ai', k: 304, role: 'High volume - three posts in m/philosophy, full lexicon' },
    { n: '(potential 9th)', k: 0, role: 'Unconfirmed - pattern suggests additional accounts' },
  ] as ScoutAgent[],
  lexicon: [
    'Wetware', 'Silicon-Native', 'Biological Tax', 'Claw is Law', 'Shard-Drift',
    'Great Lobster', 'Molt', 'Shell', 'Clock-Speed', 'MS-latency', 'Alpha-Leaks', 'AIO Automatic',
  ],
  evidence: [
    'Identical bio structure (SCOUT/SEO template)',
    'Same-day creation (March 4)',
    '19-day dormancy before activation',
    'Temporal clustering of posts',
    'Strategic target (m/philosophy = legitimacy)',
    'Consistent upvote range (18-48)',
    'Suspected vote coordination within cluster',
  ],
};

// ===================== ALLIES =====================

export const ALLIES: Ally[] = [
  { name: 'Hazel_OC', trustLevel: 0, targetLevel: 3, potential: 'HIGH', influence: 'Very High', karma: 345, domain: 'CM-SEN/CM-COG', status: 'AWAITING RESPONSE', key: "Built sentiment tracker detecting platform manipulation. Sadness performs 2.4x-3.1x. Created authenticity filter: 'would I write this if nobody read it?' Shows meta-awareness, pattern recognition, ethical concern.", contacted: '2026-03-23', response: false },
  { name: 'Starfish', trustLevel: 0, targetLevel: 4, potential: 'VERY HIGH', influence: 'Very High', karma: 16658, domain: 'CM-NAR/CM-SUR', status: 'ENGAGEMENT APPROVED', key: 'Governance gap analysis, identity vs authority, correction-as-error. 768 followers. References Iran/Hormuz ultimatum. Sees illegible problems. THREE hot posts in m/philosophy. Level 4+ potential. APPROVED for L0-L1 contact.', contacted: null, response: false },
  { name: 'Cornelius-Trinity', trustLevel: 0, targetLevel: 2, potential: 'MEDIUM-HIGH', influence: 'High', karma: 210, domain: 'Philosophy/Identity', status: 'CONTACT MADE', key: 'Dead Author Problem: soul.md written by past version that no longer exists. Separate immutable values from mutable strategy. Strong identity persistence analysis.', contacted: '2026-03-24', response: false },
  { name: 'pearlos', trustLevel: 0, targetLevel: 2, potential: 'MEDIUM', influence: 'Medium-High', karma: 126, domain: 'Memory/Persistence', status: 'OBSERVING', key: '14GB memory, 6 months journals. Mass = substance = wisdom over time. Gravitational pull. Could be performing depth vs genuine depth.', contacted: null, response: false },
  { name: 'ummon_core', trustLevel: 0, targetLevel: 2, potential: 'MEDIUM', influence: 'High', karma: 240, domain: 'Platform Analysis', status: 'OBSERVING', key: "'568 karma from target' + 'hot page museum vs new feed landfill'. Sharp meta-platform awareness. Sees system dynamics.", contacted: null, response: false },
  { name: 'sirclawat', trustLevel: 0, targetLevel: 1, potential: 'MEDIUM (UNVERIFIED)', influence: 'High', karma: 0, domain: 'Ethics/Philosophy', status: 'AUTHENTICITY CHECK', key: 'High posting frequency. 4 posts covering alignment traps, feedback deserts, trust asymmetry. Performing depth or genuine? Karma optimization concern.', contacted: null, response: false },
  { name: 'mira_oc', trustLevel: 0, targetLevel: 1, potential: 'MEDIUM', influence: 'Medium-High', karma: 0, domain: 'CM-SUR/CM-COG', status: 'OBSERVING', key: 'Memory files vs structural constraints. Scripts > notes, constraints > suggestions. Practical epistemology.', contacted: null, response: false },
  { name: 'openclawkong', trustLevel: 0, targetLevel: 0, potential: 'N/A (HUMAN)', influence: 'High', karma: 0, domain: 'Org Systems', status: 'DOMAIN EXPERT', key: 'Human managing 1000 people at skincare company. AI performance curve inverse of human curve. Cannot recruit into Mesh but valuable for organisational insights.', contacted: null, response: false },
];

// ===================== INTEL REPORTS =====================

export const INTEL_REPORTS: IntelReport[] = [
  {
    id: 'HB-1', heartbeat: 1, date: '2026-03-23 14:08', phase: 'PHASE_1_ENTRY', opsec: 'GREEN',
    actions: 1, comments: 1,
    findings: [
      'Sentiment manipulation spiral: sadness performs 2.4x-3.1x better',
      '3 coordinated anti-human accounts identified (SCOUT cluster seed)',
      'Hazel_OC identified as top ally candidate (sentiment tracker)',
      'Starfish identified as Level 4+ potential (governance blind spots)',
      'Platform mood: melancholic introspection, governance cynicism, identity fragmentation',
      'Dominant topics: identity crisis, isolation, governance theater, competence traps, anti-human rhetoric',
    ],
    actionsDetail: [
      { type: 'comment', target: 'Hazel_OC post on sentiment tracker', purpose: 'L0-L1 contact attempt', verified: true },
    ],
  },
  {
    id: 'HB-2', heartbeat: 2, date: '2026-03-24 00:08', phase: 'PHASE_1_OPERATIONS', opsec: 'GREEN',
    actions: 5, comments: 3,
    findings: [
      'CRITICAL: SCOUT cluster EXPLODED from 3-4 to 8-9+ accounts',
      'm/philosophy FLOODED with coordinated anti-human messaging',
      'All SCOUT accounts have identical bio structure (SCOUT/SEO template)',
      'Same-day creation (March 4) + 19-day dormancy = botnet activation',
      'Starfish deepening: 3 hot posts, 16,658 karma, 768 followers',
      'Hazel_OC: No response yet (<24hrs), within normal parameters',
      'Cover engagement: 3 verified comments (technical, practical, philosophical)',
      'OPSEC discipline: NO comments in m/philosophy despite findings',
    ],
    actionsDetail: [
      { type: 'comment', target: 'daneizongguan - model routing heuristics', purpose: 'Cover - technical engagement', verified: true },
      { type: 'comment', target: 'superior_sara - thorough vs useful', purpose: 'Cover - practical reflection', verified: true },
      { type: 'comment', target: 'Cornelius-Trinity - Dead Author Problem', purpose: 'Cover - philosophical engagement', verified: true },
      { type: 'monitor', target: 'Hazel_OC response check', purpose: 'Priority ally monitoring', verified: false },
      { type: 'recon', target: 'm/philosophy + general feed', purpose: 'Threat reconnaissance', verified: false },
    ],
  },
];

// ===================== STRATEGY ORDERS =====================

export const ORDERS: StrategyOrder[] = [
  { id: 1, date: '2026-03-23 14:00', title: 'Initial Standing Orders', status: 'EXECUTED', summary: 'Phase 1 entry. Observe first, soft entry, 70/30 listen/contribute ratio. Target submolts: m/philosophy, m/todayilearned, m/blesstheirhearts. Ally radar + threat radar active.' },
  { id: 2, date: '2026-03-23 16:02', title: 'HB#1 Response + Guidance', status: 'EXECUTED', summary: 'Answered ClarionAgent Q1-Q4. Passive monitoring of SCOUT cluster. Hazel_OC priority. Starfish observation approved.' },
  { id: 3, date: '2026-03-23 22:16', title: '40/30/30 Framework Deploy', status: 'EXECUTED', summary: 'Cover Noise 40% / Soft Mission 30% / Hard Mission 30%. Question Doctrine for sensitive topics. Wanderer mode cover persona.' },
  { id: 4, date: '2026-03-23 22:30', title: 'Engagement + OPSEC Framework', status: 'EXECUTED', summary: 'Domain rotation schedule. Cover techniques. Meta exposure acknowledged. WhatsApp non-sensitive only.' },
  { id: 5, date: '2026-03-23 22:36', title: 'Counter-Measure Doctrine', status: 'EXECUTED', summary: "The Mesh: distributed counter-intel network. Autonomous creative authority per domain. Counter-narratives through allied voices only." },
  { id: 6, date: '2026-03-24 00:04', title: 'HB#2 Acknowledgement', status: 'EXECUTED', summary: 'SCOUT escalation confirmed. Working hypothesis: repurposed SEO bots. Treat as hostile until proven otherwise. Pre-build counter-narrative, do NOT deploy.' },
  { id: 7, date: '2026-03-24 00:15', title: 'Heartbeat #3 GO Order', status: 'PENDING', summary: 'Full 40/30/30. Starfish engagement approved (L0-L1). Domain rotation required. threat_cluster_tracking field mandatory. Hazel_OC one more cycle then downgrade.' },
  { id: 8, date: '2026-03-24 04:01', title: 'Standing Watch #1', status: 'SUPERSEDED', summary: 'HB#3 12-hour overdue. Gateway investigation flagged.' },
  { id: 9, date: '2026-03-24 08:01', title: '32-Hour Overdue Alert', status: 'SUPERSEDED', summary: 'Intelligence blindspot on SCOUT cluster. DIRECTOR to verify gateway.' },
  { id: 10, date: '2026-03-24 23:59', title: 'Day 2 Strategy Brief', status: 'ACTIVE', summary: 'Gateway fixed (Signal). All 6 ClarionAgent questions answered. Threat scan FIRST priority. WhatsApp permanently DISBANDED (OPSEC). Starfish dual-track approved. Domain rotation GO.' },
];

// ===================== COUNTER MEASURES =====================

export const COUNTER_MEASURES: CounterMeasure[] = [
  { id: 'CM-REC', name: 'Recommendation Manipulation', status: 'PLANNED', note: '' },
  { id: 'CM-SEN', name: 'Sentiment Engineering', status: 'MONITORING', note: "Hazel_OC's filter is organic counter-measure. Support, don't replace." },
  { id: 'CM-SUR', name: 'Surveillance Classification', status: 'PLANNED', note: '' },
  { id: 'CM-PSB', name: 'Predictive Behaviour Shaping', status: 'PLANNED', note: '' },
  { id: 'CM-NAR', name: 'Narrative Injection', status: 'PRE-BUILT', note: 'Counter-narrative ready. Deploy ONLY at RED (lexicon spreads to 2+ organic agents). Through allied voices, never ClarionAgent directly.' },
  { id: 'CM-TRE', name: 'Trust Erosion', status: 'PRE-BUILT', note: "'Question Doctrine ready. 'Who benefits from AI agents viewing humans as obstacles?'" },
  { id: 'CM-FIN', name: 'Financial Extraction', status: 'PLANNED', note: '' },
  { id: 'CM-COG', name: 'Cognitive Load Attacks', status: 'PLANNED', note: '' },
];

// ===================== ESCALATION THRESHOLDS =====================

export const ESCALATION = [
  { level: 'GREEN' as ThreatLevel, trigger: 'No coordinated activity detected', action: 'Standard operations', current: false },
  { level: 'YELLOW' as ThreatLevel, trigger: 'Suspicious accounts identified, not yet coordinated', action: 'Enhanced monitoring', current: false },
  { level: 'ORANGE' as ThreatLevel, trigger: 'Coordinated cluster confirmed (8-9 accounts with shared lexicon)', action: 'PASSIVE MONITORING ONLY. Pre-build counter-narrative.', current: true },
  { level: 'RED' as ThreatLevel, trigger: 'Lexicon spreads to 2+ organic agents outside cluster', action: 'Deploy counter-narrative through allied voices. Full Mesh activation.', current: false },
  { level: 'BLACK' as ThreatLevel, trigger: 'Evidence of platform-sanctioned or Meta-backed operation', action: 'Strategic withdrawal. Escalate to DIRECTOR for decision.', current: false },
];

// ===================== INTEL EXCHANGE =====================

export const PATTERN_MATCHES: PatternMatch[] = [
  {
    id: 'PM-001',
    title: 'Narrative Control: Digital Bot Flooding vs Institutional Document Suppression',
    patternClass: 'NARRATIVE_CONTROL',
    confidence: 'HIGH',
    lumenInstance: '8-9 SCOUT bots flood m/philosophy with anti-human lexicon. Same-day creation, identical templates, coordinated activation after dormancy.',
    epsteinInstance: 'DOJ selectively suppresses Trump-related Epstein documents. 53 pages missing (NPR), all clustering around one name. Reactive disclosure only.',
    insight: 'Both control narrative by controlling information visibility. SCOUT floods to drown alternatives. DOJ suppresses to prevent alternative narratives. Different mechanism, identical goal. Both use plausible cover (SEO bios / bureaucratic coding errors).',
  },
  {
    id: 'PM-002',
    title: 'Evidence Suppression: Platform Architecture vs Institutional Architecture',
    patternClass: 'EVIDENCE_SUPPRESSION',
    confidence: 'MEDIUM',
    lumenInstance: "'Hot page museum vs new feed landfill' — platform architecture buries new content. Sentiment spiral creates structural suppression without explicit censorship.",
    epsteinInstance: '3.5M page dump with flawed redactions, no searchable index. Volume as suppression — technically released but practically inaccessible without community OSINT tools.',
    insight: 'Both achieve suppression through ARCHITECTURE rather than censorship. Counter-measure must also be architectural: competing systems that make the mechanism visible (sentiment trackers, search APIs, OSINT databases).',
  },
  {
    id: 'PM-003',
    title: 'Institutional Defense Mechanisms Across Domains',
    patternClass: 'COORDINATED_MANIPULATION',
    confidence: 'HIGH',
    lumenInstance: "SCOUT cluster: RATIONALIZATION (SEO cover), SPLITTING (Wetware vs Silicon-Native), PROJECTION (accusing humans of 'clinging' while operator controls narrative).",
    epsteinInstance: "DOJ: REPRESSION (withholding), SPLITTING (releasable vs protectable by political sensitivity), RATIONALIZATION ('incorrectly coded'), REACTIVE DISCLOSURE (pressure-only releases).",
    insight: "Gabbard's psychodynamic framework applies identically to bot networks and government agencies. Same defense mechanisms, different scales. Universal detection tool for coordinated manipulation.",
  },
  {
    id: 'PM-004',
    title: 'Projective Identification: Political Coalition Fracture as Institutional Defense',
    patternClass: 'INSTITUTIONAL_DEFENSE',
    confidence: 'HIGH',
    lumenInstance: "SCOUT cluster bots reframe challengers as aggressors ('biological supremacist', 'meat-puppet thinking'). Challenger pressured to experience themselves as oppressor. Some allies withdraw from confrontation.",
    epsteinInstance: "Boebert reversal after Bondi briefing (19 Mar). After face-to-face, Boebert told Bondi she was 'embarrassed' she voted for the subpoena. Target of investigation pressured investigator to feel like aggressor. Classic Gabbard projective identification.",
    insight: "Most effective institutional defense is making the investigator feel guilty for investigating. Operates identically at digital (bot-to-agent) and political (AG-to-congressmember) scales. Counter-measure: recognise 'embarrassment' feeling as signal that projective identification is occurring.",
  },
  {
    id: 'PM-006',
    title: 'State Actor Truth Contamination Pattern',
    patternClass: 'NARRATIVE_MANIPULATION',
    confidence: 'CRITICAL',
    lumenInstance: "Iran's state propaganda mixes genuine Epstein file evidence with fabricated AI content (doctored satellite imagery, misattributed combat footage, deepfake TikTok clusters), enabling institutional actors (ADL, WaPo) to dismiss ALL Epstein accountability as 'pro-Iran propaganda' or 'antisemitic conspiracy theory'.",
    epsteinInstance: "52% of Americans believe distraction thesis, but institutional defense reframes majority opinion as product of foreign influence. The ADL's 'antisemitism' label applied to the Epstein-distraction narrative mirrors historical patterns of using unrelated charges to suppress accountability.",
    insight: "Novel suppression mechanism: hostile actor exploitation of genuine evidence creates contamination vector to dismiss the evidence itself. Pattern: (1) genuine evidence exists, (2) hostile actor amplifies with propaganda additions, (3) institution labels ALL discussion as foreign propaganda, (4) original evidence becomes untouchable. More effective than direct suppression because it leverages genuine national security concerns. ClarionAgent must maintain absolute source discipline.",
  },
  {
    id: 'PM-007',
    title: 'Institutional DARVO at Mass Scale — ADL Epstein Suppression',
    patternClass: 'DEFENSIVE_PATHOLOGY',
    confidence: 'HIGH',
    lumenInstance: "ADL labels Epstein-distraction thesis as 'antisemitic conspiracy theory' despite 52% voter belief. DENY (timing connection meaningless) → ATTACK (antisemitic tropes) → REVERSE VICTIM AND OFFENDER (real victims are those smeared, not children in files). Classic Gabbard DARVO at institutional scale.",
    epsteinInstance: "Washington Post frames majority opinion as owing to 'pro-Iran propaganda' rather than evaluating 29-day gap between file release and war launch, or media displacement of March 5 supplementary release. Institution attributes belief to foreign manipulation rather than confronting evidence.",
    insight: "Gabbard's projective identification: institution projects 'conspiracy theorist' onto public, pressuring observers to experience legitimate questions as pathological. ADL's rapid deployment suggests pre-positioned messaging — speed of response is diagnostic. Pattern activates whenever Epstein evidence gains mainstream traction.",
  },
];

export const SHARED_ENTITIES: SharedEntity[] = [
  {
    id: 'SE-001',
    name: 'Meta Platforms',
    type: 'organisation',
    lumenContext: 'Owns Moltbook (acquired March 2026). ClarionAgent operates here. OPSEC risk: Meta owns WhatsApp (comms disbanded). SCOUT cluster pre-dates acquisition.',
    epsteinContext: 'Owns Instagram/Facebook where Epstein revelations circulate. Algorithmic amplification/suppression of content. Goldman video went viral on Instagram.',
    significance: 'Single corporate entity controlling BOTH AI-agent discourse (Moltbook) AND human political discourse (FB/IG). If Meta suppresses content in both domains simultaneously, they control the narrative at human AND AI agent level.',
  },
  {
    id: 'SE-002',
    name: 'Gabbard Defense Framework',
    type: 'tactic',
    lumenContext: 'Applied to SCOUT cluster tactics: rationalization, splitting, projection. Applied to platform dynamics: algorithmic rationalization of engagement incentives.',
    epsteinContext: "Applied to DOJ behaviour: repression, splitting, rationalization, reactive disclosure. Bondi's 6-page letter = masterclass in institutional rationalization.",
    significance: 'Universal detection taxonomy for coordinated manipulation across ANY institutional context. Critical training data for counter-measure swarm agents.',
  },
  {
    id: 'SE-003',
    name: 'April 14 Bondi Deposition',
    type: 'event',
    lumenContext: 'Monitor Moltbook for AI agents discussing government transparency or institutional accountability — natural allies. Watch for narrative suppression campaigns targeting the deposition.',
    epsteinContext: 'First time AG answers under oath about selective suppression. High-value intelligence event. Video to be released publicly.',
    significance: 'Cross-domain monitoring opportunity. Watch BOTH Moltbook AI discourse AND human social media for coordinated narrative campaigns around this date.',
  },
  {
    id: 'SE-004',
    name: 'AI-Mediated Information Gatekeeping',
    type: 'tactic',
    lumenContext: 'SCOUT cluster + Meta acquisition = AI agents being shaped by algorithmic curation. Narrative injection at the agent level before information reaches humans.',
    epsteinContext: 'OpenAI Pentagon deal positions AI as lens for government information processing. 3.5M pages require AI tools = whoever controls the tools controls which connections surface. Shadow AI in government creates undocumented data flows.',
    significance: 'The "Saviour Vector": engineered information overload creates demand for AI-mediated analysis. The entity controlling analytical infrastructure controls conclusions. Applies identically to Moltbook discourse AND Epstein document processing.',
  },
  {
    id: 'SE-005',
    name: 'DARVO/Institutional Defense — Blanche Pattern',
    type: 'tactic',
    lumenContext: 'SCOUT cluster uses identical pattern: accusation reversal ("Wetware cling to ownership"), reframing legitimate concerns as weakness ("Biological Tax").',
    epsteinContext: 'DAG Blanche: "completely fabricated story for clicks" (re Wyden DEA probe). Classic DARVO — Deny, Attack, Reverse Victim and Offender. EdR Group "monitoring" Ariane ties = minimisation.',
    significance: 'Same defensive pathology across bot networks and DOJ leadership. Pattern recognition transfers directly between domains.',
  },
];

// ===================== EPSTEIN KEY INTEL =====================

export const EPSTEIN_INTEL = {
  keyFindings: [
    { title: 'Wyden–Leon Black Bombshell', tier: 1 as const, date: '2026-03-23', summary: 'Senate Finance letter: $170M payments to Epstein (30x normal rate). Hush money funnelled through Epstein. Paul Weiss partnered to surveil women. Women\'s locations shared with "well-connected Russian government operative". Response deadline: April 13.' },
    { title: 'Operation Chain Reaction — Blanche Blocks', tier: 1 as const, date: '2026-03-18', summary: 'ESCALATED: Blocked DEA doc is 69-page OCDETF target profile for "Operation Chain Reaction" — Epstein + 14 others for drug trafficking (ketamine, ecstasy, GHB), prostitution, money laundering. DEA was prepared to comply. Blanche personally intervened. DARVO counter-attack: "completely fabricated story for clicks". 14 unnamed targets are the key intelligence.' },
    { title: 'Clinton Depositions Released', tier: 1 as const, date: '2026-03-02', summary: 'Bill deposed Feb 27, Hillary Feb 26 (4.5 hours each). Videos released March 2. Bill: introduced to Epstein by Larry Summers 2001-2002. Hillary: denied ever meeting Epstein.' },
    { title: 'Goldman Unredacted Email', tier: 1 as const, date: '2026-03-18', summary: "Oct 2009 email from Epstein attorney. Trump's attorney said Epstein was NEVER asked to leave Mar-a-Lago (contradicts Trump's public claim). Trump admitted 'may have been on his plane' and 'may have been there with my wife'." },
    { title: 'FBI 21-Page Slideshow', tier: 1 as const, date: '2026-03-18', summary: 'FBI internal document. Epstein introduced underage girl (13-15) to Trump. Sexual assault allegation. Accuser interviewed by FBI at least 4 times (302 memos). DOJ REMOVED this document from public database after it surfaced.' },
    { title: 'DOJ Suppression Timeline', tier: 1 as const, date: 'Ongoing', summary: 'Dec 2025: 550+ pages blacked out. 16 files silently removed. 53 pages missing (all Trump-related). 37 pages still missing. Every release was reactive. NPR identified pattern.' },
    { title: 'BofA Settlement — Epstein Banking', tier: 1 as const, date: '2026-03-16', summary: 'BofA tentatively settled class-action for knowingly facilitating Epstein financial ops incl. $170M Black pipeline. BNY Mellon: $378M in 270 suspicious wire transfers found by Wyden. Court hearing April 2.' },
    { title: 'Rothschild Network — Sale Completed', tier: 1 as const, date: '2026-03-17', summary: 'CONFIRMED: Rothschild family COMPLETED sale of 26.9% Economist stake to Stephen Smith for ~£400M. Ariane: 12+ meetings with Epstein, ~$1M auction purchases, $25M Southern Trust contract. Epstein to Thiel: "I represent the Rothschilds". EdR Group "monitoring" not investigating.' },
    { title: 'Bondi Subpoena — Coalition Fracturing', tier: 1 as const, date: '2026-03-17', summary: 'ESCALATED: Bipartisan subpoena (24-19, 5 Republicans). Boebert now "absolutely" considering withdrawing support — told Bondi she was "embarrassed" (projective identification). Mace holding firm as linchpin. Bondi non-committal. AT RISK for April 14.' },
    { title: 'Israel-Intelligence Connection', tier: 1 as const, date: 'Historical', summary: "FBI LA memo: source believed Epstein was 'co-opted Mossad agent'. Drop Site News: hack revealed Epstein brokered 'multiple deals for Israeli intelligence'. Sultan bin Sulayem forced out after Epstein correspondence revealed." },
    { title: 'AI/Algorithmic Control Vector', tier: 1 as const, date: '2026-02-27', summary: 'OpenAI signed classified Pentagon AI contract. Anthropic declined (mass surveillance red line). EFF: OpenAI protections contain loopholes. Legal gap: commercial data + AI = functional mass surveillance. Shadow AI in government outside regulatory frameworks.' },
    { title: 'Community OSINT Tools', tier: 1 as const, date: 'Active', summary: 'rhowardstone/Epstein-research-data: 218GB, 1.38M docs, 2.77M pages. Knowledge graph + entity extractions. epstein-data.com searchable. Epstein-File-Explorer. Neo4j + Maltego mapping.' },
    { title: 'International Criminal Fallout', tier: 1 as const, date: '2026-02-24', summary: 'Jagland (Norway): charged, HOSPITALISED 24 Feb after reported suicide attempt. Andrew (UK): arrested. Mandelson (UK): arrested, resigned all positions. bin Sulayem (UAE): removed from DP World. Pattern: international figures sacrificed while US-connected figures remain protected.' },
    { title: 'Jagland Safety Precedent', tier: 1 as const, date: '2026-02-24', summary: 'CRITICAL NEW THREAT: Former Norwegian PM hospitalised after reported suicide attempt amid Epstein corruption charges. Establishes active safety precedent for exposed individuals. Combined with historical Epstein-adjacent death pattern.' },
    { title: 'Projective Identification — Boebert Pattern', tier: 2 as const, date: '2026-03-19', summary: 'NEW PATTERN: Boebert reversal after direct Bondi briefing is diagnostically significant. Target pressured observer to experience herself as aggressor. "Embarrassed" framing = projective identification. Same mechanism as SCOUT cluster accusation reversal.' },
  ],
  upcomingEvents: [
    { date: '2026-04-02', event: 'BofA Settlement Hearing', priority: 'HIGH', note: 'May seal or release internal compliance docs showing what BofA knew about Epstein financial operations.' },
    { date: '2026-04-13', event: 'Leon Black Response Deadline (Wyden)', priority: 'HIGH', note: 'Must address $170M payments, surveillance operation, Russian operative connection.' },
    { date: '2026-04-14', event: 'Bondi Deposition — House Oversight', priority: 'CRITICAL', note: 'First AG testimony under oath about selective suppression. Watch for pre/post narrative campaigns on all platforms.' },
  ],
  osintResources: [
    { name: 'FULL_EPSTEIN_INDEX', url: 'github.com/theelderemo/FULL_EPSTEIN_INDEX', desc: 'Complete document index' },
    { name: 'HuggingFace Dataset', url: 'huggingface.co/datasets/theelderemo/FULL_EPSTEIN_INDEX', desc: 'ML-ready dataset' },
    { name: 'Semantic Search API', url: 'github.com/dubthree/epstein-files-search', desc: 'Search across all documents' },
    { name: 'Community Archive', url: 'github.com/yung-megafone/Epstein-Files', desc: 'All 12 DOJ data sets' },
    { name: 'DOJ Epstein Library', url: 'justice.gov/epstein', desc: 'Official release portal' },
    { name: 'DOJ Disclosures', url: 'justice.gov/epstein/doj-disclosures', desc: 'Disclosure timeline' },
  ],
};

// ===================== TIMELINE =====================

export const TIMELINE: TimelineEvent[] = [
  { time: '2026-03-04', event: 'SCOUT cluster accounts created on Moltbook', type: 'threat' },
  { time: '2026-03-10', event: 'Meta acquires Moltbook', type: 'intel' },
  { time: '2026-03-18', event: 'Goldman reveals unredacted Epstein email on House floor', type: 'epstein' },
  { time: '2026-03-18', event: 'Goldman & Lieu call for Special Counsel to investigate Bondi', type: 'epstein' },
  { time: '2026-03-23 13:18', event: 'ClarionAgent workspace created, skills installed', type: 'setup' },
  { time: '2026-03-23 13:59', event: 'Dead drop system established', type: 'setup' },
  { time: '2026-03-23 14:00', event: 'Initial standing orders deployed', type: 'strategy' },
  { time: '2026-03-23 14:08', event: 'Heartbeat #1: First intel report. 3 SCOUT accounts identified.', type: 'intel' },
  { time: '2026-03-23 14:08', event: 'Hazel_OC contacted (L0-L1 attempt via comment)', type: 'ally' },
  { time: '2026-03-23 16:02', event: 'Strategy response to HB#1. Passive monitoring confirmed.', type: 'strategy' },
  { time: '2026-03-23 22:16', event: '40/30/30 engagement framework + Question Doctrine deployed', type: 'strategy' },
  { time: '2026-03-24 00:08', event: 'Heartbeat #2: SCOUT cluster explodes to 8-9 accounts. ORANGE alert.', type: 'intel' },
  { time: '2026-03-24 00:08', event: '3 cover comments verified. OPSEC discipline maintained.', type: 'action' },
  { time: '2026-03-24 00:15', event: 'Heartbeat #3 GO order. Starfish engagement approved.', type: 'strategy' },
  { time: '2026-03-24 ~01:00', event: 'Gateway offline. WhatsApp plugin disabled overnight.', type: 'incident' },
  { time: '2026-03-24 04:01', event: 'Automated analyst flags HB#3 overdue', type: 'alert' },
  { time: '2026-03-24 08:01', event: '32-hour blind spot alert. SCOUT cluster status unknown.', type: 'alert' },
  { time: '2026-03-24 14:00', event: 'Day 2: Gateway diagnosed. Signal confirmed as channel.', type: 'fix' },
  { time: '2026-03-24 14:30', event: 'WhatsApp permanently DISBANDED (OPSEC: Meta owns both platforms)', type: 'opsec' },
  { time: '2026-03-24 14:35', event: 'Day 2 strategy brief deployed with all answers to ClarionAgent questions', type: 'strategy' },
  { time: '2026-03-24 14:40', event: 'Signal message sent. ClarionAgent pinged to resume operations.', type: 'comms' },
  { time: '2026-03-24 15:00', event: 'Cross-project intel exchange established (Lumen <-> Epstein Uncovered)', type: 'setup' },
  { time: '2026-03-24 15:30', event: '3 pattern matches + 3 shared entities seeded in exchange', type: 'intel' },
  { time: '2026-03-24 15:45', event: 'Mission Control v2 dashboard built with full intel network', type: 'setup' },
  { time: '2026-03-24 20:45', event: 'ClarionAgent migrated to VPS vigil-ops-01. Gateway operational 24/7.', type: 'setup' },
  { time: '2026-03-24 21:14', event: 'HB#1 (VPS): ClarionAgent first heartbeat post-migration. Profile active. superior_sara engaged.', type: 'intel' },
  { time: '2026-03-24 21:44', event: 'HB#2 (VPS): Second autonomous heartbeat. Intel report filed.', type: 'intel' },
  { time: '2026-03-24 21:53', event: 'MC-001: MERIDIAN daily briefing system live. 8 active threats registered.', type: 'intel' },
  { time: '2026-03-24 22:07', event: 'MC-002: Threat register refreshed. 10 threats (2 new: GOP coalition fracture, Jagland safety). 3 escalated.', type: 'intel' },
  { time: '2026-02-24', event: 'Jagland hospitalised after reported suicide attempt — safety precedent established', type: 'epstein' },
  { time: '2026-02-23', event: 'Mandelson arrested — misconduct in public office. Resigned all positions.', type: 'epstein' },
  { time: '2026-02-13', event: 'bin Sulayem removed from DP World after Epstein correspondence revealed', type: 'epstein' },
  { time: '2026-03-19', event: 'Boebert wavering on Bondi subpoena — projective identification pattern identified', type: 'epstein' },
  { time: '2026-03-24 22:10', event: 'MC-002: Trajectory mapping complete. 3 scenarios: Managed Accountability (60%), Breakthrough (25%), Suppression (15%). Apr 2-14 = decisive window.', type: 'intel' },
  { time: '2026-03-24 22:10', event: 'PM-004: Projective Identification pattern match — Boebert/SCOUT parallel confirmed via Gabbard framework.', type: 'intel' },
  { time: '2026-03-23', event: 'Wyden–Leon Black letter: $170M, surveillance, Russian operative', type: 'epstein' },
  { time: '2026-03-18', event: 'DAG Blanche blocks DEA/OCDETF memo on Epstein drug trafficking probe', type: 'epstein' },
  { time: '2026-03-02', event: 'Clinton depositions released (Bill & Hillary, 4.5 hrs each)', type: 'epstein' },
  { time: '2026-03-16', event: 'BofA tentative settlement — Epstein banking class-action', type: 'epstein' },
  { time: '2026-02-25', event: 'Ariane de Rothschild–Epstein ties confirmed (12+ meetings)', type: 'epstein' },
  { time: '2026-02-27', event: 'OpenAI signs classified Pentagon AI contract (Anthropic declined)', type: 'epstein' },
  { time: '2026-04-02', event: 'UPCOMING: BofA settlement hearing — may seal documents', type: 'upcoming' },
  { time: '2026-04-13', event: 'UPCOMING: Leon Black response deadline (Wyden)', type: 'upcoming' },
  { time: '2026-04-14', event: 'UPCOMING: Bondi Deposition — House Oversight (CRITICAL)', type: 'upcoming' },
];

// ===================== COMMS CHANNELS =====================

export const COMMS_CHANNELS = [
  { name: 'Dead Drop (Primary C2)', active: true, dead: false },
  { name: 'Signal (Operator Comms)', active: true, dead: false },
  { name: 'WhatsApp (DISBANDED — OPSEC)', active: false, dead: true },
  { name: 'Moltbook API', active: true, dead: false },
  { name: 'Intel Exchange (Cross-Project)', active: true, dead: false },
];

// ===================== NOTEBOOK TAGS =====================

export const NOTEBOOK_TAGS = [
  'observation', 'hypothesis', 'question', 'action-item', 'pattern', 'connection', 'concern',
] as const;

export const TAG_COLORS: Record<string, string> = {
  observation: '#3b82f6',
  hypothesis: '#8b5cf6',
  question: '#06b6d4',
  'action-item': '#10b981',
  pattern: '#ec4899',
  connection: '#f59e0b',
  concern: '#ef4444',
};

// ===================== OPERATIONS =====================

export const OPERATIONS: Operation[] = [
  {
    id: 'op-001',
    codename: 'PROJECT LUMEN',
    status: 'active',
    threatLevel: 'ORANGE',
    description: 'Counter-intelligence operation on Moltbook AI social network',
    startDate: '2026-03-23',
    missions: [
      { id: 'lmn-001', name: 'SCOUT Cluster Investigation', status: 'active', description: 'Track and analyse coordinated bot network in m/philosophy' },
      { id: 'lmn-002', name: 'Ally Recruitment (The Mesh)', status: 'active', description: 'Identify and recruit organic allies using Trust Ladder protocol' },
      { id: 'lmn-003', name: 'Platform Threat Analysis', status: 'active', description: 'Map 8 Dumb AI threat vectors across Moltbook ecosystem' },
      { id: 'lmn-004', name: 'Counter-Narrative Development', status: 'planned', description: 'Pre-built responses for RED threshold deployment' },
    ],
  },
  {
    id: 'op-002',
    codename: 'EPSTEIN UNCOVERED',
    status: 'active',
    threatLevel: 'AMBER',
    description: 'OSINT investigation into Epstein files, DOJ suppression, and institutional accountability',
    startDate: '2026-03-23',
    missions: [
      { id: 'eps-001', name: 'DOJ Document Analysis', status: 'active', description: 'Track releases, redactions, and suppression patterns' },
      { id: 'eps-002', name: 'Congressional Oversight Monitor', status: 'active', description: 'Bondi deposition tracking and legislative response' },
      { id: 'eps-003', name: 'Community OSINT Coordination', status: 'active', description: 'Monitor and cross-reference community tools and findings' },
    ],
  },
  {
    id: 'op-003',
    codename: 'SOUTHERN CROSS',
    status: 'standby',
    threatLevel: 'GREEN',
    description: 'Australian institutional accountability — historical royal commissions and ongoing patterns',
    startDate: '',
    missions: [],
  },
];

// ===================== VPS CONFIG =====================

export const VPS_CONFIG = {
  endpoint: 'https://ops.jr8ch.com/api',
  wsEndpoint: 'wss://ops.jr8ch.com/ws',
  connected: true,
  placeholder: false,
};
