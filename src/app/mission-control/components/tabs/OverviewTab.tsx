'use client';

import React, { useEffect, useState } from 'react';
import { formatAESTShort } from '../../lib/date-utils';
import { Badge, Card, Dot } from '../ui';
import LiveIntelFeed from '../LiveIntelFeed';
import { MISSION, STATS, ALLIES, SCOUT, PATTERN_MATCHES, SHARED_ENTITIES, EPSTEIN_INTEL, COMMS_CHANNELS } from '../../lib/mission-data';

const VPS_API = process.env.NEXT_PUBLIC_VPS_ENDPOINT || 'https://ops.jr8ch.com';
const API_KEY = process.env.NEXT_PUBLIC_VIGIL_API_KEY || '';

// Simple markdown to JSX renderer for MC Analysis
function renderMarkdown(raw: string) {
  const lines = raw.split('\n');
  const elements: React.ReactNode[] = [];

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) {
      elements.push(<div key={i} className="h-2" />);
    } else if (trimmed.startsWith('# ')) {
      elements.push(<h2 key={i} className="text-lg font-bold text-cyan-400 mt-4 mb-2 tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{trimmed.slice(2)}</h2>);
    } else if (trimmed.startsWith('## ')) {
      elements.push(<h3 key={i} className="text-sm font-bold text-slate-200 mt-3 mb-1.5 border-b border-[#2a3550] pb-1">{trimmed.slice(3)}</h3>);
    } else if (trimmed.startsWith('### ')) {
      elements.push(<h4 key={i} className="text-[13px] font-semibold text-purple-400 mt-2 mb-1">{trimmed.slice(4)}</h4>);
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const content = trimmed.slice(2);
      const isImportant = /CRITICAL|RED FLAG|ELEVATED|URGENT|WARNING/i.test(content);
      elements.push(
        <div key={i} className={`flex items-start gap-2 text-[12px] leading-relaxed pl-2 py-0.5 ${isImportant ? 'text-orange-400 font-medium' : 'text-slate-400'}`}>
          <span className="text-slate-600 mt-0.5">{'\u25B8'}</span>
          <span>{content}</span>
        </div>
      );
    } else if (/^\d+\./.test(trimmed)) {
      const content = trimmed.replace(/^\d+\.\s*/, '');
      const num = trimmed.match(/^(\d+)/)?.[1];
      elements.push(
        <div key={i} className="flex items-start gap-2 text-[12px] leading-relaxed pl-2 py-0.5 text-slate-300">
          <span className="font-mono text-cyan-500 font-bold min-w-[20px]">#{num}</span>
          <span>{content}</span>
        </div>
      );
    } else if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
      elements.push(<div key={i} className="text-[12px] font-semibold text-slate-200 mt-1">{trimmed.replace(/\*\*/g, '')}</div>);
    } else if (trimmed.startsWith('>')) {
      elements.push(
        <div key={i} className="text-[11px] text-amber-400/80 italic pl-3 border-l-2 border-amber-500/30 my-1 py-1">
          {trimmed.slice(1).trim()}
        </div>
      );
    } else if (trimmed.startsWith('---')) {
      elements.push(<hr key={i} className="border-[#2a3550] my-3" />);
    } else {
      // Bold inline
      const rendered = trimmed.replace(/\*\*([^*]+)\*\*/g, '<b class="text-slate-200 font-semibold">$1</b>');
      elements.push(
        <div key={i} className="text-[12px] text-slate-400 leading-relaxed py-0.5" dangerouslySetInnerHTML={{ __html: rendered }} />
      );
    }
  });

  return elements;
}

