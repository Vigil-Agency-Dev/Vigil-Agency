'use client';

import React, { useState, useEffect } from 'react';
import { Badge, Card, Dot } from '../ui';
import { INTEL_REPORTS } from '../../lib/mission-data';

const VPS_API = process.env.NEXT_PUBLIC_VPS_ENDPOINT || 'https://ops.jr8ch.com';
const API_KEY = process.env.NEXT_PUBLIC_VIGIL_API_KEY || '';

interface LiveIntelReport {
  filename: string;
  heartbeat: number | null;
  timestamp: string;
  phase: string | null;
  opsec: string | null;
  priority: string;
  actionsCount: number;
  findings: string[];
  questions: string[];
  threatCluster: unknown;
  allies: unknown;
  redFlags: string[];
}

const PAGE_SIZE = 10;

function priorityColor(p: string) {
  if (p === 'CRITICAL' || p === 'HIGH') return '#ef4444';
  if (p === 'ELEVATED' || p === 'MEDIUM') return '#f59e0b';
  return '#64748b';
}

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 1) return `${Math.floor(diff / 60000)}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function hasContent(r: LiveIntelReport) {
  return (r.findings?.length > 0) || (r.questions?.length > 0) || (r.redFlags?.length > 0) || r.actionsCount > 0;
}

export default function IntelReportsTab({ realm }: { realm?: 'ai' | 'human' }) {
  const realmLabel = realm === 'human' ? 'HUMINT — Human Realm (AXIOM)' : 'SIGINT — AI Realm (ClarionAgent)';
  const realmColor = realm === 'human' ? '#f59e0b' : '#06b6d4';
  const [liveReports, setLiveReports] = useState<LiveIntelReport[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [filterPriority, setFilterPriority] = useState<string | null>(null);
  const [showEmpty, setShowEmpty] = useState(false);

  useEffect(() => {
    if (!API_KEY) return;
    async function fetchIntel() {
      try {
        // Fetch from appropriate endpoint based on realm
        const endpoints = realm === 'human'
          ? [`${VPS_API}/api/mission/intel?limit=100&source=axiom`]
          : [`${VPS_API}/api/mission/intel?limit=100`];

        let allReports: LiveIntelReport[] = [];
        for (const ep of endpoints) {
          const res = await fetch(ep, { headers: { 'x-api-key': API_KEY } });
          if (!res.ok) continue;
          const data = await res.json();
          const reports = Array.isArray(data) ? data : data.reports || data.data || [];
          allReports = [...allReports, ...reports];
        }

        // Filter by realm
        if (realm === 'human') {
          allReports = allReports.filter(r => r.filename?.includes('axiom') || r.filename?.includes('humint'));
        } else if (realm === 'ai') {
          allReports = allReports.filter(r => !r.filename?.includes('axiom') && !r.filename?.includes('humint'));
        }

        if (allReports.length > 0) { setLiveReports(allReports); setIsLive(true); }
      } catch { /* static fallback */ }
    }
    fetchIntel();
    const interval = setInterval(fetchIntel, 60000);
    return () => clearInterval(interval);
  }, []);

  if (isLive && liveReports.length > 0) {
    let filtered = liveReports;
    if (filterPriority) filtered = filtered.filter(r => r.priority === filterPriority);
    if (!showEmpty) filtered = filtered.filter(r => hasContent(r));

    const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
    const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    const withContent = liveReports.filter(hasContent).length;
    const priorities = [...new Set(liveReports.map(r => r.priority))];

    return (
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Dot color="#10b981" pulse />
            <span className="font-mono text-xs tracking-wider" style={{ color: realmColor }}>{realmLabel} — {liveReports.length} REPORTS</span>
            <span className="font-mono text-xs text-slate-600">({withContent} with findings)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEmpty(!showEmpty)}
              className={`font-mono text-[11px] px-2.5 py-1 rounded transition-colors ${showEmpty ? 'bg-slate-700 text-slate-300' : 'bg-[#1a2235] text-slate-500 hover:text-slate-300'}`}
            >
              {showEmpty ? 'HIDE EMPTY' : 'SHOW ALL'}
            </button>
          </div>
        </div>

        {/* Priority filters */}
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => { setFilterPriority(null); setPage(0); }}
            className={`py-1 px-3 rounded text-[11px] font-mono transition-colors ${!filterPriority ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30' : 'bg-[#1a2235] text-slate-500 border border-transparent hover:text-slate-300'}`}
          >
            ALL ({filtered.length})
          </button>
          {priorities.map(p => (
            <button
              key={p}
              onClick={() => { setFilterPriority(filterPriority === p ? null : p); setPage(0); }}
              className={`py-1 px-3 rounded text-[11px] font-mono transition-colors ${filterPriority === p ? `text-white border` : 'bg-[#1a2235] text-slate-500 border border-transparent hover:text-slate-300'}`}
              style={filterPriority === p ? { background: `${priorityColor(p)}20`, borderColor: `${priorityColor(p)}40`, color: priorityColor(p) } : {}}
            >
              {p} ({liveReports.filter(r => r.priority === p).length})
            </button>
          ))}
        </div>

        {/* Reports */}
        <div className="space-y-2">
          {paged.map((r, i) => {
            const id = `${r.filename}-${i}`;
            const isExpanded = expanded === id;
            const content = hasContent(r);

            return (
              <div
                key={id}
                className={`bg-[#111b2a] border border-[#1e2d44] rounded-xl overflow-hidden transition-all ${isExpanded ? 'ring-1 ring-cyan-500/20' : ''}`}
              >
                {/* Row header — always visible */}
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[#131f30] transition-colors"
                  onClick={() => setExpanded(isExpanded ? null : id)}
                >
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: priorityColor(r.priority) }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-semibold text-slate-200 truncate">{r.filename}</span>
                      {r.heartbeat && <span className="font-mono text-[11px] text-cyan-500">HB #{r.heartbeat}</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="font-mono text-[11px] text-slate-500">{r.timestamp ? new Date(r.timestamp).toLocaleString('en-AU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}</span>
                      {r.timestamp && <span className="text-[11px] text-slate-600">{timeAgo(r.timestamp)}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {r.opsec && <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-green-500/10 text-green-500">{typeof r.opsec === 'object' ? (r.opsec as any).status : r.opsec}</span>}
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded" style={{ background: `${priorityColor(r.priority)}15`, color: priorityColor(r.priority) }}>{r.priority}</span>
                    {content && <span className="text-[10px] text-cyan-500">{r.findings?.length || 0} findings</span>}
                    <span className="text-slate-500 text-xs">{isExpanded ? '\u25BE' : '\u25B8'}</span>
                  </div>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-[#1e2d44]">
                    {r.findings?.length > 0 && (
                      <div className="mt-3">
                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Key Findings</div>
                        {r.findings.map((f, j) => {
                          const isCritical = /CRITICAL|RED FLAG|ELEVATED|URGENT/i.test(f);
                          return (
                            <div key={j} className="text-[13px] text-slate-300 py-2 px-3 mb-1 rounded-lg leading-relaxed" style={{
                              background: isCritical ? 'rgba(239,68,68,.06)' : 'rgba(255,255,255,.02)',
                              borderLeft: isCritical ? '3px solid #ef4444' : '3px solid #2a3550',
                            }}>
                              {isCritical ? <span className="font-semibold text-red-400">{f}</span> : f}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {r.questions?.length > 0 && (
                      <div className="mt-3">
                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Agent Questions</div>
                        {r.questions.map((q, j) => (
                          <div key={j} className="text-[13px] text-cyan-300 py-2 px-3 mb-1 rounded-lg bg-cyan-500/[.06] border-l-[3px] border-cyan-500">
                            {q}
                          </div>
                        ))}
                      </div>
                    )}

                    {r.redFlags?.length > 0 && (
                      <div className="mt-3">
                        <div className="text-[11px] font-bold text-red-400 uppercase tracking-wider mb-2">Red Flags</div>
                        {r.redFlags.map((rf, j) => (
                          <div key={j} className="text-[13px] text-red-300 py-2 px-3 mb-1 rounded-lg bg-red-500/[.08] border-l-[3px] border-red-500">
                            {rf}
                          </div>
                        ))}
                      </div>
                    )}

                    {!content && (
                      <div className="mt-3 text-center py-4 text-[13px] text-slate-600">
                        No findings, questions, or red flags in this report.
                      </div>
                    )}

                    {/* Meta */}
                    <div className="mt-3 pt-3 border-t border-[#1e2d44] flex items-center gap-4 text-[11px] text-slate-600 font-mono">
                      {r.phase && <span>Phase: {r.phase}</span>}
                      <span>Actions: {r.actionsCount}</span>
                      <span>{r.filename}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="font-mono text-[11px] px-3 py-1.5 rounded bg-[#1a2235] text-slate-400 hover:text-slate-200 disabled:opacity-30 transition-colors"
            >
              \u2190 PREV
            </button>
            <span className="font-mono text-[11px] text-slate-500">
              {page + 1} / {totalPages} ({filtered.length} reports)
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="font-mono text-[11px] px-3 py-1.5 rounded bg-[#1a2235] text-slate-400 hover:text-slate-200 disabled:opacity-30 transition-colors"
            >
              NEXT \u2192
            </button>
          </div>
        )}
      </div>
    );
  }

  // Static fallback
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 px-1">
        <Dot color="#f59e0b" />
        <span className="font-mono text-xs tracking-wider text-amber-500">STATIC FALLBACK — VPS UNREACHABLE</span>
      </div>

      {[...INTEL_REPORTS].reverse().map((r, i) => (
        <Card key={i} title={`Heartbeat #${r.heartbeat} — ${r.date}`} icon="&#x1F4E1;" accent="#06b6d4" full>
          <div className="flex gap-2.5 mb-3.5 flex-wrap">
            {[
              { l: 'Phase', v: r.phase, c: '#06b6d4' },
              { l: 'OPSEC', v: typeof r.opsec === 'object' ? (r.opsec as any).status : r.opsec, c: '#10b981' },
              { l: 'Actions', v: r.actions, c: '#8b5cf6' },
              { l: 'Comments', v: r.comments, c: '#3b82f6' },
            ].map((x, j) => (
              <div key={j} className="py-1 px-3 rounded text-[11px]" style={{ background: `${x.c}15`, border: `1px solid ${x.c}30` }}>
                {x.l}: <span className="font-mono font-semibold" style={{ color: x.c }}>{x.v}</span>
              </div>
            ))}
          </div>
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Key Findings</div>
          {r.findings.map((f, j) => (
            <div key={j} className="text-[13px] text-slate-300 py-2 px-3 mb-1 rounded-lg leading-relaxed" style={{
              background: f.includes('CRITICAL') ? 'rgba(239,68,68,.06)' : 'rgba(255,255,255,.02)',
              borderLeft: f.includes('CRITICAL') ? '3px solid #ef4444' : '3px solid #2a3550',
            }}>
              {f.includes('CRITICAL') ? <span className="font-semibold text-red-400">{f}</span> : f}
            </div>
          ))}
          {r.actionsDetail?.length > 0 && (
            <div className="mt-3">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Actions Taken</div>
              {r.actionsDetail.map((a, j) => (
                <div key={j} className="flex items-center gap-3 py-1.5 px-3 text-[13px] text-slate-400 mb-1">
                  <span style={{ color: a.verified ? '#10b981' : '#64748b' }}>{a.verified ? '\u2705' : '\uD83D\uDCCB'}</span>
                  <span className="font-mono text-[10px] text-purple-400 min-w-[60px]">{a.type}</span>
                  <span>{a.target}</span>
                  <span className="text-slate-500 text-[12px]">\u2014 {a.purpose}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
