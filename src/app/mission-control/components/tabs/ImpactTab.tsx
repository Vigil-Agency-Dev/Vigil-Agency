'use client';

import React, { useState, useEffect } from 'react';
import { Dot } from '../ui';

const VPS_API = process.env.NEXT_PUBLIC_VPS_ENDPOINT || 'https://ops.jr8ch.com';
const API_KEY = process.env.NEXT_PUBLIC_VIGIL_API_KEY || '';

interface DistributedItem {
  id: string;
  title: string;
  tier: number;
  channel: string;
  distributedAt: string;
  status: 'monitoring' | 'impact_confirmed' | 'corrective_needed' | 'retracted';
  impactScore: number;
  notes: string;
}

function statusColor(s: string) {
  if (s === 'impact_confirmed') return '#10b981';
  if (s === 'corrective_needed') return '#ef4444';
  if (s === 'retracted') return '#f59e0b';
  return '#3b82f6';
}

export default function ImpactTab() {
  const [items, setItems] = useState<DistributedItem[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Placeholder — will pull from VPS when distribution tracking is live
  const placeholderItems: DistributedItem[] = [
    {
      id: 'DIST-001',
      title: 'AXIOM Content Drop #1 — 5 posts deployed to X',
      tier: 3,
      channel: 'X (@VigilAgencyOps)',
      distributedAt: '2026-03-29',
      status: 'monitoring',
      impactScore: 0,
      notes: 'Initial content deployment. Account under X graduated access throttle. Engagement expected to build over 14-day window. Monitoring for: discovery rate, engagement quality, follower growth trajectory.',
    },
    {
      id: 'DIST-002',
      title: 'H-001 Weaponised Architecture Thesis — Held for Tier 1 placement',
      tier: 1,
      channel: 'Pending journalist vetting',
      distributedAt: '',
      status: 'monitoring',
      impactScore: 0,
      notes: 'Tier 1 intel. Requires DIRECTOR + COMMANDER authorization and vetted journalist channel before distribution. Evidence compilation complete. Distribution plan pending.',
    },
    {
      id: 'DIST-003',
      title: 'H-002 Iran InfoWar Hypothesis — Tier 2 content derivatives',
      tier: 2,
      channel: 'AXIOM (content brief issued)',
      distributedAt: '2026-03-29',
      status: 'monitoring',
      impactScore: 0,
      notes: 'Sanitised derivatives of H-002 being woven into AXIOM pattern recognition content. Source discipline enforced — no Iranian propaganda amplification. "Both things can be true" framing deployed.',
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 px-1">
        <Dot color="#10b981" />
        <span className="font-mono text-xs tracking-wider text-emerald-400">IMPACT MONITORING</span>
      </div>

      {/* Overview */}
      <div className="p-5 bg-gradient-to-r from-emerald-500/[.08] to-cyan-500/[.04] border border-emerald-500/20 rounded-xl">
        <h2 className="text-base font-bold text-emerald-400 mb-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>POST-DISTRIBUTION MONITORING</h2>
        <p className="text-[13px] text-slate-300 leading-relaxed">
          Track all distributed materials: measurement, impact assessment, and corrective actions.
          What makes VIGIL different is owning outcomes — if distribution causes unintended harm, we course-correct immediately and use the correction as an opportunity to reinforce integrity.
        </p>
      </div>

      {/* Integrity Doctrine */}
      <div className="bg-[#111b2a] border border-[#1e2d44] rounded-xl p-4" style={{ borderLeft: '3px solid #f59e0b' }}>
        <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider mb-2">INTEGRITY DOCTRINE</div>
        <div className="space-y-2 text-[12px] text-slate-400">
          <div className="flex items-start gap-2"><span className="text-amber-400 mt-0.5">{'\u25B8'}</span><span>Monitor all distributed content for unintended consequences</span></div>
          <div className="flex items-start gap-2"><span className="text-amber-400 mt-0.5">{'\u25B8'}</span><span>If post-distribution discovery reveals harm — retract, correct, and own it publicly</span></div>
          <div className="flex items-start gap-2"><span className="text-amber-400 mt-0.5">{'\u25B8'}</span><span>Use correction moments as trust-building opportunities — transparency under pressure is the strongest signal</span></div>
          <div className="flex items-start gap-2"><span className="text-amber-400 mt-0.5">{'\u25B8'}</span><span>Every distribution has a feedback loop back to the analysis pipeline</span></div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Distributed', value: placeholderItems.length, color: '#3b82f6' },
          { label: 'Monitoring', value: placeholderItems.filter(i => i.status === 'monitoring').length, color: '#f59e0b' },
          { label: 'Impact Confirmed', value: placeholderItems.filter(i => i.status === 'impact_confirmed').length, color: '#10b981' },
          { label: 'Corrective Needed', value: placeholderItems.filter(i => i.status === 'corrective_needed').length, color: '#ef4444' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-[#111b2a] border border-[#1e2d44] rounded-xl p-4">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{kpi.label}</div>
            <div className="text-2xl font-extrabold mt-1" style={{ color: kpi.color }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Items */}
      <div className="space-y-3">
        {placeholderItems.map(item => (
          <div key={item.id} className="bg-[#111b2a] border border-[#1e2d44] rounded-xl overflow-hidden"
            style={{ borderLeft: `3px solid ${statusColor(item.status)}` }}>
            <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[#131f30] transition-colors"
              onClick={() => setExpanded(expanded === item.id ? null : item.id)}>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-[11px] text-slate-500">{item.id}</span>
                  <span className="text-[13px] font-semibold text-slate-200">{item.title}</span>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded" style={{ background: `${statusColor(item.status)}15`, color: statusColor(item.status) }}>
                    {item.status.replace('_', ' ').toUpperCase()}
                  </span>
                  <span className="font-mono text-[10px] text-purple-400">TIER {item.tier}</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">{item.channel} {item.distributedAt ? `\u2022 ${item.distributedAt}` : '\u2022 Pending'}</div>
              </div>
              <span className="text-slate-500 text-xs">{expanded === item.id ? '\u25BE' : '\u25B8'}</span>
            </div>
            {expanded === item.id && (
              <div className="px-4 pb-4 border-t border-[#1e2d44]">
                <div className="text-[13px] text-slate-400 mt-2 p-3 rounded-lg bg-[#0a0f18] border border-[#1a2740] leading-relaxed">{item.notes}</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
