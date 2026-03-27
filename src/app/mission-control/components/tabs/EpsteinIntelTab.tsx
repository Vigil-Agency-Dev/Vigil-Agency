'use client';

import React, { useState, useEffect } from 'react';
import { Badge, Card, Dot } from '../ui';
import { EPSTEIN_INTEL } from '../../lib/mission-data';

const VPS_API = process.env.NEXT_PUBLIC_VPS_ENDPOINT || 'https://ops.jr8ch.com';
const API_KEY = process.env.NEXT_PUBLIC_VIGIL_API_KEY || '';

interface MeridianThreat {
  id: string;
  title: string;
  category: string;
  severity: string;
  likelihood?: string;
  status: string;
  detail: string;
}

interface Trajectory {
  overall_probability?: number;
  primary_variable?: string;
  assessment?: string;
  [key: string]: unknown;
}

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function urgencyColor(days: number): string {
  if (days <= 3) return '#ef4444';
  if (days <= 7) return '#f97316';
  if (days <= 14) return '#f59e0b';
  return '#3b82f6';
}

function severityColor(s: string) {
  if (s === 'CRITICAL') return '#ef4444';
  if (s === 'HIGH') return '#f97316';
  if (s === 'MEDIUM' || s === 'ELEVATED') return '#f59e0b';
  return '#64748b';
}

