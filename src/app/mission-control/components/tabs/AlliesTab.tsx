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
    </div>
  );
}
