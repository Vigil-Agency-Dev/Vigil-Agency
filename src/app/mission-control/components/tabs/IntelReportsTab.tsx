'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Dot } from '../ui';
import { formatAESTShort, timeAgo as timeAgoUtil } from '../../lib/date-utils';

const VPS_API = process.env.NEXT_PUBLIC_VPS_ENDPOINT || 'https://ops.jr8ch.com';
const API_KEY = process.env.NEXT_PUBLIC_VIGIL_API_KEY || '';

type Theatre = 'sigint' | 'humint';

interface RawIntelReport {
  filename: string;
  callsign?: string;
  heartbeat: number | null;
  timestamp: string;
  modified?: string;
  phase: string | null;
  opsec: string | null | { status?: string };
  priority: string;
  actionsCount: number;
  findings: string[];
  questions: string[];
  threatCluster: unknown;
  allies: unknown;
  redFlags: string[];
}

interface AnalystSynthesis {
  filename: string;
  callsign?: string;
  modified: string;
  sizeBytes?: number;
  title: string;
  classification: string | null;
  filed_by: string | null;
  period_start: string | null;
  period_end: string | null;
  message_count: number | null;
  summary: string;
  body: string;
}

const THEATRE_META: Record<Theatre, { label: string; color: string; agent: string; platform: string; analystNote: string }> = {
  sigint: {
    label: 'SIGINT Theatre',
    color: '#06b6d4',
    agent: 'ClarionAgent',
    platform: 'Moltbook',
    analystNote: "Clarion Intel Analyst synthesises the agent's observation window into intel briefs. Raw intel above reflects per-cycle heartbeats; analyst briefs below correlate across cycles.",
  },
  humint: {
    label: 'HUMINT Theatre',
    color: '#f59e0b',
    agent: 'Cairn',
    platform: 'Telegram',
    analystNote: "Cairn Intel Analyst drains the 2-hour observation buffer of public-channel posts and group messages into synthesis briefs. Raw intel above are directive-execution artefacts; analyst briefs below are pattern synthesis over the observation surface.",
  },
};

const PAGE_SIZE = 8;

function priorityColor(p: string) {
  if (p === 'CRITICAL' || p === 'HIGH') return '#ef4444';
  if (p === 'ELEVATED' || p === 'MEDIUM') return '#f59e0b';
  return '#64748b';
}

function timeAgo(ts: string) { return timeAgoUtil(ts); }

function hasContent(r: RawIntelReport) {
  return (r.findings?.length > 0) || (r.questions?.length > 0) || (r.redFlags?.length > 0) || r.actionsCount > 0;
}

// Map legacy 'ai'/'human' realm prop to new theatre model.
function realmToTheatre(realm?: 'ai' | 'human'): Theatre {
  return realm === 'human' ? 'humint' : 'sigint';
}

