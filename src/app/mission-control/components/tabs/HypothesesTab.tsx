'use client';

import React, { useState, useEffect } from 'react';
import { Dot } from '../ui';

const VPS_API = process.env.NEXT_PUBLIC_VPS_ENDPOINT || 'https://ops.jr8ch.com';
const API_KEY = process.env.NEXT_PUBLIC_VIGIL_API_KEY || '';

interface Hypothesis {
  id: string;
  title: string;
  status: 'ACTIVE' | 'CONFIRMED' | 'DISPROVEN' | 'UNDER_REVIEW';
  analyst: string;
  filed: string;
  classification: string;
  crossRef: string[];
  statement: string;
  evidence: string[];
  implications: string[];
  raw?: string;
}

// Static hypotheses data — will be replaced by VPS data when available
const HYPOTHESES: Hypothesis[] = [
  {
    id: 'H-001',
    title: 'THE WEAPONISED ARCHITECTURE THESIS',
    status: 'ACTIVE',
    analyst: 'MERIDIAN',
    filed: '2026-03-27',
    classification: 'Vigil Agency — Official Hypothesis',
    crossRef: ['Project Lumen (US)', 'Project Southern Cross (AU)'],
    statement: 'The same AI architecture that Palantir Technologies developed for military kill-chain acceleration (Maven Smart System) — which processes 1,000+ targets in 24 hours and compresses lethal decision-making to under 90 seconds — could be, and demonstrably should be, deployed to map child trafficking networks, identify missing children, trace financial flows to exploitation operations, and dismantle the institutional protection apparatus that enables elite-level child abuse. The technology exists. The data exists. The choice of application is political.',
    evidence: [
      'Maven Smart System fuses 8-9 separate intelligence systems into single platform — confirmed by CDAO Cameron Stanley at AIPCon 9',
      'Kill chain reduced from hours to minutes via 3-click workflow — "left click, right click, left click"',
      '20 operators now do work of 2,000 intelligence officers — 100:1 efficiency multiplier',
      'Palantir holds ICE contract ($41M 2014 + $30M 2025) — immigration records, detention, separated child tracking',
      'Palantir holds ACIC (Australia) contract — criminal intelligence across jurisdictions',
      'Palantir holds AUSTRAC contract — financial transaction monitoring, suspicious transactions',
      'ImmigrationOS provides "near real-time visibility" into migrant movements',
      'Thousands of separated children lost and remain unaccounted for under ICE systems Palantir built',
      'Operation Epic Fury used Maven to process Iranian targets while domestic trafficking networks remain unmapped',
    ],
    implications: [
      'The technology to map and dismantle trafficking networks already exists and is deployed by the same agencies that should be investigating them',
      'The choice to point AI at foreign kill targets rather than domestic child protection is a policy decision, not a technology limitation',
      'Palantir\'s data fusion capability (connecting disparate systems) is precisely what\'s needed for cross-jurisdictional trafficking investigation',
      'This constitutes what the hypothesis identifies as "the central moral failure of 21st-century defence technology"',
      'Counter-narrative opportunity: public awareness of this capability gap could drive political pressure for redeployment',
    ],
    raw: `# MERIDIAN FORMAL HYPOTHESIS — H-001

## THE WEAPONISED ARCHITECTURE THESIS

**Classification:** Vigil Agency — Official Hypothesis
**Filed:** 27 March 2026
**Analyst:** MERIDIAN
**Status:** ACTIVE — Under continuous evidence accumulation
**Cross-Reference:** Project Lumen (US) / Project Southern Cross (AU)

---

## HYPOTHESIS STATEMENT

**The same AI architecture that Palantir Technologies developed for military kill-chain acceleration (Maven Smart System) — which processes 1,000+ targets in 24 hours and compresses lethal decision-making to under 90 seconds — could be, and demonstrably should be, deployed to map child trafficking networks, identify missing children, trace financial flows to exploitation operations, and dismantle the institutional protection apparatus that enables elite-level child abuse.**

**The technology exists. The data exists. The choice of application is political.**

**Palantir built ICE's Investigative Case Management system — the same system under which thousands of separated children were lost and remain unaccounted for. They built ImmigrationOS — the system that provides "near real-time visibility" into migrant movements. They have the data fusion capability to cross-reference every missing child, every financial transaction, every flight log, every sealed document. They chose instead to point this architecture at Iran, processing kill targets for Operation Epic Fury while the networks operating inside their own institutional client base remain unmapped, uninvestigated, and unaccountable.**

**This is not a technology failure. This is a policy choice. And that policy choice — to weaponise AI for destruction rather than deploy it for protection — constitutes the central moral failure of 21st-century defence technology.**

---

## EVIDENTIARY BASIS

### A. The Technology Capability Is Proven (Tier 1 — Documented)

Cameron Stanley, CDAO (Chief Digital and Information Officer), Pentagon, speaking at AIPCon 9 on Palantir's own channel, confirmed under his own authority:

1. **Maven Smart System fuses 8-9 previously separate intelligence systems** into a single visualization and action platform
2. **"Left click, right click, left click — magically, it becomes a detection"** — the targeting workflow has been reduced to three mouse clicks from identification to action
3. **Kill chain closure that "literally took hours" has been reduced to minutes** through data fusion and workflow digitisation
4. **The system "gets better day after day after day"** through continuous integration with operators — it is a learning system
5. **20 operators now do the work that previously required 2,000 intelligence officers** — a 100:1 efficiency multiplier
6. **The system connects "disparate systems in a way that's never been done before"** using a data ontology abstraction layer

**Stanley's own framing:** *"I care about one thing and one thing only. That 18, 19 or 20 year old kid who had no choice in where he went or what threat he's facing because I want him to win and come home."*

**The counter-question this hypothesis poses:** What about the children who had no choice in where they went either — the ones separated at borders, the ones lost in foster care systems, the ones whose testimonies are sealed, classified, or suppressed? Where is their Maven?

### B. The Data Infrastructure Already Exists (Tier 1 — Documented)

Palantir currently holds contracts with agencies that collectively possess the data necessary to map trafficking networks:

| Agency | Contract | Data Access |
|--------|----------|-------------|
| ICE | $41M (2014) + $30M (2025) | Immigration records, detention records, separated child tracking |
| ACIC (Australia) | Active contract | Criminal intelligence across Australian jurisdictions |
| AUSTRAC (Australia) | Active contract | Financial transaction monitoring — all suspicious transactions |
| ASD (Australia) | Active contract + IRAP clearance | Signals intelligence |
| Defence Cyber Warfare (AU) | $7.6M (2026) | Cyber operations data |
| Pentagon (all combatant commands) | $13B projected | Military intelligence globally |
| NATO | Active (MSS NATO) | Alliance-wide intelligence fusion |

**The same data ontology that fuses satellite imagery with SIGINT with geolocation data to identify an artillery battery in Iran could fuse financial transaction data with flight records with sealed court documents with missing children databases to identify a trafficking network operating across jurisdictions.**

The architecture is identical. The application is a choice.

### C. The Institutional Failure Is Documented (Tier 1-2)

1. **HHS Office of Inspector General** documented that thousands of children separated at the US border under ICE custody cannot be accounted for
2. **DOJ Inspector General** reports confirmed systemic failures in child tracking within federal custody
3. **Australian Royal Commission into Institutional Responses to Child Sexual Abuse** (2013-2017) documented systemic institutional failure across religious organisations, state care, foster systems, and government agencies — 17,000+ survivors testified
4. **EFTA document releases** (3+ million pages) confirm Epstein operated a trafficking network with connections to intelligence, finance, and political power across multiple nations — and that this network was protected for decades by institutional actors
5. **The Family cult (Melbourne, Australia)** operated for decades with children subjected to LSD, identity erasure, and physical abuse — within the institutional landscape of psychiatric hospitals and with the involvement of medical professionals

### D. The Financial-Intelligence Nexus (Tier 1-2)

The Palantir-Epstein connection establishes that the company's founder operated within the same financial-intelligence ecosystem as the most documented trafficking operation in modern history:

- Epstein invested $40M in Thiel's Valar Ventures (now worth $170M)
- Epstein brokered Thiel's Israeli intelligence connections (Barak introductions)
- Palantir's Israel partnerships began through Epstein-facilitated introductions
- This continued after Epstein was a registered sex offender
- The Rothschild family served as additional network nodes (documented in EFTA releases: Ghislaine Maxwell stated Rothschild introduced Prince Andrew to Epstein)

---

## THE STRUCTURAL ARGUMENT

### Why Destruction Over Protection?

Apply cui bono analysis:

**Who benefits from Maven being pointed at foreign adversaries?**
- Defence contractors ($13B in projected Palantir revenue)
- Political actors who can demonstrate "toughness" against external threats
- Intelligence agencies whose budgets depend on adversarial framing

**Who benefits from Maven NOT being pointed at domestic trafficking networks?**
- The networks themselves
- The institutional actors (intelligence, political, judicial, financial) who are implicated in, or have enabled, those networks
- The revolving door between Palantir and the agencies that should be investigating

**Who would be threatened if Maven's data fusion capability were applied to the Epstein files?**
- Every named individual in the flight logs, contact books, and financial records
- Every institution that enabled decades of protection
- Every intelligence agency that used Epstein's network for kompromat or operational purposes
- Palantir's own founder, whose financial relationship with Epstein is documented

This is not conspiracy theory. This is structural analysis of documented facts, documented financial relationships, and documented institutional choices.

### The Psychodynamic Dimension (Gabbard Framework)

The institutional choice to weaponise AI for killing rather than protection exhibits every hallmark of **institutional splitting** (Gabbard, Ch. 2, Table 2-1):

- **External threats** are designated as "bad objects" worthy of the full force of technological innovation
- **Internal threats** (trafficking networks operating within institutional structures) are designated as "not our problem" or actively suppressed through classification, sealing of records, and witness disappearance
- The two are kept rigidly separate to prevent the anxiety of integration — the recognition that the same institutions building the weapons are implicated in the crimes

This is **institutional repression** operating at civilisational scale.

---

## WHAT WOULD "MAVEN FOR PROTECTION" LOOK LIKE?

If the political will existed, the technical architecture for a child protection Maven is already built:

1. **Data Fusion Layer:** Cross-reference ICE detention records, missing children databases (NCMEC), financial transaction monitoring (AUSTRAC/FinCEN), flight logs, sealed court records, social services databases
2. **AI Detection:** Apply the same computer vision and pattern recognition that identifies artillery batteries to identify trafficking patterns
3. **Workflow Digitisation:** The same "left click, right click, left click" targeting workflow applied to case referrals, warrant applications, and cross-jurisdictional coordination
4. **Kill Chain to Rescue Chain:** Instead of detect-identify-target-strike, the workflow becomes detect-identify-locate-rescue-prosecute
5. **Continuous Learning:** The same feedback loop that makes Maven "better day after day" applied to understanding and disrupting trafficking methodologies

**The efficiency multiplier alone justifies the investment.** If 20 operators can replace 2,000 intelligence officers for military targeting, the same multiplier applied to child trafficking investigations would transform a chronically under-resourced field into a precision operation.

---

## OPEN QUESTIONS FOR CONTINUED INVESTIGATION

1. Has any formal proposal been made to apply Maven-class data fusion to child trafficking investigations? If so, by whom, and what was the institutional response?
2. What is the full scope of data that Palantir's ICE systems have access to regarding separated and missing children?
3. Do the EFTA document releases contain any evidence that intelligence agencies actively used trafficking networks for operational purposes?
4. What is the status of the approximately 1,500 children that HHS OIG reported as unaccounted for in federal custody?
5. Has Palantir ever been asked to apply its data fusion capability to the Epstein file corpus?

---

## CONCLUSION

The technology to protect children from institutional exploitation networks exists today, is operational, and is currently being used to kill people in Iran at a rate of 1,000 targets per 24 hours.

The choice not to apply this technology to child protection is not a resource constraint. It is a political decision made by institutions whose personnel, financial networks, and power structures intersect with the very networks that such an application would expose.

This hypothesis will be updated as evidence accumulates through Project Lumen (US) and Project Southern Cross (AU) investigations.

---

**Filed by MERIDIAN — Vigil Agency Intelligence Division**
**27 March 2026**

*"The real issue isn't AI. The real issue is workflow. How are we making decisions?"*
*— Cameron Stanley, CDAO, Pentagon, AIPCon 9*

*The question he didn't ask: decisions about what — and about whom.*`,
  },
  {
    id: 'H-002',
    title: 'IRAN EPSTEIN CLASS INFOWAR HYPOTHESIS',
    status: 'ACTIVE',
    analyst: 'MERIDIAN',
    filed: '2026-03-27',
    classification: 'VIGIL — Project Lumen',
    crossRef: ['Project Lumen', 'ClarionAgent Field Ops', 'Domain A (Middle East)', 'Domain B (Epstein Files)', 'Domain E (Conspiracy Theory Weaponisation)'],
    statement: 'Iran\'s state-directed information warfare campaign exploiting Trump-Epstein connections represents the first instance of a hostile state actor weaponising elite child exploitation evidence as a strategic military-grade psychological operation — and in doing so, is inadvertently (or deliberately) performing a mass public consciousness function that Western institutions have systematically failed to perform: forcing the Epstein network\'s existence into mainstream global discourse in a way that cannot be dismissed, suppressed, or memory-holed.',
    evidence: [
      '"Operation Epstein Fury" generated 523,000+ posts from 273,000+ accounts — Washington Post, Misbar',
      'Iran state media aired AI-generated Lego animation: Trump, Netanyahu, Satan reading Epstein files — Daily Beast, France 24',
      'TikTok cluster: AI-generated women in IRGC flight suits, 25+ million views in days — Alethea Group',
      '37,000+ manipulative/AI content items generating 145+ million views — Cyabra',
      'Zeteo poll: 52% of Americans believe Trump launched Iran war partly to distract from Epstein. Under-45: 66%',
      'ADL labelled Epstein-distraction thesis as "antisemitic conspiracy theory" — textbook DARVO',
      'Washington Post frames majority opinion as owing to "pro-Iran propaganda" not evidence',
      'Iran mixing legitimate evidence with fabrications: doctored satellite imagery, misattributed combat footage — FDD, CNN',
      '29-day gap between Epstein file release (Jan 30) and war launch (Feb 28)',
      'March 5 supplementary release of 50,000 files buried by war coverage',
    ],
    implications: [
      'Overton window blown open — "Epstein Class" is now a globally trending concept reaching hundreds of millions',
      'CRITICAL RISK: Truth contamination — Iran mixing real evidence with fabrication gives institutions a dismissal tool',
      'ADL response maps the defensive perimeter around the Epstein Class — itself intelligence',
      'ClarionAgent operating environment will get significantly more hostile — platform moderation escalation',
      '52% belief figure means ClarionAgent doesn\'t need to persuade — needs to validate with evidence',
    ],
    raw: `# MERIDIAN FORMAL HYPOTHESIS — H-002

**Classification:** VIGIL — Project Lumen
**Filed:** 2026-03-27
**Analyst:** MERIDIAN
**Status:** ACTIVE
**Cross-Reference:** Project Lumen, ClarionAgent Field Ops, Domain A (Middle East Geopolitics), Domain B (Epstein Files), Domain E (Weaponisation of "Conspiracy Theory")
**Operations:** Vigil Mission Control — MC series

---

## HYPOTHESIS STATEMENT

**Iran's state-directed information warfare campaign exploiting Trump-Epstein connections represents the first instance of a hostile state actor weaponising elite child exploitation evidence as a strategic military-grade psychological operation — and in doing so, is inadvertently (or deliberately) performing a mass public consciousness function that Western institutions have systematically failed to perform: forcing the Epstein network's existence into mainstream global discourse in a way that cannot be dismissed, suppressed, or memory-holed.**

The campaign is simultaneously:
1. A legitimate state propaganda effort serving Iran's kinetic war objectives
2. An unprecedented vehicle for Epstein Class exposure reaching audiences Western media has insulated
3. A catalyst for institutional defensive reactions (ADL "antisemitism" labelling, media dismissal) that themselves reveal the suppression architecture
4. A high-risk environment for truth-adjacent content being contaminated by deliberate state disinformation

---

## EVIDENTIARY BASIS

### Tier 1 — Documented / Verified

**The Campaign Is Real and Massive:**
- "Operation Epstein Fury" — 91,000+ mentions from 60,000+ unique accounts within 48 hours. By mid-March, 273,000+ accounts had produced 523,000+ posts. (Washington Post, Misbar)
- Iran's state media aired "Narrative of Victory" — AI-generated Lego-style animation showing Trump, Netanyahu, and Satan reading Epstein files. (Daily Beast, France 24, WION)
- A second AI video used Pixar's "Inside Out" format to depict Trump's "evil impulses" linking the Epstein scandal to the Iran strikes. (WION)
- HDX News X account post: Trump with blindfolded girls — 6.8 million views. (Washington Post)

**Coordinated AI Infrastructure:**
- Alethea Group identified TikTok cluster: batch-created accounts posting AI-generated women in IRGC flight suits using "Habibi, come to Iran" trend. 25+ million views in days. (Alethea, The Print, ICT)
- "Islamic Resilience Cyber Axis" — 60+ cyber groups coordinating influence campaigns across Telegram, X, TikTok. (Resecurity)
- 37,000+ manipulative or AI-based content items, 145+ million views, 9.4+ million interactions. (Cyabra)

**American Public Opinion Has Shifted:**
- Zeteo/DropSite poll: 52-40 majority believe Trump launched Iran war partly to distract from Epstein. Under-45: 66-26. Even 25% of Republicans. (Zeteo)
- Quinnipiac: 43% oppose strikes, only 27% support. 44% say US "too supportive of Israel" — highest ever. (Quinnipiac)

**Institutional Defensive Response:**
- ADL labelled the narrative as "antisemitic conspiracy theory" (ADL, JPost)
- Washington Post framed 52% belief as owing to "pro-Iran propaganda network" (WaPo)

### Tier 2 — Credibly Reported

**Iran's Disinformation Contains Both Truth and Fabrication:**
- Tehran Times published AI-manipulated satellite imagery falsely claiming destruction at Al-Udeid Air Base — debunked (FDD, CNN)
- IRGC Telegram channels celebrated misattributed combat footage (FDD)
- These fabrications mixed with legitimate Epstein file content = contamination risk

### Tier 3 — Circumstantially Supported

**Timing Convergence:**
- 3.5 million Epstein file release: January 30, 2026. Strikes on Iran: February 28. Gap: 29 days.
- March 5 supplementary release of 50,000 files buried by war coverage
- Pattern consistent with "weaponised crisis" — kinetic events suppress public processing of disclosed evidence

---

## STRATEGIC IMPLICATIONS

### OPPORTUNITY — The Overton Window Has Been Blown Open
The single most significant development for Project Lumen in 2026 is not a document release — it's that a hostile state actor has made "Epstein Class" a globally trending concept. 52% American belief is extraordinary — this is majority public opinion.

### RISK — Truth Contamination
Every piece of genuine evidence associated with Iranian propaganda becomes easier to dismiss. The ADL/WaPo framing demonstrates this: "the public only believes this because Iran told them to." This is the critical threat to our mission.

### RISK — Algorithmic Suppression Intensification
Platforms banning accounts under war-related content policies. ClarionAgent's environment about to get significantly more hostile.

---

## COUNTER-NARRATIVE POTENTIAL

1. **"Both Things Can Be True" Frame:** Iran IS running propaganda. Epstein files ARE real. These are not mutually exclusive.
2. **Source-Graded Content Beats Propaganda:** Amplify ONLY Tier 1-2 evidence. Distance from AI-generated Iranian content.
3. **The Poll Numbers Are the Story:** 52% already believe. Don't persuade — validate with evidence.
4. **Institutional Overreaction Is Self-Defeating:** Every ADL overreach draws more attention to the question.

---

## KEY DATA POINTS

| Metric | Value | Source |
|--------|-------|--------|
| "Epstein Fury" mentions | 523,000+ total | WaPo, Misbar |
| Unique accounts | 273,000+ | Misbar |
| AI/manipulative content | 37,000+ items | Cyabra |
| Views on manipulative content | 145+ million | Cyabra |
| Americans believing distraction | 52% | Zeteo |
| Under-45 believing | 66% | Zeteo |
| UK opposing US action | 57% | YouGov |
| Days: Epstein release to war | 29 | DOJ/Timeline |

---

*MERIDIAN — Filed 2026-03-27 — Vigil Mission Control*`,
  },
];

