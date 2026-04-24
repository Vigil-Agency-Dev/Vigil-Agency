'use client';

import React, { useState, useEffect } from 'react';
import { Dot } from '../ui';
import { formatAESTShort } from '../../lib/date-utils';

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

const PLACEHOLDER_ITEMS: DistributedItem[] = [
  {
    id: 'DIST-001',
    title: 'H-001 Weaponised Architecture Thesis — Held for Tier 1 placement',
    tier: 1,
    channel: 'Pending journalist vetting',
    distributedAt: '',
    status: 'monitoring',
    impactScore: 0,
    notes: 'Tier 1 intel. Requires DIRECTOR + COMMANDER authorization and vetted journalist channel before distribution.',
  },
];

export default function ImpactTab() {
  const [items, setItems] = useState<DistributedItem[]>(PLACEHOLDER_ITEMS);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    if (!API_KEY) return;

    async function load() {
      try {
        const [teamRes, heraldRes] = await Promise.all([
          fetch(`${VPS_API}/api/mission/team-reports`, { headers: { 'x-api-key': API_KEY } }),
          fetch(`${VPS_API}/api/herald/packages`, { headers: { 'x-api-key': API_KEY } }).catch(() => null),
        ]);

        const liveItems: DistributedItem[] = [];
        let idx = 0;

        if (heraldRes?.ok) {
          const herald = await heraldRes.json();
          for (const pkg of (herald.packages || [])) {
            idx++;
            liveItems.push({
              id: `HERALD-${String(idx).padStart(3, '0')}`,
              title: pkg.filename || `HERALD Package ${idx}`,
              tier: 1,
              channel: 'HERALD Distribution',
              distributedAt: pkg.content?.match?.(/\d{4}-\d{2}-\d{2}/)?.[0] || '',
              status: 'monitoring',
              impactScore: 0,
              notes: typeof pkg.content === 'string' ? pkg.content.slice(0, 200) : 'HERALD distribution package',
            });
          }
        }

        if (teamRes.ok) {
          const teams = await teamRes.json();
          for (const report of (teams.reports || [])) {
            if (report.team === 'HERALD') {
              idx++;
              const summary = report.status?.summary || report.status?.engagement || '';
              liveItems.push({
                id: `TEAM-${report.team}-${String(idx).padStart(3, '0')}`,
                title: `${report.team} Team Report`,
                tier: 1,
                channel: report.team,
                distributedAt: report.received ? formatAESTShort(report.received) : '',
                status: 'monitoring',
                impactScore: 0,
                notes: typeof summary === 'string' ? summary : JSON.stringify(report.status || {}).slice(0, 200),
              });
            }
          }
        }

        // Use live items if any, otherwise keep placeholders
        if (liveItems.length > 0) {
          setItems(liveItems);
          setIsLive(true);
        }
        setLastUpdated(new Date().toISOString());
      } catch { /* fallback to placeholders */ }
    }

    load();
    const interval = setInterval(load, 120000);
    return () => clearInterval(interval);
  }, []);

  const timeAgo = (iso: string) => {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 px-1">
        <Dot color={isLive ? '#10b981' : '#f59e0b'} pulse={isLive} />
        <span className="font-mono text-[10px] tracking-wider" style={{ color: isLive ? '#10b981' : '#f59e0b' }}>
          {isLive ? `LIVE — ${items.length} ITEMS TRACKED` : 'STATIC DATA'}
        </span>
        {lastUpdated && <span className="font-mono text-[9px] text-slate-600 ml-2">Updated {timeAgo(lastUpdated)}</span>}
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
          { label: 'Distributed', value: items.length, color: '#3b82f6' },
          { label: 'Monitoring', value: items.filter(i => i.status === 'monitoring').length, color: '#f59e0b' },
          { label: 'Impact Confirmed', value: items.filter(i => i.status === 'impact_confirmed').length, color: '#10b981' },
          { label: 'Corrective Needed', value: items.filter(i => i.status === 'corrective_needed').length, color: '#ef4444' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-[#111b2a] border border-[#1e2d44] rounded-xl p-4">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{kpi.label}</div>
            <div className="text-2xl font-extrabold mt-1" style={{ color: kpi.color }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Items */}
      <div className="space-y-3">
        {items.map(item => (
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