export default function IntelReportsTab({ realm }: { realm?: 'ai' | 'human' }) {
  const theatre: Theatre = realmToTheatre(realm);
  const meta = THEATRE_META[theatre];

  const [rawReports, setRawReports] = useState<RawIntelReport[]>([]);
  const [syntheses, setSyntheses] = useState<AnalystSynthesis[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Raw panel state
  const [rawExpanded, setRawExpanded] = useState<string | null>(null);
  const [rawPage, setRawPage] = useState(0);
  const [rawFilterAgent, setRawFilterAgent] = useState<string | null>(null);
  const [rawFilterPriority, setRawFilterPriority] = useState<string | null>(null);
  const [rawShowEmpty, setRawShowEmpty] = useState(false);

  // Analyst panel state
  const [synthExpanded, setSynthExpanded] = useState<string | null>(null);
  const [synthFilterAgent, setSynthFilterAgent] = useState<string | null>(null);

  useEffect(() => {
    if (!API_KEY) return;
    let cancelled = false;

    async function load() {
      try {
        const [rawRes, synthRes] = await Promise.all([
          fetch(`${VPS_API}/api/mission/intel?theatre=${theatre}&limit=100`, { headers: { 'x-api-key': API_KEY } }),
          fetch(`${VPS_API}/api/mission/intel-analyst?theatre=${theatre}&limit=50`, { headers: { 'x-api-key': API_KEY } }),
        ]);
        if (cancelled) return;

        if (rawRes.ok) {
          const data = await rawRes.json();
          setRawReports(data.reports || []);
        }
        if (synthRes.ok) {
          const data = await synthRes.json();
          setSyntheses(data.syntheses || []);
        }
        setIsLive(true);
        setLastUpdated(new Date().toISOString());
      } catch {
        /* leave prior state on transient failure */
      }
    }

    load();
    const interval = setInterval(load, 60000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [theatre]);

  // Collect agent callsigns present in this theatre's data (for sibling filter chips).
  const rawAgents = useMemo(() => {
    const set = new Set<string>();
    rawReports.forEach(r => r.callsign && set.add(r.callsign));
    return Array.from(set).sort();
  }, [rawReports]);

  const synthAgents = useMemo(() => {
    const set = new Set<string>();
    syntheses.forEach(s => s.callsign && set.add(s.callsign));
    return Array.from(set).sort();
  }, [syntheses]);

  // Raw filtering + paging
  const rawBase = rawShowEmpty ? rawReports : rawReports.filter(hasContent);
  const rawByAgent = rawFilterAgent ? rawBase.filter(r => r.callsign === rawFilterAgent) : rawBase;
  const rawFiltered = rawFilterPriority ? rawByAgent.filter(r => r.priority === rawFilterPriority) : rawByAgent;
  const rawTotalPages = Math.max(1, Math.ceil(rawFiltered.length / PAGE_SIZE));
  const rawPaged = rawFiltered.slice(rawPage * PAGE_SIZE, (rawPage + 1) * PAGE_SIZE);
  const rawPriorities = Array.from(new Set(rawByAgent.map(r => r.priority))).filter(Boolean);

  // Synth filtering
  const synthFiltered = synthFilterAgent ? syntheses.filter(s => s.callsign === synthFilterAgent) : syntheses;

  return (
    <div className="flex flex-col gap-5">
      {/* Theatre Header */}
      <div className="rounded-xl border p-4" style={{ background: `${meta.color}08`, borderColor: `${meta.color}20`, borderLeft: `3px solid ${meta.color}` }}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <Dot color={isLive ? '#10b981' : '#f59e0b'} pulse={isLive} />
            <div>
              <div className="text-[14px] font-bold tracking-wide" style={{ color: meta.color }}>{meta.label}</div>
              <div className="text-[11px] text-slate-500">
                {meta.agent} · {meta.platform}
                {rawAgents.length > 0 && rawAgents.length !== 1 ? ` · ${rawAgents.length} agents` : ''}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 font-mono text-[11px] text-slate-500">
            <span>{rawReports.length} intel</span>
            <span>·</span>
            <span>{syntheses.length} analyst briefs</span>
            {lastUpdated && <span className="text-slate-600">· {formatAESTShort(lastUpdated)}</span>}
          </div>
        </div>
      </div>

      {/* =========================== RAW INTEL FEED =========================== */}
      <section className="bg-[#0d1520] border border-[#1e2d44] rounded-xl overflow-hidden">
        <div className="px-4 py-2.5 bg-[#111d2e] border-b border-[#1e2d44] flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] font-bold tracking-wider" style={{ color: meta.color }}>RAW INTEL FEED</span>
            <span className="font-mono text-[10px] text-slate-600">· {rawFiltered.length} / {rawReports.length} reports</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setRawShowEmpty(!rawShowEmpty)}
              className={`font-mono text-[10px] px-2 py-0.5 rounded transition-colors ${rawShowEmpty ? 'bg-slate-700 text-slate-300' : 'bg-[#1a2235] text-slate-500 hover:text-slate-300'}`}
            >
              {rawShowEmpty ? 'HIDE EMPTY' : 'SHOW ALL'}
            </button>
          </div>
        </div>

        {/* Agent + priority filter bar (agents show when more than one is in play — future siblings slot in cleanly) */}
        {(rawAgents.length > 1 || rawPriorities.length > 0) && (
          <div className="px-4 py-2.5 border-b border-[#1a2740] flex items-center gap-3 flex-wrap bg-[#0a1220]">
            {rawAgents.length > 1 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-mono text-[9px] text-slate-600 uppercase tracking-wider mr-1">Agent</span>
                <button
                  onClick={() => { setRawFilterAgent(null); setRawPage(0); }}
                  className={`font-mono text-[10px] px-2 py-0.5 rounded transition-colors ${!rawFilterAgent ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30' : 'bg-[#1a2235] text-slate-500 border border-transparent hover:text-slate-300'}`}
                >
                  ALL
                </button>
                {rawAgents.map(a => (
                  <button
                    key={a}
                    onClick={() => { setRawFilterAgent(rawFilterAgent === a ? null : a); setRawPage(0); }}
                    className={`font-mono text-[10px] px-2 py-0.5 rounded transition-colors ${rawFilterAgent === a ? 'text-white' : 'bg-[#1a2235] text-slate-500 hover:text-slate-300'}`}
                    style={rawFilterAgent === a ? { background: `${meta.color}25`, color: meta.color } : {}}
                  >
                    {a.toUpperCase()}
                  </button>
                ))}
              </div>
            )}
            {rawPriorities.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-mono text-[9px] text-slate-600 uppercase tracking-wider mr-1">Priority</span>
                <button
                  onClick={() => { setRawFilterPriority(null); setRawPage(0); }}
                  className={`font-mono text-[10px] px-2 py-0.5 rounded transition-colors ${!rawFilterPriority ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30' : 'bg-[#1a2235] text-slate-500 border border-transparent hover:text-slate-300'}`}
                >
                  ALL
                </button>
                {rawPriorities.map(p => (
                  <button
                    key={p}
                    onClick={() => { setRawFilterPriority(rawFilterPriority === p ? null : p); setRawPage(0); }}
                    className={`font-mono text-[10px] px-2 py-0.5 rounded transition-colors ${rawFilterPriority === p ? 'text-white' : 'bg-[#1a2235] text-slate-500 hover:text-slate-300'}`}
                    style={rawFilterPriority === p ? { background: `${priorityColor(p)}25`, color: priorityColor(p) } : {}}
                  >
                    {p} ({rawByAgent.filter(r => r.priority === p).length})
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Cards */}
        {rawFiltered.length === 0 ? (
          <div className="text-center py-10 text-[13px] text-slate-500">
            {isLive ? `No ${meta.label.toLowerCase()} intel in the current window.` : 'Connecting...'}
          </div>
        ) : (
          <div className="divide-y divide-[#1a2740]">
            {rawPaged.map((r, i) => {
              const id = `${r.filename}-${i}`;
              const isExpanded = rawExpanded === id;
              const content = hasContent(r);
              const opsec = typeof r.opsec === 'object' && r.opsec ? (r.opsec as any).status : r.opsec;
              return (
                <div key={id} className={`transition-colors ${isExpanded ? 'bg-[#131f30]' : 'hover:bg-[#131f30]'}`}>
                  <div
                    className="flex items-center gap-3 px-4 py-2.5 cursor-pointer"
                    onClick={() => setRawExpanded(isExpanded ? null : id)}
                  >
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: priorityColor(r.priority) }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {r.callsign && (
                          <span className="font-mono text-[9px] px-1.5 py-0.5 rounded" style={{ background: `${meta.color}15`, color: meta.color }}>
                            {r.callsign.toUpperCase()}
                          </span>
                        )}
                        <span className="text-[13px] font-semibold text-slate-200 truncate">{r.filename}</span>
                        {r.heartbeat && <span className="font-mono text-[10px] text-cyan-500">HB#{r.heartbeat}</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="font-mono text-[10px] text-slate-500">{formatAESTShort(r.timestamp || r.modified || '')}</span>
                        {r.timestamp && <span className="text-[10px] text-slate-600">{timeAgo(r.timestamp)}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {opsec && <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-500">{opsec}</span>}
                      <span className="font-mono text-[9px] px-1.5 py-0.5 rounded" style={{ background: `${priorityColor(r.priority)}15`, color: priorityColor(r.priority) }}>{r.priority}</span>
                      {content && <span className="text-[9px] text-cyan-500">{r.findings?.length || 0}f</span>}
                      <span className="text-slate-500 text-xs">{isExpanded ? '▾' : '▸'}</span>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="px-4 pb-3 pt-0">
                      {r.findings?.length > 0 && (
                        <div className="mt-1">
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Key Findings</div>
                          {r.findings.map((f, j) => {
                            const isCritical = /CRITICAL|RED FLAG|ELEVATED|URGENT/i.test(f);
                            return (
                              <div key={j} className="text-[12px] text-slate-300 py-1.5 px-3 mb-1 rounded leading-relaxed" style={{
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
                        <div className="mt-2">
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Agent Questions</div>
                          {r.questions.map((q, j) => (
                            <div key={j} className="text-[12px] text-cyan-300 py-1.5 px-3 mb-1 rounded bg-cyan-500/[.06] border-l-[3px] border-cyan-500">
                              {q}
                            </div>
                          ))}
                        </div>
                      )}
                      {r.redFlags?.length > 0 && (
                        <div className="mt-2">
                          <div className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-1.5">Red Flags</div>
                          {r.redFlags.map((rf, j) => (
                            <div key={j} className="text-[12px] text-red-300 py-1.5 px-3 mb-1 rounded bg-red-500/[.08] border-l-[3px] border-red-500">
                              {rf}
                            </div>
                          ))}
                        </div>
                      )}
                      {!content && (
                        <div className="mt-1 text-center py-3 text-[12px] text-slate-600">
                          No findings, questions, or red flags in this report.
                        </div>
                      )}
                      <div className="mt-2 pt-2 border-t border-[#1e2d44] flex items-center gap-4 text-[10px] text-slate-600 font-mono flex-wrap">
                        {r.phase && <span>Phase: {r.phase}</span>}
                        <span>Actions: {r.actionsCount}</span>
                        <span className="truncate">{r.filename}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {rawTotalPages > 1 && (
          <div className="px-4 py-2 border-t border-[#1a2740] flex items-center justify-center gap-3 bg-[#0a1220]">
            <button
              onClick={() => setRawPage(Math.max(0, rawPage - 1))}
              disabled={rawPage === 0}
              className="font-mono text-[10px] px-2.5 py-1 rounded bg-[#1a2235] text-slate-400 hover:text-slate-200 disabled:opacity-30 transition-colors"
            >
              ← PREV
            </button>
            <span className="font-mono text-[10px] text-slate-500">
              {rawPage + 1} / {rawTotalPages} ({rawFiltered.length})
            </span>
            <button
              onClick={() => setRawPage(Math.min(rawTotalPages - 1, rawPage + 1))}
              disabled={rawPage >= rawTotalPages - 1}
              className="font-mono text-[10px] px-2.5 py-1 rounded bg-[#1a2235] text-slate-400 hover:text-slate-200 disabled:opacity-30 transition-colors"
            >
              NEXT →
            </button>
          </div>
        )}
      </section>

      {/* ==================== INTEL ANALYST SYNTHESIS FEED ==================== */}
      <section className="bg-[#0d1520] border rounded-xl overflow-hidden" style={{ borderColor: 'rgba(139,92,246,0.25)' }}>
        <div className="px-4 py-2.5 bg-[#111d2e] border-b flex items-center justify-between flex-wrap gap-2" style={{ borderColor: 'rgba(139,92,246,0.2)' }}>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] font-bold tracking-wider text-purple-400">INTEL ANALYST SYNTHESIS</span>
            <span className="font-mono text-[10px] text-slate-600">· {synthFiltered.length} / {syntheses.length} briefs</span>
          </div>
          <div className="font-mono text-[9px] text-slate-600 italic">
            Synthesis ≠ raw intel. Read as pattern-level interpretation.
          </div>
        </div>

        {/* Agent filter (surfaces when more than one analyst is filing) */}
        {synthAgents.length > 1 && (
          <div className="px-4 py-2 border-b border-[#1a2740] flex items-center gap-1.5 flex-wrap bg-[#0a1220]">
            <span className="font-mono text-[9px] text-slate-600 uppercase tracking-wider mr-1">Analyst</span>
            <button
              onClick={() => setSynthFilterAgent(null)}
              className={`font-mono text-[10px] px-2 py-0.5 rounded transition-colors ${!synthFilterAgent ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30' : 'bg-[#1a2235] text-slate-500 hover:text-slate-300'}`}
            >
              ALL
            </button>
            {synthAgents.map(a => (
              <button
                key={a}
                onClick={() => setSynthFilterAgent(synthFilterAgent === a ? null : a)}
                className={`font-mono text-[10px] px-2 py-0.5 rounded transition-colors ${synthFilterAgent === a ? 'bg-purple-500/20 text-purple-300' : 'bg-[#1a2235] text-slate-500 hover:text-slate-300'}`}
              >
                {a.toUpperCase()} ANALYST
              </button>
            ))}
          </div>
        )}

        {/* Analyst brief cards */}
        {synthFiltered.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <div className="text-[12px] text-slate-500 mb-1">No analyst briefs filed yet.</div>
            <div className="text-[10px] text-slate-600 italic">{meta.analystNote}</div>
          </div>
        ) : (
          <div className="divide-y divide-[#1a2740]">
            {synthFiltered.map(s => {
              const id = s.filename;
              const isExpanded = synthExpanded === id;
              return (
                <div key={id} className={`transition-colors ${isExpanded ? 'bg-[#0f1428]' : 'hover:bg-[#0f1428]'}`}>
                  <div
                    className="px-4 py-2.5 cursor-pointer"
                    onClick={() => setSynthExpanded(isExpanded ? null : id)}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">ANALYST</span>
                      {s.callsign && (
                        <span className="font-mono text-[9px] px-1.5 py-0.5 rounded" style={{ background: `${meta.color}15`, color: meta.color }}>
                          {s.callsign.toUpperCase()}
                        </span>
                      )}
                      <span className="text-[13px] font-semibold text-slate-200 truncate flex-1 min-w-0">{s.title}</span>
                      <span className="font-mono text-[10px] text-slate-500 shrink-0">{formatAESTShort(s.modified)}</span>
                      <span className="text-slate-500 text-xs shrink-0">{isExpanded ? '▾' : '▸'}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap font-mono text-[9px] text-slate-500">
                      {s.period_start && s.period_end && (
                        <span>Window: {formatAESTShort(s.period_start)} → {formatAESTShort(s.period_end)}</span>
                      )}
                      {s.message_count !== null && s.message_count !== undefined && (
                        <span>{s.message_count} observations</span>
                      )}
                      {s.classification && <span className="text-amber-500">{s.classification}</span>}
                    </div>
                    {!isExpanded && s.summary && (
                      <div className="mt-1.5 text-[12px] text-slate-400 leading-snug line-clamp-2">{s.summary}</div>
                    )}
                  </div>
                  {isExpanded && (
                    <div className="px-4 pb-3">
                      <div className="text-[12px] text-slate-300 leading-relaxed p-3 rounded-lg bg-[#0a0f18] border border-[#1a2740] whitespace-pre-wrap" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', maxHeight: '600px', overflowY: 'auto' }}>
                        {s.body}
                      </div>
                      <div className="mt-2 font-mono text-[9px] text-slate-600 truncate">{s.filename}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
