'use client';

import React, { useState, useEffect } from 'react';
import { Dot } from '../ui';
import { formatAESTShort } from '../../lib/date-utils';

const VPS_API = process.env.NEXT_PUBLIC_VPS_ENDPOINT || 'https://ops.jr8ch.com';
const API_KEY = process.env.NEXT_PUBLIC_VIGIL_API_KEY || '';

type DistTier = 'tier1' | 'tier2' | 'tier3';

const TIERS = [
  { id: 'tier1' as DistTier, label: 'Tier 1 — Strategic Placement', color: '#ef4444', desc: 'Highest-value intel → vetted journalists via secure channel. Forces institutional action.' },
  { id: 'tier2' as DistTier, label: 'Tier 2 — Public Content', color: '#f59e0b', desc: 'COMMANDER-cleared intel → AXIOM public content. Sanitised, no operational details.' },
  { id: 'tier3' as DistTier, label: 'Tier 3 — Autonomous Evergreen', color: '#10b981', desc: 'Consciousness elevation, pattern recognition, AI partnership. No gate required.' },
];

interface DistTarget {
  name: string;
  type: 'journalist' | 'political' | 'influencer' | 'academic' | 'organisation';
  platform: string;
  status: 'vetted' | 'vetting' | 'identified' | 'engaged';
  tier: DistTier;
  notes: string;
  opsecCleared: boolean;
  socialSecCleared: boolean;
}

const TARGETS: DistTarget[] = [
  { name: 'Journalist Channel (TBD)', type: 'journalist', platform: 'Secure', status: 'identified', tier: 'tier1', notes: 'Primary Tier 1 route. Requires Josh + COMMANDER authorization for each release.', opsecCleared: false, socialSecCleared: false },
  { name: 'AXIOM (@VigilAgencyOps)', type: 'influencer', platform: 'X', status: 'engaged', tier: 'tier2', notes: 'Active. Content briefs from COMMANDER. OPSEC firewall enforced.', opsecCleared: true, socialSecCleared: true },
  { name: 'AXIOM (@vigilops2026)', type: 'influencer', platform: 'Instagram', status: 'engaged', tier: 'tier2', notes: 'Active. Visual content for consciousness mechanics + allied fighter amplification.', opsecCleared: true, socialSecCleared: true },
];

function statusColor(s: string) {
  if (s === 'vetted') return '#10b981';
  if (s === 'engaged') return '#3b82f6';
  if (s === 'vetting') return '#f59e0b';
  return '#64748b';
}

function typeIcon(t: string) {
  if (t === 'journalist') return '\uD83D\uDCF0';
  if (t === 'political') return '\uD83C\uDFDB';
  if (t === 'influencer') return '\uD83D\uDCE2';
  if (t === 'academic') return '\uD83C\uDF93';
  return '\uD83C\uDFE2';
}

