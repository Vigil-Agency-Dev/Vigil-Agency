'use client';

import React, { useState, useEffect } from 'react';
import { Dot } from '../ui';
import { EPSTEIN_INTEL } from '../../lib/mission-data';
import { formatAESTShort } from '../../lib/date-utils';

const VPS_API = process.env.NEXT_PUBLIC_VPS_ENDPOINT || 'https://ops.jr8ch.com';
const API_KEY = process.env.NEXT_PUBLIC_VIGIL_API_KEY || '';

function severityColor(s: string) {
  if (s === 'CRITICAL') return '#ef4444';
  if (s === 'HIGH') return '#f97316';
  if (s === 'MEDIUM' || s === 'ELEVATED') return '#f59e0b';
  return '#64748b';
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

function renderMarkdown(raw: string) {
  return raw.split('\n').slice(0, 200).map((line, i) => {
    const t = line.trim();
    if (!t) return <div key={i} className="h-1.5" />;
    if (t.startsWith('# ')) return <h2 key={i} className="text-base font-bold text-amber-400 mt-4 mb-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{t.slice(2)}</h2>;
    if (t.startsWith('## ')) return <h3 key={i} className="text-sm font-bold text-slate-200 mt-3 mb-1.5 border-b border-[#2a3550] pb-1">{t.slice(3)}</h3>;
    if (t.startsWith('### ')) return <h4 key={i} className="text-[13px] font-semibold text-purple-400 mt-2 mb-1">{t.slice(4)}</h4>;
    if (t.startsWith('- ') || t.startsWith('* ')) {
      const isImportant = /CRITICAL|TIER 1|CONFIRMED|DOCUMENTED|BREAKING/i.test(t);
      return <div key={i} className={`flex items-start gap-2 text-[12px] pl-3 py-0.5 ${isImportant ? 'text-amber-400 font-medium' : 'text-slate-400'}`}><span className="text-slate-600 mt-0.5">{'\u25B8'}</span><span>{t.slice(2)}</span></div>;
    }
    if (t.startsWith('**') && t.endsWith('**')) return <div key={i} className="text-[13px] font-semibold text-slate-200 mt-1">{t.replace(/\*\*/g, '')}</div>;
    const rendered = t.replace(/\*\*([^*]+)\*\*/g, '<b class="text-slate-200">$1</b>');
    return <div key={i} className="text-[12px] text-slate-400 leading-relaxed py-0.5" dangerouslySetInnerHTML={{ __html: rendered }} />;
  });
}

export default function EpsteinIntelTab() {
  const e = EPSTEIN_INTEL;
  const [isLive, setIsLive] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState<string | null>(null);
  const [liveData, setLiveData] = useState<any>(null);

  useEffect(() => {
    if (!API_KEY) return;
    async function fetchAll() {
      try {
        const res = await fetch(`${VPS_API}/api/mission/epstein-intel`, { headers: { 'x-api-key': API_KEY } });
        if (!res.ok) throw new Error(`${res.status}`);
        const data = await res.json();
        setLiveData(data);
        setIsLive(true);
      } catch { /* static fallback */ }
    }
    fetchAll();
    const interval = setInterval(fetchAll, 120000);
    return () => clearInterval(interval);
  }, []);

  const threats = liveData?.threats || [];
  const trajectory = liveData?.trajectory;
  const intelLogs = liveData?.intelLogs || [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 px-1">
        <Dot color={isLive ? '#10b981' : '#f59e0b'} pulse={isLive} />
        <span className="font-mono text-xs tracking-wider" style={{ color: isLive ? '#10b981' : '#f59e0b' }}>
          {isLive ? `LIVE \u2014 ${intelLogs.length} INTEL LOGS \u2022 ${threats.length} THREATS \u2022 ${e.osintResources.length} OSINT` : 'CONNECTING...'}
        </span>
      </div>

      {/* Header */}
      <div className="p-5 bg-gradient-to-r from-amber-500/[.08] to-red-500/[.04] border border-amber-500/20 rounded-xl">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xl">{'\uD83D\uDD0D'}</span>
          <h2 className="text-base font-bold text-amber-400" style={{ fontFamily: "'JetBrains Mono', monospace" }}>MERIDIAN INTELLIGENCE</h2>
        </div>
        <p className="text-[13px] text-slate-300 leading-relaxed">
          Epstein Files OSINT investigation. All data pulled live from VPS. Cross-referenced with Project Lumen via Intel Exchange.
        </p>
      </div>

      {/* Trajectory */}
      {trajectory && (
        <div className="bg-[#111b2a] border border-[#1e2d44] rounded-xl p-5" style={{ borderTop: '2px solid #8b5cf6' }}>
          <div className="flex items-center gap-2 mb-3">
            <span>{'\uD83D\uDCC8'}</span>
            <span className="text-[13px] font-bold text-slate-200">Trajectory Assessment</span>
            {liveData?.trajectoryFile && <span className="font-mono text-[10px] text-slate-600">{liveData.trajectoryFile}</span>}
          </div>
          {trajectory.overall_probability != null && (
            <div className="flex items-center gap-4 mb-3">
              <span className="text-2xl font-bold font-mono text-purple-400">{Math.round(typeof trajectory.overall_probability === 'number' && trajectory.overall_probability < 1 ? trajectory.overall_probability * 100 : trajectory.overall_probability)}%</span>
              <span className="text-[12px] text-slate-400">Breakthrough Disclosure Probability</span>
            </div>
          )}
          {trajectory.assessment && <div className="text-[12px] text-slate-300 leading-relaxed p-3 rounded-lg bg-purple-500/[.06] border border-purple-500/[.12]">{trajectory.assessment}</div>}
        </div>
      )}

      {/* MERIDIAN Threat Register */}
      {threats.length > 0 && (
        <div className="bg-[#111b2a] border border-[#1e2d44] rounded-xl overflow-hidden" style={{ borderTop: '2px solid #ef4444' }}>
          <div className="px-5 py-3 bg-[#0d1520] border-b border-[#1e2d44] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>{'\u26A0\uFE0F'}</span>
              <span className="text-[13px] font-bold text-slate-200">MERIDIAN Threat Register</span>
              <Dot color="#10b981" pulse />
              <span className="font-mono text-[10px] text-green-500">LIVE</span>
            </div>
            <span className="font-mono text-[11px] text-red-400">{threats.filter((t: any) => t.status === 'ACTIVE').length} ACTIVE</span>
          </div>
          <div className="divide-y divide-[#1a2740]">
            {threats.map((t: any, i: number) => (
              <div key={t.id || i} className="flex items-start gap-3 px-5 py-3">
                <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: severityColor(t.severity) }} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[11px] text-slate-500">{t.id}</span>
                    <span className="text-[13px] font-semibold text-slate-200">{t.title}</span>
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded" style={{ background: `${severityColor(t.severity)}15`, color: severityColor(t.severity) }}>{t.severity}</span>
                    <span className="font-mono text-[10px] text-slate-500">{t.status}</span>
                  </div>
                  <div className="text-[12px] text-slate-400 mt-0.5 leading-relaxed">{t.detail || t.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Intel Logs — LIVE */}
      <div className="bg-[#111b2a] border border-[#1e2d44] rounded-xl overflow-hidden" style={{ borderTop: '2px solid #f59e0b' }}>
        <div className="px-5 py-3 bg-[#0d1520] border-b border-[#1e2d44] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>{'\uD83D\uDCC4'}</span>
            <span className="text-[13px] font-bold text-slate-200">MERIDIAN Intel Logs</span>
            {isLive && <><Dot color="#10b981" pulse /><span className="font-mono text-[10px] text-green-500">LIVE</span></>}
          </div>
          <span className="font-mono text-[11px] text-amber-400">{intelLogs.length} LOGS</span>
        </div>
        <div className="divide-y divide-[#1a2740]">
          {(intelLogs.length > 0 ? intelLogs : e.keyFindings.map((f: any) => ({ filename: f.title, date: f.date, findings: [f.summary], sections: [], raw: '' }))).map((log: any, i: number) => {
            const isExpanded = expanded === (log.filename || `log-${i}`);
            const isRawVisible = showRaw === (log.filename || `log-${i}`);
            return (
              <div key={log.filename || i} className="hover:bg-[#131f30] transition-colors">
                <div className="flex items-center gap-3 px-5 py-3 cursor-pointer" onClick={() => setExpanded(isExpanded ? null : (log.filename || `log-${i}`))}>
                  <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-slate-200">{log.filename || log.title}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-[11px] text-slate-500">{log.date}</span>
                      {log.findings?.length > 0 && <span className="font-mono text-[10px] text-amber-400">{log.findings.length} findings</span>}
                      {log.sections?.length > 0 && <span className="font-mono text-[10px] text-slate-600">{log.sections.length} sections</span>}
                    </div>
                  </div>
                  <span className="text-slate-500 text-xs">{isExpanded ? '\u25BE' : '\u25B8'}</span>
                </div>
                {isExpanded && (
                  <div className="px-5 pb-4">
                    {/* Findings */}
                    {log.findings?.length > 0 && (
                      <div className="mb-3">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Key Findings</div>
                        {log.findings.slice(0, 10).map((f: string, j: number) => (
                          <div key={j} className="text-[12px] text-slate-400 py-1 pl-3 border-l-2 border-amber-500/20 mb-0.5 leading-relaxed">{f}</div>
                        ))}
                      </div>
                    )}
                    {/* View full document */}
                    {log.raw && (
                      <div className="flex items-center gap-2 mb-2">
                        <button onClick={(ev) => { ev.stopPropagation(); setShowRaw(isRawVisible ? null : (log.filename || `log-${i}`)); }}
                          className="font-mono text-[11px] px-3 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/20 transition-colors">
                          {isRawVisible ? '\u25BE HIDE DOCUMENT' : '\u25B8 VIEW FULL DOCUMENT'}
                        </button>
                        <button onClick={(ev) => { ev.stopPropagation(); const blob = new Blob([log.raw], { type: 'text/markdown' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = log.filename; a.click(); URL.revokeObjectURL(url); }}
                          className="font-mono text-[11px] px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/20 transition-colors">
                          {'\u2B07'} DOWNLOAD
                        </button>
                      </div>
                    )}
                    {isRawVisible && log.raw && (
                      <div className="bg-[#0a0f18] rounded-xl p-5 border border-[#1a2740] max-h-[70vh] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                        {renderMarkdown(log.raw)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Critical Events */}
      <div className="bg-[#111b2a] border border-[#1e2d44] rounded-xl overflow-hidden" style={{ borderTop: '2px solid #ef4444' }}>
        <div className="px-5 py-3 bg-[#0d1520] border-b border-[#1e2d44] flex items-center gap-2">
          <span>{'\uD83D\uDCC5'}</span>
          <span className="text-[13px] font-bold text-slate-200">Critical Events Timeline</span>
        </div>
        <div className="p-4 space-y-3">
          {e.upcomingEvents.map((ev: any, i: number) => {
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
                    <span className="text-[13px] font-bold text-slate-200">{ev.event}</span>
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded font-bold" style={{ background: `${color}15`, color }}>{ev.priority}</span>
                  </div>
                  <div className="text-[12px] text-slate-400 leading-relaxed">{ev.note}</div>
                  <div className="font-mono text-[11px] text-slate-600 mt-1">{ev.date}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* OSINT Resources */}
      <div className="bg-[#111b2a] border border-[#1e2d44] rounded-xl overflow-hidden" style={{ borderTop: '2px solid #10b981' }}>
        <div className="px-5 py-3 bg-[#0d1520] border-b border-[#1e2d44] flex items-center gap-2">
          <span>{'\uD83D\uDD17'}</span>
          <span className="text-[13px] font-bold text-slate-200">Community OSINT Resources</span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 p-4">
          {e.osintResources.map((r: any, i: number) => (
            <a key={i} href={r.url.startsWith('http') ? r.url : `https://${r.url}`} target="_blank" rel="noopener noreferrer"
              className="flex items-start gap-3 p-4 rounded-xl bg-white/[.02] border border-white/[.04] hover:border-green-500/30 hover:bg-green-500/[.03] transition-all group">
              <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0 group-hover:bg-green-500/20 transition-colors">
                <span className="text-green-400 text-sm">{'\u2197'}</span>
              </div>
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-green-400 group-hover:text-green-300">{r.name}</div>
                <div className="font-mono text-[11px] text-cyan-500/60 mt-0.5 truncate group-hover:text-cyan-400">{r.url}</div>
                <div className="text-[12px] text-slate-400 mt-1">{r.desc}</div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