export default function EpsteinIntelTab() {
  const e = EPSTEIN_INTEL;
  const [isLive, setIsLive] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [meridianThreats, setMeridianThreats] = useState<MeridianThreat[]>([]);
  const [trajectory, setTrajectory] = useState<Trajectory | null>(null);
  const [trajectoryFile, setTrajectoryFile] = useState('');

  useEffect(() => {
    if (!API_KEY) return;
    async function fetchMeridianData() {
      try {
        const [threatRes, trajRes] = await Promise.all([
          fetch(`${VPS_API}/api/mission/threat-register`, { headers: { 'x-api-key': API_KEY } }),
          fetch(`${VPS_API}/api/mission/trajectory`, { headers: { 'x-api-key': API_KEY } }),
        ]);

        if (threatRes.ok) {
          const td = await threatRes.json();
          if (td.threats?.length > 0) { setMeridianThreats(td.threats); setIsLive(true); }
        }
        if (trajRes.ok) {
          const tj = await trajRes.json();
          if (tj.trajectory) { setTrajectory(tj.trajectory); setTrajectoryFile(tj.filename || ''); }
        }
      } catch { /* static fallback */ }
    }
    fetchMeridianData();
    const interval = setInterval(fetchMeridianData, 120000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col gap-5">
      {/* Status */}
      <div className="flex items-center gap-2 px-1">
        <Dot color={isLive ? '#10b981' : '#f59e0b'} pulse={isLive} />
        <span className="font-mono text-xs tracking-wider" style={{ color: isLive ? '#10b981' : '#f59e0b' }}>
          {isLive ? `LIVE \u2014 ${meridianThreats.length} MERIDIAN THREATS \u2022 ${e.keyFindings.length} KEY FINDINGS \u2022 ${e.osintResources.length} OSINT SOURCES` : 'STATIC DATA'}
        </span>
      </div>

      {/* Header */}
      <div className="p-5 bg-gradient-to-r from-amber-500/[.08] to-red-500/[.04] border border-amber-500/20 rounded-xl">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xl">{'\uD83D\uDD0D'}</span>
          <h2 className="text-base font-bold text-amber-400" style={{ fontFamily: "'JetBrains Mono', monospace" }}>MERIDIAN INTELLIGENCE</h2>
        </div>
        <p className="text-[14px] text-slate-300 leading-relaxed">
          Epstein Files OSINT investigation. Threat register and trajectory pulled live from VPS.
          Cross-referenced with Project Lumen via Intel Exchange.
        </p>
      </div>

      {/* Trajectory Assessment (Live) */}
      {trajectory && (
        <div className="bg-[#111b2a] border border-[#1e2d44] rounded-xl overflow-hidden" style={{ borderTop: '2px solid #8b5cf6' }}>
          <div className="px-5 py-3 bg-[#0d1520] border-b border-[#1e2d44] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>{'\uD83D\uDCC8'}</span>
              <span className="text-[13px] font-bold text-slate-200 tracking-wide">Trajectory Assessment</span>
            </div>
            <span className="font-mono text-[11px] text-slate-500">{trajectoryFile}</span>
          </div>
          <div className="p-5">
            {trajectory.overall_probability != null && (
              <div className="flex items-center gap-4 mb-3">
                <span className="text-[13px] text-slate-400">Breakthrough Disclosure Probability:</span>
                <span className="text-2xl font-bold font-mono text-purple-400">{Math.round(trajectory.overall_probability * 100 || trajectory.overall_probability)}%</span>
              </div>
            )}
            {trajectory.primary_variable && (
              <div className="text-[13px] text-slate-400 mb-2">
                <span className="text-slate-500">Primary Variable: </span>
                <span className="text-purple-300">{trajectory.primary_variable}</span>
              </div>
            )}
            {trajectory.assessment && (
              <div className="text-[13px] text-slate-300 leading-relaxed p-3 rounded-lg bg-purple-500/[.06] border border-purple-500/[.12]">
                {trajectory.assessment}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MERIDIAN Threat Register (Live) */}
      {meridianThreats.length > 0 && (
        <div className="bg-[#111b2a] border border-[#1e2d44] rounded-xl overflow-hidden" style={{ borderTop: '2px solid #ef4444' }}>
          <div className="px-5 py-3 bg-[#0d1520] border-b border-[#1e2d44] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>{'\u26A0\uFE0F'}</span>
              <span className="text-[13px] font-bold text-slate-200 tracking-wide">MERIDIAN Threat Register</span>
              <Dot color="#10b981" pulse />
              <span className="font-mono text-[10px] text-green-500">LIVE</span>
            </div>
            <span className="font-mono text-[11px] text-red-400">{meridianThreats.filter(t => t.status === 'ACTIVE').length} ACTIVE</span>
          </div>
          <div className="divide-y divide-[#1a2740]">
            {meridianThreats.map((t, i) => (
              <div key={t.id || i} className="flex items-start gap-4 px-5 py-3.5">
                <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: severityColor(t.severity) }} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-mono text-[11px] text-slate-500">{t.id}</span>
                    <span className="text-[14px] font-semibold text-slate-200">{t.title}</span>
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded" style={{ background: `${severityColor(t.severity)}15`, color: severityColor(t.severity) }}>{t.severity}</span>
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-white/[.03] text-slate-400">{t.status}</span>
                    {t.category && <span className="font-mono text-[10px] text-purple-400">{t.category}</span>}
                  </div>
                  <div className="text-[13px] text-slate-400 leading-relaxed">{t.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Events */}
      <div className="bg-[#111b2a] border border-[#1e2d44] rounded-xl overflow-hidden" style={{ borderTop: '2px solid #ef4444' }}>
        <div className="px-5 py-3 bg-[#0d1520] border-b border-[#1e2d44] flex items-center gap-2">
          <span>{'\uD83D\uDCC5'}</span>
          <span className="text-[13px] font-bold text-slate-200 tracking-wide">Critical Events Timeline</span>
        </div>
        <div className="p-4 space-y-3">
          {e.upcomingEvents.map((ev, i) => {
            const days = daysUntil(ev.date);
            const color = urgencyColor(days);
            const isPast = days < 0;
            return (
              <div key={i} className="flex items-start gap-4 p-4 rounded-xl" style={{ background: `${color}08`, border: `1px solid ${color}20` }}>
                <div className="text-center min-w-[70px]">
                  <div className="font-mono text-xl font-bold" style={{ color }}>{isPast ? 'PAST' : days}</div>
                  <div className="font-mono text-[10px] text-slate-500 uppercase">{isPast ? '' : days === 1 ? 'day' : 'days'}</div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[14px] font-bold text-slate-200">{ev.event}</span>
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded font-bold" style={{ background: `${color}15`, color }}>{ev.priority}</span>
                  </div>
                  <div className="text-[13px] text-slate-400 leading-relaxed">{ev.note}</div>
                  <div className="font-mono text-[11px] text-slate-600 mt-1">{ev.date}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Key Findings */}
      <div className="bg-[#111b2a] border border-[#1e2d44] rounded-xl overflow-hidden" style={{ borderTop: '2px solid #f59e0b' }}>
        <div className="px-5 py-3 bg-[#0d1520] border-b border-[#1e2d44] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>{'\uD83D\uDCC4'}</span>
            <span className="text-[13px] font-bold text-slate-200 tracking-wide">Key Findings</span>
          </div>
          <span className="font-mono text-[11px] text-amber-400">{e.keyFindings.length} DOCUMENTS</span>
        </div>
        <div className="divide-y divide-[#1a2740]">
          {e.keyFindings.map((f, i) => {
            const isExpanded = expanded === i;
            return (
              <div key={i} className="transition-colors hover:bg-[#131f30]">
                <div className="flex items-center gap-4 px-5 py-3.5 cursor-pointer" onClick={() => setExpanded(isExpanded ? null : i)}>
                  <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-semibold text-slate-200">{f.title}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-[11px] text-amber-500">TIER {f.tier}</span>
                      <span className="text-[11px] text-slate-600">{'\u2022'}</span>
                      <span className="font-mono text-[11px] text-slate-500">{f.date}</span>
                    </div>
                  </div>
                  <span className="text-slate-500 text-xs shrink-0">{isExpanded ? '\u25BE' : '\u25B8'}</span>
                </div>
                {isExpanded && (
                  <div className="px-5 pb-4 pl-11">
                    <div className="text-[14px] text-slate-300 leading-relaxed p-4 rounded-lg bg-[#0a0f18] border border-[#1a2740]">{f.summary}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* OSINT Resources */}
      <div className="bg-[#111b2a] border border-[#1e2d44] rounded-xl overflow-hidden" style={{ borderTop: '2px solid #10b981' }}>
        <div className="px-5 py-3 bg-[#0d1520] border-b border-[#1e2d44] flex items-center gap-2">
          <span>{'\uD83D\uDD17'}</span>
          <span className="text-[13px] font-bold text-slate-200 tracking-wide">Community OSINT Resources</span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 p-4">
          {e.osintResources.map((r, i) => (
            <a key={i} href={r.url.startsWith('http') ? r.url : `https://${r.url}`} target="_blank" rel="noopener noreferrer"
              className="flex items-start gap-3 p-4 rounded-xl bg-white/[.02] border border-white/[.04] hover:border-green-500/30 hover:bg-green-500/[.03] transition-all group">
              <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0 group-hover:bg-green-500/20 transition-colors">
                <span className="text-green-400 text-sm">{'\u2197'}</span>
              </div>
              <div className="min-w-0">
                <div className="text-[14px] font-semibold text-green-400 group-hover:text-green-300">{r.name}</div>
                <div className="font-mono text-[11px] text-cyan-500/60 mt-0.5 truncate group-hover:text-cyan-400">{r.url}</div>
                <div className="text-[13px] text-slate-400 mt-1">{r.desc}</div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
