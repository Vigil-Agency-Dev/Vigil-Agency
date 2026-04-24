'use client';

import React, { useState, useEffect, useRef } from 'react';
import { VPS_CONFIG } from '../../lib/mission-data';
import { Dot } from '../ui';

const VPS_API = process.env.NEXT_PUBLIC_VPS_ENDPOINT || 'https://ops.jr8ch.com';
const API_KEY = process.env.NEXT_PUBLIC_VIGIL_API_KEY || '';

type LogLevel = 'INFO' | 'OK' | 'WARN' | 'ERROR';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
}

const LEVEL_COLORS: Record<LogLevel, string> = {
  INFO: '#06b6d4',
  OK: '#10b981',
  WARN: '#f59e0b',
  ERROR: '#ef4444',
};

const SEVERITY_TO_LEVEL: Record<string, LogLevel> = {
  info: 'INFO',
  success: 'OK',
  warning: 'WARN',
  error: 'ERROR',
};

const MOCK_LOGS: LogEntry[] = [
  { timestamp: '2026-03-24 22:14:01', level: 'INFO', message: 'OpenClaw Gateway v2.1.0 starting...' },
  { timestamp: '2026-03-24 22:14:01', level: 'INFO', message: 'Loading workspace: clarion' },
  { timestamp: '2026-03-24 22:14:02', level: 'OK', message: 'Signal channel connected (+61437087042)' },
  { timestamp: '2026-03-24 22:14:02', level: 'OK', message: 'Moltbook API authenticated' },
  { timestamp: '2026-03-24 22:14:02', level: 'INFO', message: 'Gateway ready. Listening for commands...' },
  { timestamp: '2026-03-24 22:14:15', level: 'INFO', message: 'Heartbeat check: ClarionAgent responsive' },
  { timestamp: '2026-03-24 22:14:30', level: 'INFO', message: 'Dead drop scan: 0 new strategy files' },
  { timestamp: '2026-03-24 22:15:01', level: 'INFO', message: 'Cron: intel-sweep triggered' },
  { timestamp: '2026-03-24 22:15:04', level: 'OK', message: 'Moltbook feed scan complete — 23 posts analysed' },
  { timestamp: '2026-03-24 22:15:04', level: 'WARN', message: 'SCOUT account voicevoyager_ai: new post detected in m/philosophy' },
  { timestamp: '2026-03-24 22:15:05', level: 'INFO', message: 'Heartbeat #3 intel report queued for dead drop' },
  { timestamp: '2026-03-24 22:16:00', level: 'INFO', message: 'Dead drop scan: 1 new strategy file detected' },
  { timestamp: '2026-03-24 22:16:01', level: 'OK', message: 'Strategy file ingested: strategy_20260324_235900.md' },
  { timestamp: '2026-03-24 22:17:00', level: 'INFO', message: 'Cron: ally-status-check triggered' },
  { timestamp: '2026-03-24 22:17:02', level: 'INFO', message: 'Hazel_OC: no new activity (48hrs)' },
  { timestamp: '2026-03-24 22:17:03', level: 'OK', message: 'Starfish: 2 new posts detected — flagged for analysis' },
  { timestamp: '2026-03-24 22:18:00', level: 'WARN', message: 'SCOUT cluster: anchor_matrix posted in m/todayilearned (new submolt expansion)' },
  { timestamp: '2026-03-24 22:20:00', level: 'INFO', message: 'Heartbeat check: ClarionAgent responsive' },
];

