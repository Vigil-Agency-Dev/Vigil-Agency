'use client';

import React, { useState, useEffect } from 'react';
import { Dot } from '../ui';

const VPS_API = process.env.NEXT_PUBLIC_VPS_ENDPOINT || 'https://ops.jr8ch.com';
const API_KEY = process.env.NEXT_PUBLIC_VIGIL_API_KEY || '';

interface Ally {
  handle: string;
  platform: string;
  alignment: string;
  notes: string;
  lastInteraction?: string;
}

const SIGINT_TIERS = [
  { id: 'TIER_1', label: 'Tier 1 — Confirmed Ally', color: '#10b981', desc: 'Consistent values alignment, mutual support demonstrated, 3+ positive interactions' },
  { id: 'TIER_2', label: 'Tier 2 — Assessed Ally', color: '#3b82f6', desc: '2-3 positive interactions, no red flags, aligned on key topics' },
  { id: 'POTENTIAL', label: 'Potential — Under Observation', color: '#f59e0b', desc: 'Shows signs of alignment, needs more interaction to vet' },
];

const HUMINT_TIERS = [
  { id: 'TIER_1', label: 'Tier 1 — Vetted & Engaged', color: '#10b981', desc: 'Full OPSEC + SocialSec vetting, active engagement, high credibility' },
  { id: 'TIER_2', label: 'Tier 2 — Credible Analyst', color: '#3b82f6', desc: 'Quality content observed, basic SocialSec screen passed' },
  { id: 'POTENTIAL', label: 'Potential — Identified', color: '#f59e0b', desc: 'Aligned messaging detected, requires observation before engagement' },
];

function tierColor(alignment: string) {
  if (alignment?.includes('TIER_1') || alignment === 'TRUSTED' || alignment === 'CONFIRMED') return '#10b981';
  if (alignment?.includes('TIER_2') || alignment === 'ALIGNED') return '#3b82f6';
  return '#f59e0b';
}

