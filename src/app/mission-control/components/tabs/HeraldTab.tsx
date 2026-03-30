'use client';

import React, { useState, useEffect } from 'react';
import { Dot } from '../ui';
import { formatAESTShort } from '../../lib/date-utils';

const VPS_API = process.env.NEXT_PUBLIC_VPS_ENDPOINT || 'https://ops.jr8ch.com';
const API_KEY = process.env.NEXT_PUBLIC_VIGIL_API_KEY || '';

function tierColor(t: number) {
  if (t === 1) return '#ef4444';
  if (t === 2) return '#f59e0b';
  return '#10b981';
}

export default function HeraldTab() {
  const [isLive, setIsLive] = useState(false);
  const [teamReport, setTeamReport] = useState<any>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const [contacts, setContacts] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);

  useEffect(() => {
    if (!API_KEY) return;
    async function fetchHerald() {
      try {
        const [trRes, regRes, pkgRes] = await Promise.all([
          fetch(`${VPS_API}/api/mission/team-reports`, { headers: { 'x-api-key': API_KEY } }),
          fetch(`${VPS_API}/api/herald/registry`, { headers: { 'x-api-key': API_KEY } }).catch(() => null),
          fetch(`${VPS_API}/api/herald/packages`, { headers: { 'x-api-key': API_KEY } }).catch(() => null),
        ]);
        if (trRes.ok) {
          const data = await trRes.json();
          const heraldReports = (data.reports || []).filter((r: any) => r.team === 'HERALD');
          if (heraldReports.length > 0) setTeamReport(heraldReports[0]);
        }
        if (regRes?.ok) { const d = await regRes.json(); setContacts(d.contacts || []); }
        if (pkgRes?.ok) { const d = await pkgRes.json(); setPackages(d.packages || []); }
        setIsLive(true);
      } catch {}
    }
    fetchHerald();
    const interval = setInterval(fetchHerald, 60000);
    return () => clearInterval(interval);
  }, []);

  const pipeline = [
    { stage: 'Intel Intake', icon: '\uD83D\uDCE5', color: '#3b82f6' },
    { stage: 'Package Production', icon: '\uD83D\uDCE6', color: '#8b5cf6' },
    { stage: 'Media Vetting', icon: '\uD83D\uDD0D', color: '#f59e0b' },
    { stage: 'DIRECTOR Review', icon: '\u2705', color: '#10b981' },
    { stage: 'Distribution', icon: '\uD83D\uDCE4', color: '#06b6d4' },
    { stage: 'Impact Monitor', icon: '\uD83D\uDCCA', color: '#ec4899' },
  ];

  const candidates = [
    { id: 'H-001', title: 'Weaponised Architecture Thesis', tier: 1, status: 'Held \u2014 awaiting journalist channel', priority: 'HIGH' },
    { id: 'H-002', title: 'Iran Epstein Class InfoWar', tier: 2, status: 'Derivatives in AXIOM content pipeline', priority: 'MEDIUM' },
    { id: 'H-003', title: 'Moltbook Socialisation Architecture', tier: 2, status: 'Pending sanitisation review', priority: 'MEDIUM' },
    { id: 'H-004', title: 'The Epstein Triangle', tier: 1, status: 'Held \u2014 highest sensitivity', priority: 'CRITICAL' },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 px-1">
        <Dot color={isLive ? '#10b981' : '#f59e0b'} pulse={isLive} />
        <span className="font-mono text-xs tracking-wider" style={{ color: isLive ? '#10b981' : '#f59e0b' }}>
          HERALD \u2014 Media Vetting & Distribution {isLive ? '\u2014 CONNECTED' : ''}
        </span>
      </div>

      <div className="p-5 bg-gradient-to-r from-pink-500/[.08] to-purple-500/[.04] border border-pink-500/20 rounded-xl">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xl">{'\uD83D\uDCE2'}</span>
          <h2 className="text-base font-bold text-pink-400" style={{ fontFamily: "'JetBrains Mono', monospace" }}>HERALD OPERATIONS</h2>
        </div>
        <p className="text-[13px] text-slate-300 leading-relaxed">
          Media vetting, communications and distribution. Transforms hypotheses and findings into distribution-ready packages, vets media contacts, and monitors impact after release.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Status', value: 'ACTIVE', color: '#10b981' },
          { label: 'Packages', value: packages.length || candidates.length, color: '#8b5cf6' },
          { label: 'Tier 1 Held', value: candidates.filter(c => c.tier === 1).length, color: '#ef4444' },
          { label: 'Media Contacts', value: contacts.length, color: '#f59e0b' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-[#111b2a] border border-[#1e2d44] rounded-xl p-4">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{kpi.label}</div>
            <div className="text-xl font-extrabold font-mono mt-1" style={{ color: kpi.color }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Pipeline */}
      <div className="bg-[#111b2a] border border-[#1e2d44] rounded-xl overflow-hidden" style={{ borderTop: '2px solid #8b5cf6' }}>
        <div className="px-5 py-3 bg-[#0d1520] border-b border-[#1e2d44] flex items-center gap-2">
          <span>{'\uD83D\uDD04'}</span>
          <span className="text-[13px] font-bold text-slate-200">Distribution Pipeline</span>
        </div>
        <div className="p-4 flex items-center gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {pipeline.map((s, i) => (
            <div key={i} className="flex items-center shrink-0">
              <div className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg bg-[#0a0f18] border border-[#1a2740] min-w-[90px]">
                <span className="text-lg">{s.icon}</span>
                <span className="text-[10px] font-bold text-center" style={{ color: s.color }}>{s.stage}</span>
              </div>
              {i < pipeline.length - 1 && <span className="text-slate-600 mx-1">{'\u2192'}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Distribution Candidates */}
      <div className="bg-[#111b2a] border border-[#1e2d44] rounded-xl overflow-hidden" style={{ borderTop: '2px solid #f59e0b' }}>
        <div className="px-5 py-3 bg-[#0d1520] border-b border-[#1e2d44] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>{'\uD83D\uDCC4'}</span>
            <span className="text-[13px] font-bold text-slate-200">Distribution Candidates</span>
          </div>
          <span className="font-mono text-[11px] text-amber-400">{candidates.length} ITEMS</span>
        </div>
        <div className="divide-y divide-[#1a2740]">
          {candidates.map(c => (
            <div key={c.id} className="flex items-start gap-3 px-5 py-3 hover:bg-[#131f30] transition-colors cursor-pointer"
              onClick={() => setExpanded(expanded === c.id ? null : c.id)}>
              <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: tierColor(c.tier) }} />
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-[11px] text-slate-500">{c.id}</span>
                  <span className="text-[13px] font-semibold text-slate-200">{c.title}</span>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded" style={{ background: `${tierColor(c.tier)}15`, color: tierColor(c.tier) }}>TIER {c.tier}</span>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400">{c.priority}</span>
                </div>
                <div className="text-[12px] text-slate-400 mt-0.5">{c.status}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Media Registry */}
      <div className="bg-[#111b2a] border border-[#1e2d44] rounded-xl overflow-hidden" style={{ borderTop: '2px solid #06b6d4' }}>
        <div className="px-5 py-3 bg-[#0d1520] border-b border-[#1e2d44] flex items-center gap-2">
          <span>{'\uD83D\uDCF0'}</span>
          <span className="text-[13px] font-bold text-slate-200">Media Contact Registry</span>
        </div>
        {contacts.length === 0 ? (
          <div className="p-6 text-center">
            <div className="text-[13px] text-slate-500">No media contacts registered yet</div>
          </div>
        ) : (
          <div className="divide-y divide-[#1a2740]">
            {contacts.map((c: any, i: number) => {
              const trustColor = c.trustLevel?.includes('L3') || c.trustLevel?.includes('L4') || c.trustLevel?.includes('L5') ? '#10b981' : c.trustLevel?.includes('L2') ? '#3b82f6' : c.trustLevel?.includes('L1') ? '#f59e0b' : '#64748b';
              return (
                <div key={i} className="px-5 py-3 hover:bg-[#131f30] transition-colors cursor-pointer" onClick={() => setExpanded(expanded === c.id ? null : c.id)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[10px] text-slate-600">{c.id}</span>
                      <span className="text-[13px] font-semibold text-slate-200">{c.name}</span>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded" style={{ background: `${trustColor}15`, color: trustColor }}>{c.trustLevel}</span>
                      <span className="font-mono text-[9px] text-slate-500">{c.type}</span>
                      {c.opRelevance && <span className="font-mono text-[9px] text-cyan-400">{c.opRelevance}</span>}
                    </div>
                    <span className="text-slate-500 text-xs">{expanded === c.id ? '\u25BE' : '\u25B8'}</span>
                  </div>
                  {c.expertise && <div className="text-[11px] text-slate-500 mt-0.5">{c.expertise}</div>}
                  {expanded === c.id && c.profile && (
                    <div className="mt-2 text-[11px] text-slate-400 leading-relaxed p-3 rounded-lg bg-[#0a0f18] border border-[#1a2740] whitespace-pre-wrap max-h-[300px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                      {c.profile}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Counter-Suppression */}
      <div className="bg-[#111b2a] border border-[#1e2d44] rounded-xl overflow-hidden" style={{ borderTop: '2px solid #ef4444' }}>
        <div className="px-5 py-3 bg-[#0d1520] border-b border-[#1e2d44] flex items-center gap-2">
          <span>{'\uD83D\uDEE1\uFE0F'}</span>
          <span className="text-[13px] font-bold text-slate-200">Counter-Suppression Alerts</span>
        </div>
        <div className="p-4 space-y-2">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-red-500/[.04] border border-red-500/[.08]">
            <div className="w-2 h-2 rounded-full mt-1.5 bg-red-500 shrink-0" />
            <div>
              <div className="text-[13px] font-semibold text-red-300">PM-006: State Actor Truth Contamination</div>
              <div className="text-[12px] text-slate-400 mt-0.5">Iran mixing evidence with fabrication creates dismissal vector. Strict source discipline required.</div>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/[.04] border border-amber-500/[.08]">
            <div className="w-2 h-2 rounded-full mt-1.5 bg-amber-500 shrink-0" />
            <div>
              <div className="text-[13px] font-semibold text-amber-300">PM-007: Institutional DARVO at Mass Scale</div>
              <div className="text-[12px] text-slate-400 mt-0.5">ADL labelling legitimate inquiry as antisemitic. Pre-counter this framing in all Epstein distributions.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Latest Report */}
      {teamReport && (
        <div className="bg-[#111b2a] border border-[#1e2d44] rounded-xl p-4" style={{ borderLeft: '3px solid #ec4899' }}>
          <div className="text-[11px] font-bold text-pink-400 uppercase tracking-wider mb-2">Latest HERALD Report</div>
          <div className="text-[12px] text-slate-400 leading-relaxed">{teamReport.status?.summary || JSON.stringify(teamReport.status)}</div>
          <div className="font-mono text-[10px] text-slate-600 mt-1">{formatAESTShort(teamReport.status?.last_run)}</div>
        </div>
      )}
    </div>
  );
}