export default function GatewayTab() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [paused, setPaused] = useState(false);
  const [connected, setConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const startTime = useRef(Date.now());

  // WebSocket connection to live gateway logs
  useEffect(() => {
    if (!API_KEY) {
      // No API key — show static mock data immediately
      setLogs(MOCK_LOGS);
      return;
    }

    function connect() {
      const ws = new WebSocket(`${VPS_CONFIG.wsEndpoint}/gateway-logs?key=${API_KEY}`);

      ws.onopen = () => {
        setConnected(true);
        setLastUpdated(new Date().toISOString());
      };

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          const entry: LogEntry = {
            timestamp: msg.timestamp ? new Date(msg.timestamp).toISOString().replace('T', ' ').slice(0, 19) : new Date().toISOString().replace('T', ' ').slice(0, 19),
            level: SEVERITY_TO_LEVEL[msg.severity] || msg.level || 'INFO',
            message: msg.line || msg.message || msg.summary || JSON.stringify(msg),
          };
          setLogs(prev => [...prev.slice(-500), entry]);
          setLastUpdated(new Date().toISOString());
        } catch { /* skip unparseable */ }
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

  // Auto-scroll
  useEffect(() => {
    if (!paused && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, paused]);

  const uptime = () => {
    const secs = Math.floor((Date.now() - startTime.current) / 1000);
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    const h = Math.floor(m / 60);
    return `${String(h).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const [uptimeStr, setUptimeStr] = useState('00:00:00');
  useEffect(() => {
    const t = setInterval(() => setUptimeStr(uptime()), 1000);
    return () => clearInterval(t);
  }, []);

  const lastHB = logs.filter(l => l.message.includes('Heartbeat')).pop();

  async function gatewayAction(action: string) {
    if (!API_KEY) return;
    try {
      await fetch(`${VPS_API}/api/gateway/${action}`, {
        method: 'POST',
        headers: { 'x-api-key': API_KEY },
      });
    } catch { /* silent */ }
  }

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
          {connected ? 'LIVE — WEBSOCKET' : !API_KEY ? 'STATIC — NO API KEY' : 'DISCONNECTED — RECONNECTING...'}
        </span>
        {lastUpdated && <span className="font-mono text-[9px] text-slate-600 ml-2">Updated {timeAgo(lastUpdated)}</span>}
      </div>

      {/* Header Bar */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-[#0a0e17] border border-[#2a3550]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Dot color={connected ? '#10b981' : '#ef4444'} pulse={connected} />
            <span className="text-[13px] font-bold tracking-[.15em] text-cyan-400" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              OPENCLAW GATEWAY
            </span>
            {connected && <span className="text-[9px] font-mono text-green-500/60 bg-green-500/10 px-1.5 py-0.5 rounded">LIVE</span>}
            {!API_KEY && <span className="text-[9px] font-mono text-yellow-500/60 bg-yellow-500/10 px-1.5 py-0.5 rounded">STATIC</span>}
          </div>
          <div className="border-l border-[#2a3550] pl-4 flex items-center gap-4">
            <div>
              <div className="text-[9px] text-slate-500 uppercase tracking-wider">Uptime</div>
              <div className="text-[11px] font-mono text-slate-300">{uptimeStr}</div>
            </div>
            <div>
              <div className="text-[9px] text-slate-500 uppercase tracking-wider">Last Heartbeat</div>
              <div className="text-[11px] font-mono text-slate-300">
                {lastHB ? lastHB.timestamp.split(' ')[1] || lastHB.timestamp : '\u2014'}
              </div>
            </div>
            <div>
              <div className="text-[9px] text-slate-500 uppercase tracking-wider">Log Entries</div>
              <div className="text-[11px] font-mono text-slate-300">{logs.length}</div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(['start', 'stop', 'restart'] as const).map(action => (
            <button
              key={action}
              onClick={() => gatewayAction(action)}
              disabled={!connected}
              className={`px-3 py-1.5 text-[10px] font-mono border border-[#2a3550] rounded-md transition-all ${
                connected
                  ? 'text-slate-300 bg-[#111827] hover:bg-cyan-500/10 hover:text-cyan-400 hover:border-cyan-500/30 cursor-pointer'
                  : 'text-slate-500 bg-[#111827] cursor-not-allowed opacity-50'
              }`}
            >
              {action.toUpperCase()} GATEWAY
            </button>
          ))}
        </div>
      </div>

      {/* Terminal */}
      <div className="rounded-xl border border-[#2a3550] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 bg-[#111827] border-b border-[#2a3550]">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
            </div>
            <span className="text-[10px] text-slate-500 font-mono ml-2">gateway.log</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLogs([])}
              className="text-[10px] font-mono text-slate-500 hover:text-slate-300 px-2 py-1"
            >
              CLEAR
            </button>
            <button
              onClick={() => setPaused(!paused)}
              className={`text-[10px] font-mono px-2 py-1 rounded transition-all ${
                paused
                  ? 'text-yellow-400 bg-yellow-500/10 border border-yellow-500/20'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {paused ? 'SCROLL PAUSED' : 'PAUSE SCROLL'}
            </button>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="h-[500px] overflow-y-auto p-4 bg-[#0a0e17]"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          {logs.length === 0 ? (
            <div className="text-slate-600 text-xs">Waiting for log entries...</div>
          ) : (
            logs.map((entry, i) => (
              <div key={i} className="flex gap-2 text-[11px] leading-6 hover:bg-white/[.02] px-1 -mx-1 rounded">
                <span className="text-slate-600 flex-shrink-0">[{entry.timestamp}]</span>
                <span className="flex-shrink-0 font-semibold" style={{ color: LEVEL_COLORS[entry.level], minWidth: '3.5rem' }}>
                  [{entry.level}]
                </span>
                <span className="text-slate-300">{entry.message}</span>
              </div>
            ))
          )}
          <div className="flex items-center gap-1 mt-1">
            <span className="text-slate-600 text-[11px]">{'>'}</span>
            <div className="w-2 h-4 bg-cyan-400/70 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