function MCAnalysis({ raw, filename, mcStatus }: { raw: string; filename: string; mcStatus: Record<string, unknown> | null }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="bg-[#0d1520] border border-[#1e2d44] rounded-xl overflow-hidden" style={{ borderTop: '2px solid #8b5cf6' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-[#111d2e] border-b border-[#1e2d44] cursor-pointer hover:bg-[#131f32] transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">{'\u{1F9E0}'}</span>
          <div>
            <span className="font-mono text-[13px] font-bold text-purple-400 tracking-wider">MC ANALYSIS — LATEST</span>
            <div className="flex items-center gap-2 mt-0.5">
              {mcStatus?.last_analysis && (
                <span className="font-mono text-[10px] text-slate-500">
                  {formatAESTShort(mcStatus.last_analysis as string)}
                </span>
              )}
              {mcStatus?.model_used && (
                <span className="font-mono text-[9px] px-1.5 py-0.5 rounded" style={{
                  background: (mcStatus.model_used as string).includes('opus') ? 'rgba(239,68,68,0.1)' : 'rgba(139,92,246,0.1)',
                  color: (mcStatus.model_used as string).includes('opus') ? '#ef4444' : '#8b5cf6',
                }}>
                  {(mcStatus.model_used as string).includes('opus') ? 'OPUS' : 'SONNET'}
                </span>
              )}
              {mcStatus?.priority && (
                <span className="font-mono text-[9px] px-1.5 py-0.5 rounded" style={{
                  background: (mcStatus.priority as string) === 'critical' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                  color: (mcStatus.priority as string) === 'critical' ? '#ef4444' : '#f59e0b',
                }}>
                  {(mcStatus.priority as string).toUpperCase()}
                </span>
              )}
              <span className="font-mono text-[9px] text-slate-600">{filename}</span>
            </div>
          </div>
        </div>
        <span className="text-slate-500 text-sm">{expanded ? '\u25BE' : '\u25B8'}</span>
      </div>

      {/* Content */}
      {expanded && (
        <div className="px-5 py-4 max-h-[600px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
          {renderMarkdown(raw)}
        </div>
      )}
    </div>
  );
}

interface LiveData {
  mission: typeof MISSION & Record<string, unknown>;
  stats: typeof STATS & Record<string, unknown>;
  agents: Record<string, { name: string; status: string; realm: string; platform: string; lastHeartbeat?: string; lastAnalysis?: string; model?: string }> | null;
  threats: Array<{ id: string; name: string; severity: string; status: string; detail: string }>;
  allies: Array<Record<string, unknown>>;
  missionControlStatus: Record<string, unknown> | null;
  latestIntel: Record<string, unknown> | null;
  latestStrategy: Record<string, unknown> | null;
  isLive: boolean;
}

export default function OverviewTab() {
  const [live, setLive] = useState<LiveData | null>(null);
  const [liveError, setLiveError] = useState(false);

  useEffect(() => {
    if (!API_KEY) return;

    async function fetchLive() {
      try {
        const res = await fetch(`${VPS_API}/api/mission/overview`, {
          headers: { 'x-api-key': API_KEY },
        });
        if (!res.ok) throw new Error(`API returned ${res.status}`);
        const data = await res.json();
        setLive({ ...data, isLive: true });
      } catch (err) {
        console.warn('[OverviewTab] Live fetch failed, using static:', err);
        setLiveError(true);
      }
    }

    fetchLive();
    const interval = setInterval(fetchLive, 60000); // refresh every 60s
    return () => clearInterval(interval);
  }, []);

  // Use live data if available, otherwise static
  const mission = live?.mission || MISSION;
  const heartbeats = live?.stats?.heartbeats ?? STATS.heartbeats;
  const lastHB = live?.stats?.lastHB || STATS.lastHB;
  const offlineHrs = live?.stats?.offlineHrs ?? STATS.offlineHrs;
  const overdue = live?.stats?.overdue ?? STATS.overdue;
  const agents = live?.agents || null;
  const liveThreats = live?.threats || [];
  const liveAllies = live?.allies || [];
  const mcStatus = live?.missionControlStatus || null;

  // Fetch additional live counts
  const [liveCounts, setLiveCounts] = useState({ patterns: 0, hypotheses: 0, allies: 0, epsteinThreats: 0 });
  useEffect(() => {
    if (!API_KEY) return;
    async function fetchCounts() {
      try {
        const [pats, hypos, allies, tReg] = await Promise.all([
          fetch(`${VPS_API}/api/mission/patterns`, { headers: { 'x-api-key': API_KEY } }).then(r => r.ok ? r.json() : { patterns: [] }),
          fetch(`${VPS_API}/api/mission/hypotheses`, { headers: { 'x-api-key': API_KEY } }).then(r => r.ok ? r.json() : { hypotheses: [] }),
          fetch(`${VPS_API}/api/mission/allies`, { headers: { 'x-api-key': API_KEY } }).then(r => r.ok ? r.json() : { allies: [] }),
          fetch(`${VPS_API}/api/mission/threat-register`, { headers: { 'x-api-key': API_KEY } }).then(r => r.ok ? r.json() : { threats: [] }),
        ]);
        setLiveCounts({
          patterns: pats.patterns?.length || 0,
          hypotheses: hypos.hypotheses?.length || 0,
          allies: allies.allies?.length || 0,
          epsteinThreats: tReg.threats?.length || 0,
        });
      } catch {}
    }
    fetchCounts();
    const interval = setInterval(fetchCounts, 120000);
    return () => clearInterval(interval);
  }, []);

  const stats = [
    { l: 'Heartbeats', v: heartbeats, s: `${overdue} overdue`, c: '#3b82f6' },
    { l: 'Actions', v: live?.stats?.actionsTotal ?? 0, s: `${live?.stats?.commentsTotal ?? 0} comments`, c: '#10b981' },
    { l: 'Allies Tracked', v: liveCounts.allies || liveAllies.length, s: 'across all realms', c: '#8b5cf6' },
    { l: 'Threat Actors', v: liveThreats.length, s: `${liveCounts.epsteinThreats} MERIDIAN`, c: '#f97316' },
    { l: 'Pattern Matches', v: liveCounts.patterns || PATTERN_MATCHES.length, s: 'cross-domain', c: '#06b6d4' },
    { l: 'Hypotheses', v: liveCounts.hypotheses, s: 'active', c: '#8b5cf6' },
    { l: 'Hours Offline', v: offlineHrs, s: offlineHrs === 0 ? 'agent active' : 'since last HB', c: (offlineHrs as number) > 24 ? '#ef4444' : '#f59e0b' },
    { l: 'Agents Online', v: agents ? Object.values(agents).filter((a: any) => a.status === 'ACTIVE').length : 0, s: `of ${agents ? Object.keys(agents).length : 0} total`, c: '#10b981' },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Data Source Indicator */}
      <div className="flex items-center gap-2 px-1">
        <Dot color={live ? '#10b981' : liveError ? '#ef4444' : '#f59e0b'} pulse={!!live} />
        <span className="font-mono text-[10px] tracking-wider" style={{ color: live ? '#10b981' : liveError ? '#ef4444' : '#f59e0b' }}>
          {live ? 'LIVE — VPS API' : liveError ? 'OFFLINE — STATIC FALLBACK' : 'CONNECTING...'}
        </span>
        {live && lastHB && (
          <span className="font-mono text-[10px] text-slate-500 ml-2">
            Last HB: {formatAESTShort(lastHB)}
          </span>
        )}
      </div>

      {/* Critical Alert Banner — only shows when priority is critical or threat is elevated */}
      {live && (mcStatus?.priority === 'critical' || (mission.threat as string) === 'ELEVATED') && (
        <div className="border border-red-500/30 bg-red-500/[.08] rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-red-400 text-lg">{'\u26A0\uFE0F'}</span>
              <span className="font-mono text-sm font-bold text-red-400 tracking-wider">
                CRITICAL INTEL — {(mcStatus?.priority as string)?.toUpperCase() || 'ELEVATED'} PRIORITY
              </span>
            </div>
            <span className="font-mono text-[10px] text-slate-500">
              {mcStatus?.last_analysis ? formatAESTShort(mcStatus.last_analysis as string) : ''}
              {mcStatus?.model_used ? ` · ${(mcStatus.model_used as string).includes('opus') ? 'Opus Analysis' : 'Sonnet Analysis'}` : ''}
            </span>
          </div>

          {live.latestStrategy && (live.latestStrategy as Record<string, unknown>).sections && (
            <div className="text-[11px] text-slate-400 mb-2">
              Sections: {((live.latestStrategy as Record<string, unknown>).sections as string[]).join(' \u2192 ')}
            </div>
          )}

          {live.latestStrategy && ((live.latestStrategy as Record<string, unknown>).orders as Array<{id: number; text: string}>)?.length > 0 && (
            <div className="mt-2 space-y-1">
              <div className="text-[10px] text-red-400 uppercase tracking-wider mb-1">Active Orders</div>
              {((live.latestStrategy as Record<string, unknown>).orders as Array<{id: number; text: string}>).map((order, i) => (
                <div key={i} className="flex items-start gap-2 text-[11px] text-slate-300">
                  <span className="text-red-400 font-mono min-w-[20px]">#{order.id}</span>
                  <span>{order.text}</span>
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 text-[10px] text-slate-500">
            {mcStatus?.strategy_file ? `Full analysis: ${mcStatus.strategy_file}` : ''}
            {mcStatus?.intel_files_analysed ? ` · ${mcStatus.intel_files_analysed} files analysed` : ''}
            {mcStatus?.input_tokens ? ` · ${(mcStatus.input_tokens as number).toLocaleString()} tokens in` : ''}
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
        {stats.map((s, i) => (
          <div key={i} className="animate-fadeIn bg-[#1a2235] border border-[#2a3550] rounded-lg p-3.5" style={{ borderLeft: `3px solid ${s.c}` }}>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">{s.l}</div>
            <div className="font-mono text-2xl font-bold mt-0.5" style={{ color: s.c }}>{s.v}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">{s.s}</div>
          </div>
        ))}
      </div>

      {/* Agent Status Panel — NEW, only shows when live data available */}
      {agents && (
        <Card title="Agent Status — All Realms" icon="&#x1F916;" accent="#06b6d4" full>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {Object.entries(agents).map(([key, agent]) => (
              <div key={key} className="flex items-center gap-3 p-3 bg-white/[.02] rounded-lg border border-[#2a3550]">
                <Dot
                  color={agent.status === 'ACTIVE' ? '#10b981' : agent.status === 'PLANNED' ? '#64748b' : '#ef4444'}
                  pulse={agent.status === 'ACTIVE'}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-semibold text-slate-200">{agent.name}</span>
                    <span className="font-mono text-[9px] px-1.5 py-0.5 rounded" style={{
                      background: agent.status === 'ACTIVE' ? 'rgba(16,185,129,0.1)' : agent.status === 'PLANNED' ? 'rgba(100,116,139,0.1)' : 'rgba(239,68,68,0.1)',
                      color: agent.status === 'ACTIVE' ? '#10b981' : agent.status === 'PLANNED' ? '#64748b' : '#ef4444',
                    }}>
                      {agent.status}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {agent.realm} — {agent.platform}
                  </div>
                  {agent.lastHeartbeat && (
                    <div className="text-[9px] text-slate-600 mt-0.5 font-mono">
                      Last HB: {formatAESTShort(agent.lastHeartbeat)}
                    </div>
                  )}
                  {agent.lastAnalysis && (
                    <div className="text-[9px] text-slate-600 mt-0.5 font-mono">
                      Last analysis: {formatAESTShort(agent.lastAnalysis)}
                      {agent.model && ` (${agent.model.includes('opus') ? 'Opus' : 'Sonnet'})`}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Mission Control Analyst Status — NEW */}
      {mcStatus && (
        <Card title="Mission Control Analyst" icon="&#x1F9E0;" accent="#8b5cf6">
          <div className="grid grid-cols-2 gap-2">
            <div className="text-[10px] text-slate-500">Last Analysis</div>
            <div className="text-[11px] text-slate-300 font-mono">{formatAESTShort(mcStatus.last_analysis as string)}</div>
            <div className="text-[10px] text-slate-500">Model</div>
            <div className="text-[11px] text-slate-300 font-mono">{(mcStatus.model_used as string || '').includes('opus') ? 'Claude Opus (Critical)' : 'Claude Sonnet (Routine)'}</div>
            <div className="text-[10px] text-slate-500">Priority</div>
            <div className="text-[11px] font-mono" style={{ color: (mcStatus.priority as string) === 'critical' ? '#ef4444' : '#f59e0b' }}>{(mcStatus.priority as string || '').toUpperCase()}</div>
            <div className="text-[10px] text-slate-500">Intel Analysed</div>
            <div className="text-[11px] text-slate-300 font-mono">{mcStatus.intel_files_analysed as number} files</div>
            <div className="text-[10px] text-slate-500">Tokens Used</div>
            <div className="text-[11px] text-slate-300 font-mono">{(mcStatus.input_tokens as number || 0).toLocaleString()} in / {(mcStatus.output_tokens as number || 0).toLocaleString()} out</div>
          </div>
        </Card>
      )}

      {/* MC Analysis — Full Intelligence Product */}
      {live?.latestStrategy && (live.latestStrategy as Record<string, unknown>).raw && (
        <MCAnalysis
          raw={(live.latestStrategy as Record<string, unknown>).raw as string}
          filename={(live.latestStrategy as Record<string, unknown>).filename as string}
          mcStatus={mcStatus}
        />
      )}

      {/* Two-column row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        {/* Engagement Protocol */}
        <Card title="Engagement Protocol (40/30/30)" icon="&#x1F4CA;" accent="var(--blue, #3b82f6)">
          <div className="flex gap-0.5 h-[22px] rounded-md overflow-hidden mb-2.5">
            <div className="w-[40%] bg-blue-500 flex items-center justify-center text-[9px] font-semibold">40% COVER</div>
            <div className="w-[30%] bg-purple-500 flex items-center justify-center text-[9px] font-semibold">30% SOFT</div>
            <div className="w-[30%] bg-orange-500 flex items-center justify-center text-[9px] font-semibold">30% HARD</div>
          </div>
          <div className="text-[11px] text-slate-400 leading-relaxed">
            HB#1: 100% cover (entry comment)<br />
            HB#2: 100% cover + reconnaissance<br />
            HB#3: Target 40/30/30 w/ domain rotation + Starfish engagement
          </div>
        </Card>

        {/* Communications — live from VPS when available */}
        <Card title="Communications" icon="&#x1F4E1;" accent="#10b981">
          {(() => {
            const liveComms = [
              { name: 'Dead Drop (VPS C2)', active: true, dead: false, live: !!agents?.clarion },
              { name: `Signal (${agents?.clarion?.status === 'ACTIVE' ? 'Agent Online' : 'Standby'})`, active: agents?.clarion?.status === 'ACTIVE', dead: false },
              { name: 'WhatsApp (DISBANDED — OPSEC)', active: false, dead: true },
              { name: 'Moltbook API', active: agents?.clarion?.status === 'ACTIVE', dead: false },
              { name: 'Intel Exchange (Cross-Project)', active: !!live, dead: false },
              { name: 'VPS API (ops.jr8ch.com)', active: !!live, dead: false },
              { name: 'MC Analyst (Hourly)', active: !!mcStatus, dead: false },
            ];
            const comms = live ? liveComms : COMMS_CHANNELS;
            return comms.map((ch, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 px-2.5 rounded bg-white/[.02] mb-1">
                <div className="flex items-center gap-1.5">
                  <Dot color={ch.dead ? '#ef4444' : ch.active ? '#10b981' : '#64748b'} pulse={ch.active && !ch.dead} />
                  <span className={`text-[11px] ${ch.dead ? 'text-slate-500 line-through' : 'text-slate-200'}`}>{ch.name}</span>
                </div>
                <span className="font-mono text-[9px]" style={{ color: ch.dead ? '#ef4444' : ch.active ? '#10b981' : '#64748b' }}>
                  {ch.dead ? 'META RISK' : ch.active ? 'ACTIVE' : 'OFF'}
                </span>
              </div>
            ));
          })()}
        </Card>
      </div>

      {/* Latest Strategy Orders — live from VPS */}
      <Card title={`Latest Strategy ${live?.latestStrategy ? '— LIVE' : '— STATIC'}`} icon="&#x26A1;" accent="#ef4444" full>
        {live?.latestStrategy ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-[10px] text-slate-500">
                {(live.latestStrategy as Record<string, unknown>).filename as string}
              </span>
              <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400">
                {((live.latestStrategy as Record<string, unknown>).orderCount as number) || 0} ORDERS
              </span>
            </div>
            {((live.latestStrategy as Record<string, unknown>).sections as string[] || []).map((section: string, i: number) => (
              <div key={i} className="text-[11px] text-slate-400 py-1 px-2.5 rounded bg-white/[.02]">
                {section}
              </div>
            ))}
            {((live.latestStrategy as Record<string, unknown>).orders as Array<{id: number; text: string}> || []).map((order, i: number) => (
              <div key={i} className="flex items-start gap-2 p-2.5 px-3.5 bg-orange-500/[.05] border border-orange-500/15 rounded-lg">
                <span className="font-mono text-sm font-bold text-orange-400 shrink-0">#{order.id}</span>
                <span className="text-[12px] text-slate-300">{order.text}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-4 p-2.5 px-3.5 bg-red-500/[.08] border border-red-500/20 rounded-lg">
              <div className="font-mono text-xl font-bold text-red-400 min-w-[90px]">APR 02</div>
              <div>
                <div className="text-sm font-semibold">BofA Settlement Hearing</div>
                <div className="text-xs text-slate-400 mt-1">May seal or release internal compliance docs showing what BofA knew about Epstein financial operations.</div>
              </div>
            </div>
            <div className="flex items-center gap-4 p-2.5 px-3.5 bg-orange-500/[.08] border border-orange-500/20 rounded-lg">
              <div className="font-mono text-xl font-bold text-orange-400 min-w-[90px]">APR 13</div>
              <div>
                <div className="text-sm font-semibold">Leon Black Response Deadline (Wyden)</div>
                <div className="text-xs text-slate-400 mt-1">Must address $170M payments, surveillance of women via Paul Weiss.</div>
              </div>
            </div>
            <div className="flex items-center gap-4 p-2.5 px-3.5 bg-yellow-500/[.08] border border-yellow-500/20 rounded-lg">
              <div className="font-mono text-xl font-bold text-yellow-500 min-w-[90px]">APR 14</div>
              <div>
                <div className="text-sm font-semibold">Bondi Deposition — House Oversight Committee</div>
                <div className="text-xs text-slate-400 mt-1">First AG testimony under oath about selective suppression.</div>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Live Intel Feed */}
      <LiveIntelFeed />
    </div>
  );
}