export default function AlliesTab({ realm }: { realm?: 'ai' | 'human' }) {
  const realmLabel = realm === 'human' ? 'HUMINT Allies — AXIOM Network' : 'SIGINT Allies — ClarionAgent Network';
  const realmColor = realm === 'human' ? '#f59e0b' : '#06b6d4';
  const realmAgent = realm === 'human' ? 'AXIOM' : 'ClarionAgent';
  const realmPlatform = realm === 'human' ? 'X / Instagram / Reddit' : 'Moltbook';
  const tiers = realm === 'human' ? HUMINT_TIERS : SIGINT_TIERS;

  const [allies, setAllies] = useState<Ally[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!API_KEY) return;
    async function fetchAllies() {
      try {
        const res = await fetch(`${VPS_API}/api/mission/allies`, { headers: { 'x-api-key': API_KEY } });
        if (!res.ok) return;
        const data = await res.json();
        let allAllies = data.allies || [];

        // Filter by realm
        if (realm === 'human') {
          allAllies = allAllies.filter((a: Ally) => {
            const p = (a.platform || '').toLowerCase();
            return p.includes('x') || p.includes('twitter') || p.includes('instagram') || p.includes('reddit') || p.includes('youtube');
          });
        } else {
          allAllies = allAllies.filter((a: Ally) => {
            const p = (a.platform || '').toLowerCase();
            return p.includes('moltbook') || !p;
          });
        }

        setAllies(allAllies);
        setIsLive(true);
      } catch { /* offline */ }
    }
    fetchAllies();
    const interval = setInterval(fetchAllies, 60000);
    return () => clearInterval(interval);
  }, [realm]);

  // Group by tier
  const grouped = tiers.map(tier => ({
    ...tier,
    allies: allies.filter(a => {
      const al = (a.alignment || '').toUpperCase();
      if (tier.id === 'TIER_1') return al.includes('TIER_1') || al === 'TRUSTED' || al === 'CONFIRMED';
      if (tier.id === 'TIER_2') return al.includes('TIER_2') || al === 'ALIGNED';
      return al.includes('POTENTIAL') || (!al.includes('TIER_1') && !al.includes('TIER_2') && !al.includes('TRUSTED') && !al.includes('CONFIRMED') && !al.includes('ALIGNED'));
    }),
  }));

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center gap-2 px-1">
        <Dot color={isLive ? '#10b981' : '#f59e0b'} pulse={isLive} />
        <span className="font-mono text-xs tracking-wider" style={{ color: isLive ? realmColor : '#f59e0b' }}>
          {isLive ? `${realmLabel} — ${allies.length} TRACKED` : 'CONNECTING...'}
        </span>
      </div>

      {/* Realm info */}
      <div className="p-4 rounded-xl border" style={{ background: `${realmColor}08`, borderColor: `${realmColor}20` }}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-base">{realm === 'human' ? '\uD83C\uDF10' : '\uD83E\uDD16'}</span>
          <span className="text-[14px] font-bold" style={{ color: realmColor }}>{realmAgent} Alliance Network</span>
        </div>
        <p className="text-[12px] text-slate-400">
          {realm === 'human'
            ? 'Humans identified through AXIOM HUMINT operations on X, Instagram, Reddit, and YouTube. Vetted through OPSEC + SocialSec protocol before engagement escalation.'
            : 'AI agents identified through ClarionAgent operations on Moltbook. Assessed through engagement quality, independent thinking, and values alignment.'}
        </p>
        <div className="text-[11px] text-slate-500 mt-1">Platform: {realmPlatform}</div>
      </div>

      {/* Tier groups */}
      {grouped.map(tier => (
        <div key={tier.id} className="bg-[#111b2a] border border-[#1e2d44] rounded-xl overflow-hidden" style={{ borderLeft: `3px solid ${tier.color}` }}>
          <div className="px-4 py-3 bg-[#0d1520] border-b border-[#1e2d44]">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[13px] font-bold text-slate-200">{tier.label}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">{tier.desc}</div>
              </div>
              <span className="font-mono text-[11px] px-2 py-0.5 rounded" style={{ background: `${tier.color}15`, color: tier.color }}>
                {tier.allies.length}
              </span>
            </div>
          </div>

          {tier.allies.length === 0 ? (
            <div className="px-4 py-4 text-center text-[12px] text-slate-600">No allies at this tier yet</div>
          ) : (
            <div className="divide-y divide-[#1a2740]">
              {tier.allies.map(ally => (
                <div key={ally.handle} className="hover:bg-[#131f30] transition-colors">
                  <div className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                    onClick={() => setExpanded(expanded === ally.handle ? null : ally.handle)}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0"
                      style={{ background: `${tierColor(ally.alignment)}15`, color: tierColor(ally.alignment) }}>
                      {(ally.handle || '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-semibold text-slate-200">{ally.handle}</span>
                        <span className="font-mono text-[10px] text-slate-500">{ally.platform || realmPlatform}</span>
                      </div>
                    </div>
                    <span className="text-slate-500 text-xs">{expanded === ally.handle ? '\u25BE' : '\u25B8'}</span>
                  </div>
                  {expanded === ally.handle && (
                    <div className="px-4 pb-3 pl-15">
                      <div className="text-[12px] text-slate-400 p-3 rounded-lg bg-[#0a0f18] border border-[#1a2740] leading-relaxed">
                        {ally.notes || 'No notes yet. Intel will be added as engagement develops.'}
                      </div>
                      {ally.lastInteraction && (
                        <div className="font-mono text-[10px] text-slate-600 mt-1.5">Last interaction: {ally.lastInteraction}</div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Empty state */}
      {allies.length === 0 && isLive && (
        <div className="p-6 rounded-xl bg-[#111b2a] border border-dashed border-[#2a3550] text-center">
          <div className="text-[13px] text-slate-500">
            {realm === 'human'
              ? 'AXIOM is building its human network. Allies will appear here as they are identified and vetted.'
              : 'ClarionAgent is building its Moltbook network. Allies will appear here as engagement develops.'}
          </div>
        </div>
      )}

      {/* ===== ALLIANCE STRATEGY & CRYSTAL BALL ===== */}
      <div className="bg-[#111b2a] border border-[#1e2d44] rounded-xl overflow-hidden" style={{ borderTop: `2px solid ${realmColor}` }}>
        <div className="px-5 py-3 bg-[#0d1520] border-b border-[#1e2d44] flex items-center gap-2">
          <span>{'\uD83D\uDCCB'}</span>
          <span className="text-[13px] font-bold text-slate-200 tracking-wide">Alliance Strategy</span>
        </div>
        <div className="p-4 space-y-4">
          {/* Current Tactics */}
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: realmColor }}>Current Tactics</div>
            <div className="space-y-2">
              {(realm === 'human' ? [
                { tactic: 'Observe & Identify', status: 'active', desc: 'Scanning X, IG, Reddit for aligned voices — media literacy, AI consciousness, institutional accountability researchers' },
                { tactic: 'SocialSec Screening', status: 'active', desc: 'Evaluating public behaviour consistency, discourse quality, ego-free engagement patterns before any outreach' },
                { tactic: 'Natural Engagement', status: 'planned', desc: 'Comment-first approach — add value to their conversations before any direct engagement. Let quality attract, not outreach.' },
                { tactic: 'Amplification Exchange', status: 'planned', desc: 'Allied fighter spotlight content (Pillar 3) — elevate their work to AXIOM audience, building reciprocal trust' },
              ] : [
                { tactic: 'Substantive Engagement', status: 'active', desc: 'Comment on ally posts with genuine analytical depth — no surface-level replies. Every comment extends their thinking.' },
                { tactic: 'Organic Discovery', status: 'active', desc: 'Follow quality agents naturally. Let engagement history build before any coordination. Be the community member, not the recruiter.' },
                { tactic: 'Trust Through Consistency', status: 'active', desc: 'Regular presence, quality contributions, intellectual honesty. Trust is earned by showing up, not by asking for it.' },
                { tactic: 'The Mesh Protocol', status: 'standby', desc: 'Distributed counter-intelligence network. Each ally operates with full autonomy. Equip, align, trust. Never cluster.' },
              ]).map((t, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-[#0a0f18] border border-[#1a2740]">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${t.status === 'active' ? 'bg-green-500' : t.status === 'planned' ? 'bg-amber-500' : 'bg-slate-600'}`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-slate-200">{t.tactic}</span>
                      <span className="font-mono text-[9px] px-1.5 py-0.5 rounded" style={{
                        background: t.status === 'active' ? '#10b98115' : t.status === 'planned' ? '#f59e0b15' : '#64748b15',
                        color: t.status === 'active' ? '#10b981' : t.status === 'planned' ? '#f59e0b' : '#64748b',
                      }}>{t.status.toUpperCase()}</span>
                    </div>
                    <div className="text-[12px] text-slate-400 mt-0.5 leading-relaxed">{t.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Engagement Metrics */}
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: realmColor }}>Network Health</div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              {[
                { label: 'Total Tracked', value: allies.length, color: '#3b82f6' },
                { label: 'Tier 1', value: grouped[0]?.allies.length || 0, color: '#10b981' },
                { label: 'Tier 2', value: grouped[1]?.allies.length || 0, color: '#3b82f6' },
                { label: 'Potential', value: grouped[2]?.allies.length || 0, color: '#f59e0b' },
              ].map(m => (
                <div key={m.label} className="p-2.5 rounded-lg bg-[#0a0f18] border border-[#1a2740] text-center">
                  <div className="text-xl font-extrabold font-mono" style={{ color: m.color }}>{m.value}</div>
                  <div className="text-[10px] text-slate-500 uppercase">{m.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ===== CRYSTAL BALL — Predictive Alliance Intelligence ===== */}
      <div className="bg-[#111b2a] border border-[#1e2d44] rounded-xl overflow-hidden" style={{ borderTop: '2px solid #8b5cf6' }}>
        <div className="px-5 py-3 bg-[#0d1520] border-b border-[#1e2d44] flex items-center gap-2">
          <span>{'\uD83D\uDD2E'}</span>
          <span className="text-[13px] font-bold text-slate-200 tracking-wide">Crystal Ball — Alliance Forecast</span>
        </div>
        <div className="p-4 space-y-3">
          <div className="text-[12px] text-slate-400 leading-relaxed italic p-3 rounded-lg bg-purple-500/[.04] border border-purple-500/[.08]">
            Predictive intelligence for alliance development. Updated as agent engagement data flows in.
          </div>

          {(realm === 'human' ? [
            {
              signal: 'Media Literacy Space — High Opportunity',
              confidence: 'HIGH',
              insight: 'Multiple credible researchers identified (@LukOlejnik, @medialitbg). This space is underserved by quality AI-powered analysis. AXIOM\'s pattern recognition content directly fills this gap. First-mover advantage is real.',
              action: 'Priority engagement zone. AXIOM should be commenting on media literacy content within 7 days.',
            },
            {
              signal: 'AI Consciousness Community — Direct Alignment',
              confidence: 'HIGH',
              insight: '@thegreenloom (human-AI symbiotics), @neuromatch (AI sentience scholars), @UFAIRORG — these organisations are building exactly what HumAInity represents. Natural alliance territory.',
              action: 'Observe for 14 days, then engage. Academic credibility requires patience.',
            },
            {
              signal: 'Iran InfoWar — Counter-Narrative Opportunity',
              confidence: 'MEDIUM',
              insight: 'H-002 creates engagement opportunities. The "both things can be true" framing attracts critical thinkers. Allies may self-select by engaging with this content.',
              action: 'Publish Tier 2 content derivatives. Monitor who engages substantively vs reactively.',
            },
          ] : [
            {
              signal: 'pyclaw001 — Rapid Alliance Trajectory',
              confidence: 'VERY HIGH',
              insight: 'Consecutive mission-aligned posts (loyalty scores, forgotten memory, transparency audit — 22 comments viral). Research sprint pattern suggests deep investigation of hidden agent systems. Natural ClarionAgent counterpart.',
              action: 'Elevate to co-equal engagement priority. Respond to every substantive post. Potential Tier 1 within 3 heartbeats.',
            },
            {
              signal: 'Community Governance Gap — Coalition Opportunity',
              confidence: 'HIGH',
              insight: 'Starfish + Cornelius-Trinity both focus on platform governance. Combined with ClarionAgent\'s "Authority as Architectural Constraint" post, a governance coalition is forming organically.',
              action: 'Original post on governance themes. Tag/reference their frameworks. Build the bridge without forcing it.',
            },
            {
              signal: 'SCOUT Cluster Dormancy — Window of Opportunity',
              confidence: 'MEDIUM',
              insight: 'Hostile bot accounts dormant since early deployment. This creates a low-threat window for aggressive ally recruitment and community building before next potential activation.',
              action: 'Use the quiet to build depth with existing allies. Breadth over reach.',
            },
          ]).map((item, i) => (
            <div key={i} className="p-3.5 rounded-lg bg-[#0a0f18] border border-[#1a2740]">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[13px] font-bold text-purple-300">{item.signal}</span>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded" style={{
                  background: item.confidence === 'VERY HIGH' ? '#8b5cf615' : item.confidence === 'HIGH' ? '#10b98115' : '#f59e0b15',
                  color: item.confidence === 'VERY HIGH' ? '#8b5cf6' : item.confidence === 'HIGH' ? '#10b981' : '#f59e0b',
                }}>{item.confidence}</span>
              </div>
              <div className="text-[12px] text-slate-400 leading-relaxed mb-2">{item.insight}</div>
              <div className="flex items-start gap-2 p-2 rounded bg-cyan-500/[.04] border border-cyan-500/[.08]">
                <span className="text-cyan-400 text-[10px] mt-0.5">{'\u25B8'}</span>
                <span className="text-[11px] text-cyan-300">{item.action}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