export default function DistributionTab() {
  const [activeTier, setActiveTier] = useState<DistTier | null>(null);
  const [livePackages, setLivePackages] = useState<Array<{ filename: string; content: string }>>([]);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    if (!API_KEY) return;
    async function load() {
      try {
        const res = await fetch(`${VPS_API}/api/herald/packages`, { headers: { 'x-api-key': API_KEY } });
        if (res.ok) {
          const data = await res.json();
          setLivePackages(data.packages || []);
          setIsLive(true);
        }
      } catch { /* silent */ }
    }
    load();
    const interval = setInterval(load, 120000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 px-1">
        <Dot color="#8b5cf6" pulse />
        <span className="font-mono text-xs tracking-wider text-purple-400">DISTRIBUTION PLANNING</span>
      </div>

      {/* Pipeline Overview */}
      <div className="p-5 bg-gradient-to-r from-purple-500/[.08] to-blue-500/[.04] border border-purple-500/20 rounded-xl">
        <h2 className="text-base font-bold text-purple-400 mb-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>INTELLIGENCE DISTRIBUTION PIPELINE</h2>
        <p className="text-[13px] text-slate-300 leading-relaxed">
          Not all intelligence belongs on social media. VIGIL operates a tiered distribution model — mission interest first, public interest second.
          Every release is vetted through OPSEC + SocialSec before distribution. DIRECTOR + COMMANDER authorization required for Tier 1.
        </p>
      </div>

      {/* Tiers */}
      <div className="space-y-3">
        {TIERS.map(tier => (
          <div key={tier.id} className="bg-[#111b2a] border border-[#1e2d44] rounded-xl overflow-hidden cursor-pointer hover:bg-[#131f30] transition-colors"
            style={{ borderLeft: `3px solid ${tier.color}` }}
            onClick={() => setActiveTier(activeTier === tier.id ? null : tier.id)}>
            <div className="flex items-center justify-between px-5 py-3.5">
              <div>
                <div className="text-[14px] font-bold text-slate-200">{tier.label}</div>
                <div className="text-[12px] text-slate-400 mt-0.5">{tier.desc}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] px-2 py-0.5 rounded" style={{ background: `${tier.color}15`, color: tier.color }}>
                  {TARGETS.filter(t => t.tier === tier.id).length} targets
                </span>
                <span className="text-slate-500 text-xs">{activeTier === tier.id ? '\u25BE' : '\u25B8'}</span>
              </div>
            </div>
            {activeTier === tier.id && (
              <div className="px-5 pb-4 border-t border-[#1e2d44] space-y-2 mt-2">
                {TARGETS.filter(t => t.tier === tier.id).map((target, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-[#0a0f18] border border-[#1a2740]">
                    <span className="text-lg">{typeIcon(target.type)}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13px] font-semibold text-slate-200">{target.name}</span>
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded" style={{ background: `${statusColor(target.status)}15`, color: statusColor(target.status) }}>{target.status.toUpperCase()}</span>
                        <span className="font-mono text-[10px] text-slate-500">{target.platform}</span>
                        {target.opsecCleared && <span className="text-[10px] text-green-500">{'\u2705'} OPSEC</span>}
                        {target.socialSecCleared && <span className="text-[10px] text-green-500">{'\u2705'} SocialSec</span>}
                      </div>
                      <div className="text-[12px] text-slate-400 mt-1">{target.notes}</div>
                    </div>
                  </div>
                ))}
                {TARGETS.filter(t => t.tier === tier.id).length === 0 && (
                  <div className="text-center py-4 text-[12px] text-slate-600">No targets registered for this tier yet.</div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Vetting Protocol */}
      <div className="bg-[#111b2a] border border-[#1e2d44] rounded-xl p-5" style={{ borderTop: '2px solid #f59e0b' }}>
        <div className="text-[13px] font-bold text-amber-400 mb-3">VETTING PROTOCOL</div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-[#0a0f18] border border-[#1a2740]">
            <div className="text-[11px] font-bold text-cyan-400 mb-1">OPSEC (Operational Security)</div>
            <div className="text-[12px] text-slate-400 leading-relaxed">Information discipline, digital hygiene, history of discretion, network exposure assessment.</div>
          </div>
          <div className="p-3 rounded-lg bg-[#0a0f18] border border-[#1a2740]">
            <div className="text-[11px] font-bold text-purple-400 mb-1">SocialSec (Social Security)</div>
            <div className="text-[12px] text-slate-400 leading-relaxed">Public behaviour consistency, private integrity, no inflammatory discourse, no performative alignment, ego-free engagement.</div>
          </div>
        </div>
      </div>

      {/* DIRECTOR Override */}
      <div className="p-4 rounded-xl bg-red-500/[.06] border border-red-500/15">
        <div className="text-[11px] font-bold text-red-400 uppercase tracking-wider mb-1">DIRECTOR OVERRIDE</div>
        <div className="text-[12px] text-slate-400 leading-relaxed">
          DIRECTOR may authorize any Tier 1 intel for public release through AXIOM at sole discretion. Triggers: journalist inaction (placed intel not published) or strategic timing (immediate release serves mission better). The override is simple: DIRECTOR says &quot;release it.&quot; COMMANDER executes.
        </div>
      </div>

      {/* Live Distribution Activity */}
      {isLive && livePackages.length > 0 && (
        <div className="bg-[#111b2a] border border-[#1e2d44] rounded-xl p-5" style={{ borderTop: '2px solid #10b981' }}>
          <div className="flex items-center gap-2 mb-3">
            <Dot color="#10b981" pulse />
            <span className="text-[13px] font-bold text-emerald-400">RECENT DISTRIBUTION ACTIVITY</span>
            <span className="font-mono text-[10px] text-slate-500">{livePackages.length} packages</span>
          </div>
          <div className="space-y-2">
            {livePackages.map((pkg, i) => (
              <div key={i} className="p-3 rounded-lg bg-[#0a0f18] border border-[#1a2740]">
                <div className="text-[12px] font-semibold text-slate-200 mb-1">{pkg.filename}</div>
                {pkg.content && (
                  <div className="text-[11px] text-slate-400 leading-relaxed line-clamp-3">{pkg.content.slice(0, 300)}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