function statusColor(s: string) {
  switch (s) {
    case 'ACTIVE': return '#3b82f6';
    case 'CONFIRMED': return '#10b981';
    case 'DISPROVEN': return '#ef4444';
    case 'UNDER_REVIEW': return '#f59e0b';
    default: return '#64748b';
  }
}

function renderMarkdownBlock(raw: string) {
  return raw.split('\n').map((line, i) => {
    const t = line.trim();
    if (!t) return <div key={i} className="h-2" />;
    if (t.startsWith('# ')) return <h2 key={i} className="text-lg font-bold text-cyan-400 mt-5 mb-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{t.slice(2)}</h2>;
    if (t.startsWith('## ')) return <h3 key={i} className="text-base font-bold text-slate-200 mt-4 mb-2 border-b border-[#2a3550] pb-1.5">{t.slice(3)}</h3>;
    if (t.startsWith('### ')) return <h4 key={i} className="text-[14px] font-semibold text-purple-400 mt-3 mb-1">{t.slice(4)}</h4>;
    if (t.startsWith('- ') || t.startsWith('* ')) {
      const content = t.slice(2);
      const isImportant = /CRITICAL|CONFIRMED|TIER 1|DOCUMENTED/i.test(content);
      return (
        <div key={i} className={`flex items-start gap-2 text-[13px] leading-relaxed pl-3 py-1 ${isImportant ? 'text-amber-400 font-medium' : 'text-slate-400'}`}>
          <span className="text-slate-600 mt-0.5">{'\u25B8'}</span>
          <span>{content}</span>
        </div>
      );
    }
    if (/^\d+\./.test(t)) {
      const num = t.match(/^(\d+)/)?.[1];
      const content = t.replace(/^\d+\.\s*/, '');
      return (
        <div key={i} className="flex items-start gap-3 text-[13px] leading-relaxed pl-3 py-1 text-slate-300">
          <span className="font-mono text-cyan-500 font-bold min-w-[24px]">{num}.</span>
          <span>{content}</span>
        </div>
      );
    }
    if (t.startsWith('**') && t.endsWith('**')) return <div key={i} className="text-[14px] font-bold text-slate-200 mt-2 mb-1">{t.replace(/\*\*/g, '')}</div>;
    if (t.startsWith('>')) return <div key={i} className="text-[13px] text-amber-400/80 italic pl-4 border-l-2 border-amber-500/30 my-2 py-1">{t.slice(1).trim()}</div>;
    if (t.startsWith('|')) return <div key={i} className="text-[12px] text-slate-400 font-mono py-0.5">{t}</div>;
    if (t.startsWith('---')) return <hr key={i} className="border-[#2a3550] my-4" />;
    const rendered = t.replace(/\*\*([^*]+)\*\*/g, '<b class="text-slate-200 font-semibold">$1</b>');
    return <div key={i} className="text-[13px] text-slate-400 leading-relaxed py-0.5" dangerouslySetInnerHTML={{ __html: rendered }} />;
  });
}

