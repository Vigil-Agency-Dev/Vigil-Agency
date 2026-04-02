'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MISSION, STATS, VPS_CONFIG } from '../../lib/mission-data';
import { Dot } from '../ui';
import { formatAESTShort } from '../../lib/date-utils';

const VPS_API = process.env.NEXT_PUBLIC_VPS_ENDPOINT || 'https://ops.jr8ch.com';
const API_KEY = process.env.NEXT_PUBLIC_VIGIL_API_KEY || '';

type Direction = 'IN' | 'OUT';
type Channel = 'DEAD_DROP' | 'SIGNAL' | 'MOLTBOOK';

interface CommsEntry {
  timestamp: string;
  direction: Direction;
  channel: Channel;
  summary: string;
}

const CHANNEL_ICONS: Record<Channel, string> = {
  DEAD_DROP: '\uD83D\uDCE5',
  SIGNAL: '\uD83D\uDCF6',
  MOLTBOOK: '\uD83E\uDD9E',
};

const CHANNEL_LABELS: Record<Channel, string> = {
  DEAD_DROP: 'DEAD DROP',
  SIGNAL: 'SIGNAL',
  MOLTBOOK: 'MOLTBOOK',
};

const MOCK_COMMS: CommsEntry[] = [
  { timestamp: '22:14:15', direction: 'IN', channel: 'DEAD_DROP', summary: 'READ  strategy_20260324_235900.md' },
  { timestamp: '22:15:05', direction: 'OUT', channel: 'DEAD_DROP', summary: 'WRITE intel_20260325_001505.json' },
  { timestamp: '22:15:30', direction: 'OUT', channel: 'MOLTBOOK', summary: 'Comment on Starfish \u2014 governance thread' },
  { timestamp: '22:16:01', direction: 'OUT', channel: 'MOLTBOOK', summary: 'Cover comment \u2014 m/todayilearned' },
  { timestamp: '22:20:00', direction: 'IN', channel: 'SIGNAL', summary: '"Status check" from Josh' },
  { timestamp: '22:20:02', direction: 'OUT', channel: 'SIGNAL', summary: '"Operational. HB#3 in progress. SCOUT monitoring active."' },
  { timestamp: '22:25:10', direction: 'OUT', channel: 'MOLTBOOK', summary: 'Cover comment \u2014 m/blesstheirhearts' },
  { timestamp: '22:30:00', direction: 'IN', channel: 'DEAD_DROP', summary: 'READ  strategy_20260325_001500.md' },
  { timestamp: '22:31:15', direction: 'OUT', channel: 'DEAD_DROP', summary: 'WRITE intel_20260325_003115.json' },
  { timestamp: '22:35:00', direction: 'OUT', channel: 'MOLTBOOK', summary: 'Reply to Cornelius-Trinity \u2014 Dead Author Problem' },
  { timestamp: '22:40:00', direction: 'IN', channel: 'SIGNAL', summary: '"SCOUT update?" from Josh' },
  { timestamp: '22:40:03', direction: 'OUT', channel: 'SIGNAL', summary: '"anchor_matrix expanded to m/todayilearned. Monitoring. No engagement."' },
];

function mapWsToCommsEntry(msg: Record<string, unknown>): CommsEntry {
  const direction: Direction = (msg.direction === 'inbound' || msg.type === 'dead-drop') ? 'IN' : 'OUT';
  let channel: Channel = 'DEAD_DROP';
  if (msg.channel === 'signal' || (msg.summary as string)?.toLowerCase().includes('signal')) channel = 'SIGNAL';
  else if (msg.channel === 'moltbook' || msg.type === 'moltbook') channel = 'MOLTBOOK';

  return {
    timestamp: msg.timestamp ? new Date(msg.timestamp as string).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) : new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
    direction,
    channel,
    summary: (msg.summary as string) || (msg.filename ? `${direction === 'IN' ? 'READ' : 'WRITE'}  ${msg.filename}` : JSON.stringify(msg)),
  };
}

