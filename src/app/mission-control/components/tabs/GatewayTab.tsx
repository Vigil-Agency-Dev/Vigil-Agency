'use client';

import React, { useState, useEffect, useRef } from 'react';
import { VPS_CONFIG } from '../../lib/mission-data';
import { Dot } from '../ui';

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
  const [connected] = useState(!VPS_CONFIG.placeholder);
  const scrollRef = useRef<HTMLDivElement>(null);
  const startTime = useRef(Date.now());

  // Simulate log streaming with mock data
  useEffect(() => {
    if (!VPS_CONFIG.placeholder) return;

    let idx = 0;
    const interval = setInterval(() => {
      if (idx < MOCK_LOGS.length) {
        setLogs(prev => [...prev, MOCK_LOGS[idx]]);
        idx++;
      } else {
        // Loop with fresh timestamps
        const now = new Date();
        const ts = now.toISOString().replace('T', ' ').substring(0, 19);
        const entry = { ...MOCK_LOGS[idx % MOCK_LOGS.length], timestamp: ts };
        setLogs(prev => [...prev.slice(-200), entry]);
        idx++;
      }
    }, 800);

    return () => clearInterval(interval);
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

  return (
    <div className="flex flex-col gap-4 animate-fadeIn">
      {/* Header Bar */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-[#0a0e17] border border-[#2a3550]">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Dot color={VPS_CONFIG.placeholder ? '#f59e0b' : connected ? '#10b981' : '#ef4444'} pulse={VPS_CONFIG.placeholder || connected} />
            <span
              className="text-[13px] font-bold tracking-[.15em] text-cyan-400"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              OPENCLAW GATEWAY
            </span>
            {VPS_CONFIG.placeholder && (
              <span className="text-[9px] font-mono text-yellow-500/60 bg-yellow-500/10 px-1.5 py-0.5 rounded">MOCK</span>
            )}
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
          </div>
        </div>
        <div className="flex items-center gap-2">
          {['Start Gateway', 'Stop Gateway', 'Restart Gateway'].map(label => (
            <button
              key={label}
              disabled
              title="Requires VPS connection"
              className="px-3 py-1.5 text-[10px] font-mono text-slate-500 bg-[#111827] border border-[#2a3550] rounded-md cursor-not-allowed opacity-50"
            >
              {label.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Terminal */}
      <div className="rounded-xl border border-[#2a3550] overflow-hidden">
        {/* Terminal Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#111827] border-b border-[#2a3550]">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
            </div>
            <span className="text-[10px] text-slate-500 font-mono ml-2">gateway.log</span>
          </div>
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

        {/* Log Output */}
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
                <span
                  className="flex-shrink-0 font-semibold"
                  style={{ color: LEVEL_COLORS[entry.level], minWidth: '3.5rem' }}
                >
                  [{entry.level}]
                </span>
                <span className="text-slate-300">{entry.message}</span>
              </div>
            ))
          )}
          {/* Blinking cursor */}
          <div className="flex items-center gap-1 mt-1">
            <span className="text-slate-600 text-[11px]">{'>'}</span>
            <div className="w-2 h-4 bg-cyan-400/70 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