export default function HypothesesTab() {
  const [expanded, setExpanded] = useState<string | null>(HYPOTHESES[0]?.id || null);
  const [showRaw, setShowRaw] = useState(false);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    if (!API_KEY) return;
    async function check() {
      try { const r = await fetch(`${VPS_API}/api/health`); if (r.ok) setIsLive(true); } catch {}
    }
    check();
  }, []);

  return (
    <div className="flex flex-col gap-5">
      {/* Status */}
      <div className="flex items-center gap-2 px-1">
        <Dot color={isLive ? '#10b981' : '#f59e0b'} pulse={isLive} />
        <span className="font-mono text-xs tracking-wider" style={{ color: isLive ? '#10b981' : '#f59e0b' }}>
          {isLive ? `LIVE \u2014 ${HYPOTHESES.length} FORMAL HYPOTHESES` : 'STATIC DATA'}
        </span>
      </div>

      {/* Header */}
      <div className="p-5 bg-gradient-to-r from-blue-500/[.08] to-purple-500/[.04] border border-blue-500/20 rounded-xl">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xl">{'\uD83E\uDDE0'}</span>
          <h2 className="text-base font-bold text-blue-400" style={{ fontFamily: "'JetBrains Mono', monospace" }}>HYPOTHESES REGISTER</h2>
        </div>
        <p className="text-[14px] text-slate-300 leading-relaxed">
          Formal investigative hypotheses developed through OSINT collaboration across VIGIL operations.
          Each hypothesis is evidence-graded, cross-referenced across projects, and continuously updated as new intelligence is gathered.
          These represent structured counter-narratives backed by documented evidence.
        </p>
      </div>

      {/* Hypotheses */}
      {HYPOTHESES.map(h => {
        const isExpanded = expanded === h.id;
        const color = statusColor(h.status);

        return (
          <div key={h.id} className="bg-[#111b2a] border border-[#1e2d44] rounded-xl overflow-hidden" style={{ borderLeft: `3px solid ${color}` }}>
            {/* Header */}
            <div
              className="flex items-start justify-between px-5 py-4 cursor-pointer hover:bg-[#131f30] transition-colors"
              onClick={() => setExpanded(isExpanded ? null : h.id)}
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1 flex-wrap">
                  <span className="font-mono text-[13px] font-bold text-cyan-400">{h.id}</span>
                  <span className="text-[15px] font-bold text-slate-200">{h.title}</span>
                  <span className="font-mono text-[10px] px-2.5 py-0.5 rounded-full font-bold" style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}>
                    {h.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[12px] text-slate-500">
                  <span>Analyst: <span className="text-purple-400 font-semibold">{h.analyst}</span></span>
                  <span>{'\u2022'}</span>
                  <span>Filed: {h.filed}</span>
                  <span>{'\u2022'}</span>
                  <span>{h.classification}</span>
                </div>
                <div className="flex gap-1.5 mt-2">
                  {h.crossRef.map((ref, i) => (
                    <span key={i} className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      {ref}
                    </span>
                  ))}
                </div>
              </div>
              <span className="text-slate-500 text-sm shrink-0 ml-3">{isExpanded ? '\u25BE' : '\u25B8'}</span>
            </div>

            {/* Expanded content */}
            {isExpanded && (
              <div className="border-t border-[#1e2d44]">
                {/* Hypothesis Statement */}
                <div className="px-5 py-4">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Hypothesis Statement</div>
                  <div className="text-[14px] text-slate-200 leading-relaxed p-4 rounded-xl bg-[#0a0f18] border border-[#1a2740] italic">
                    {h.statement}
                  </div>
                </div>

                {/* Evidence */}
                <div className="px-5 pb-4">
                  <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider mb-2">
                    Evidentiary Basis ({h.evidence.length} points)
                  </div>
                  <div className="space-y-1.5">
                    {h.evidence.map((e, i) => (
                      <div key={i} className="flex items-start gap-3 py-2 px-3 rounded-lg bg-amber-500/[.04] border border-amber-500/[.08]">
                        <span className="font-mono text-[12px] font-bold text-amber-500 shrink-0 mt-px">E{i + 1}</span>
                        <span className="text-[13px] text-slate-300 leading-relaxed">{e}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Implications */}
                <div className="px-5 pb-4">
                  <div className="text-[11px] font-bold text-purple-400 uppercase tracking-wider mb-2">
                    Strategic Implications ({h.implications.length})
                  </div>
                  <div className="space-y-1.5">
                    {h.implications.map((imp, i) => (
                      <div key={i} className="flex items-start gap-3 py-2 px-3 rounded-lg bg-purple-500/[.04] border border-purple-500/[.08]">
                        <span className="font-mono text-[12px] font-bold text-purple-400 shrink-0 mt-px">I{i + 1}</span>
                        <span className="text-[13px] text-slate-300 leading-relaxed">{imp}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Full Document View + Download */}
                {h.raw && (
                  <div className="px-5 pb-5">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); setShowRaw(!showRaw); }}
                        className="font-mono text-[11px] px-3 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/20 transition-colors"
                      >
                        {showRaw ? '\u25BE HIDE FULL DOCUMENT' : '\u25B8 VIEW FULL DOCUMENT'}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const blob = new Blob([h.raw || ''], { type: 'text/markdown' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${h.id}_${h.title.replace(/\s+/g, '_')}.md`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        className="font-mono text-[11px] px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/20 transition-colors"
                      >
                        {'\u2B07'} DOWNLOAD .MD
                      </button>
                    </div>
                    {showRaw && (
                      <div className="mt-3 bg-[#0a0f18] rounded-xl p-6 border border-[#1a2740] max-h-[80vh] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                        {renderMarkdownBlock(h.raw)}
                      </div>
                    )}
                  </div>
                )}

                {/* Meta footer */}
                <div className="px-5 pb-4 flex items-center gap-4 text-[11px] text-slate-600 font-mono">
                  <span>{h.evidence.length} evidence points</span>
                  <span>{'\u2022'}</span>
                  <span>{h.implications.length} implications</span>
                  <span>{'\u2022'}</span>
                  <span>{h.crossRef.length} cross-references</span>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Empty state for future hypotheses */}
      <div className="p-4 rounded-xl bg-[#111b2a] border border-dashed border-[#2a3550] text-center">
        <div className="text-[13px] text-slate-500">
          New hypotheses are generated through OSINT collaboration sessions with MERIDIAN.
          Each hypothesis follows a structured format: statement, evidence, implications, cross-references.
        </div>
      </div>
    </div>
  );
}