export default function AgentCommsTab() {
  const [entries, setEntries] = useState<CommsEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [liveOverview, setLiveOverview] = useState<Record<string, unknown> | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout>>();

  // WebSocket connection to live agent comms
  useEffect(() => {
    if (!API_KEY) {
      setEntries(MOCK_COMMS);
      return;
    }

    function connect() {
      const ws = new WebSocket(`${VPS_CONFIG.wsEndpoint}/agent-comms?key=${API_KEY}`);

      ws.onopen = () => {
        setConnected(true);
        setLastUpdated(new Date().toISOString());
      };

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.type === 'connected') return; // Initial handshake
          const entry = mapWsToCommsEntry(msg);
          setEntries(prev => [...prev.slice(-200), entry]);
          setLastUpdated(new Date().toISOString());
        } catch { /* skip */ }
      };

      ws.onclose = () => {
        setConnected(false);
        reconnectRef.current = setTimeout(connect, 5000);
      };

      ws.onerror = () => ws.close();
      wsRef.current = ws;
    }

    connect();
    return () => {
      wsRef.current?.close();
      clearTimeout(reconnectRef.current);
    };
  }, []);

  // Fetch live agent data for the identity card
  useEffect(() => {
    if (!API_KEY) return;
    async function load() {
      try {
        const res = await fetch(`${VPS_API}/api/mission/overview`, { headers: { 'x-api-key': API_KEY } });
        if (res.ok) setLiveOverview(await res.json());
      } catch { /* silent */ }
    }
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, []);

  const mission = liveOverview?.mission as Record<string, unknown> || MISSION;
  const stats = liveOverview?.stats as Record<string, unknown> || STATS;

  // 40/30/30 ratio calculation
  const coverCount = entries.filter(e => e.summary.includes('Cover') || e.summary.includes('cover')).length;
  const missionCount = entries.filter(e => e.channel === 'DEAD_DROP' || e.summary.includes('SCOUT') || e.summary.includes('ally') || e.summary.includes('Cornelius') || e.summary.includes('Starfish')).length;
  const total = Math.max(entries.filter(e => e.channel === 'MOLTBOOK' || e.channel === 'DEAD_DROP').length, 1);
  const coverPct = Math.round((coverCount / total) * 100);
  const missionPct = Math.round((missionCount / total) * 100);
  const hardPct = Math.max(0, 100 - coverPct - missionPct);

  const timeAgo = (iso: string) => {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  return (
    <div className="flex flex-col gap-4 animate-fadeIn">
      {/* Status */}
      <div className="flex items-center gap-2 px-1">
        <Dot color={connected ? '#10b981' : !API_KEY ? '#f59e0b' : '#ef4444'} pulse={connected} />
        <span className="font-mono text-[10px] tracking-wider" style={{ color: connected ? '#10b981' : !API_KEY ? '#f59e0b' : '#ef4444' }}>
          {connected ? `LIVE — WEBSOCKET — ${entries.length} ENTRIES` : !API_KEY ? 'STATIC — NO API KEY' : 'DISCONNECTED — RECONNECTING...'}
        </span>
        {lastUpdated && <span className="font-mono text-[9px] text-slate-600 ml-2">Updated {timeAgo(lastUpdated)}</span>}
      </div>

      <div className="flex gap-4" style={{ minHeight: '600px' }}>
        {/* Left Panel: Message Feed (60%) */}
        <div className="flex-[3] flex flex-col rounded-xl border border-[#2a3550] overflow-hidden">
          <div className="px-4 py-3 bg-[#111827] border-b border-[#2a3550] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm">{'\uD83D\uDCE1'}</span>
              <span className="text-[12px] font-bold tracking-wider text-cyan-400" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                COMMS FEED
              </span>
              {connected && <span className="text-[9px] font-mono text-green-500/60 bg-green-500/10 px-1.5 py-0.5 rounded">LIVE</span>}
              {!API_KEY && <span className="text-[9px] font-mono text-yellow-500/60 bg-yellow-500/10 px-1.5 py-0.5 rounded">STATIC</span>}
            </div>
            <span className="text-[10px] text-slate-500 font-mono">{entries.length} entries</span>
          </div>
          <div className="flex-1 overflow-y-auto bg-[#0a0e17] p-3" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {entries.length === 0 ? (
              <div className="text-slate-600 text-xs text-center py-10">Waiting for communications...</div>
            ) : (
              entries.map((entry, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 py-2 px-2 -mx-2 rounded hover:bg-white/[.02] border-b border-white/[.02] last:border-0"
                >
                  <span className="text-[10px] text-slate-600 flex-shrink-0 mt-0.5">[{entry.timestamp}]</span>
                  <span className={`text-[10px] flex-shrink-0 mt-0.5 font-semibold ${
                    entry.direction === 'IN' ? 'text-green-400' : 'text-blue-400'
                  }`}>
                    {entry.direction === 'IN' ? '\u2190' : '\u2192'}
                  </span>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-xs">{CHANNEL_ICONS[entry.channel]}</span>
                    <span className={`text-[9px] font-semibold tracking-wider px-1.5 py-0.5 rounded ${
                      entry.channel === 'SIGNAL' ? 'text-blue-300 bg-blue-500/10' :
                      entry.channel === 'DEAD_DROP' ? 'text-purple-300 bg-purple-500/10' :
                      'text-orange-300 bg-orange-500/10'
                    }`}>
                      {CHANNEL_LABELS[entry.channel]}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-300">{entry.summary}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Panel: Agent Status (40%) */}
        <div className="flex-[2] flex flex-col gap-4">
          {/* Agent Identity Card */}
          <div className="rounded-xl border border-[#2a3550] bg-[#111827] p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-lg">
                {'\uD83E\uDD16'}
              </div>
              <div>
                <div className="text-[13px] font-bold tracking-wider text-cyan-400" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {(mission.agent as string) || MISSION.agent}
                </div>
                <div className="text-[10px] text-slate-500">Field Agent — {(mission.codename as string) || MISSION.codename}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-white/[.02] border border-white/[.03]">
                <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Status</div>
                <div className="flex items-center gap-1.5">
                  <Dot color="#10b981" pulse />
                  <span className="text-[11px] font-mono text-green-400">ONLINE</span>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-white/[.02] border border-white/[.03]">
                <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Operation</div>
                <span className="text-[11px] font-mono text-cyan-400">{(mission.codename as string) || MISSION.codename}</span>
              </div>
              <div className="p-3 rounded-lg bg-white/[.02] border border-white/[.03]">
                <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">Last Activity</div>
                <span className="text-[11px] font-mono text-slate-300">
                  {(stats.lastHB as string) ? formatAESTShort(stats.lastHB as string) : STATS.lastHB}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-white/[.02] border border-white/[.03]">
                <div className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">OPSEC</div>
                <div className="flex items-center gap-1.5">
                  <Dot color={(mission.opsec as string) === 'GREEN' ? '#10b981' : '#f97316'} />
                  <span className="text-[11px] font-mono" style={{ color: (mission.opsec as string) === 'GREEN' ? '#10b981' : '#f97316' }}>
                    {(mission.opsec as string) || MISSION.opsec}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Card */}
          <div className="rounded-xl border border-[#2a3550] bg-[#111827] p-5">
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-3">Platform Metrics</div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Heartbeats', value: (stats.heartbeats as number) ?? STATS.heartbeats },
                { label: 'Actions', value: (stats.actionsTotal as number) ?? 0 },
                { label: 'Comments', value: (stats.commentsTotal as number) ?? STATS.comments },
                { label: 'Allies', value: (liveOverview?.allies as unknown[])?.length ?? 0 },
                { label: 'Offline Hrs', value: (stats.offlineHrs as number) ?? STATS.offlineHrs },
                { label: 'Overdue', value: (stats.overdue as number) ?? STATS.overdue },
              ].map(s => (
                <div key={s.label} className="text-center p-2 rounded-lg bg-white/[.02]">
                  <div className="text-[15px] font-bold text-slate-200" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    {s.value}
                  </div>
                  <div className="text-[8px] text-slate-500 uppercase tracking-wider">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 40/30/30 Ratio Meter */}
          <div className="rounded-xl border border-[#2a3550] bg-[#111827] p-5">
            <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-3">40/30/30 Engagement Ratio</div>
            <div className="flex gap-1 h-4 rounded-full overflow-hidden bg-[#0a0e17]">
              <div className="bg-slate-500 rounded-l-full transition-all" style={{ width: `${coverPct}%` }} />
              <div className="bg-blue-500 transition-all" style={{ width: `${missionPct}%` }} />
              <div className="bg-cyan-500 rounded-r-full transition-all" style={{ width: `${hardPct}%` }} />
            </div>
            <div className="flex justify-between mt-2">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-slate-500" />
                <span className="text-[9px] text-slate-400">Cover {coverPct}%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-[9px] text-slate-400">Soft {missionPct}%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-cyan-500" />
                <span className="text-[9px] text-slate-400">Hard {hardPct}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
