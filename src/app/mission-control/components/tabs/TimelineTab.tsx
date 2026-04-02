'use client';

import React, { useState, useEffect } from 'react';
import { TIMELINE } from '../../lib/mission-data';
import { Dot } from '../ui';
import { formatAESTShort } from '../../lib/date-utils';

const VPS_API = process.env.NEXT_PUBLIC_VPS_ENDPOINT || 'https://ops.jr8ch.com';
const API_KEY = process.env.NEXT_PUBLIC_VIGIL_API_KEY || '';

const TYPE_COLORS: Record<string, string> = {
  threat: '#f97316',
  intel: '#06b6d4',
  strategy: '#3b82f6',
  setup: '#64748b',
  ally: '#8b5cf6',
  action: '#10b981',
  incident: '#ef4444',
  fix: '#10b981',
  opsec: '#f59e0b',
  comms: '#06b6d4',
  alert: '#ef4444',
  epstein: '#f59e0b',
  upcoming: '#ec4899',
  'team-report': '#8b5cf6',
};

interface TimelineEvent {
  time: string;
  type: string;
  event: string;
}

export default function TimelineTab() {
  const [events, setEvents] = useState<TimelineEvent[]>(TIMELINE);
  const [isLive, setIsLive] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    if (!API_KEY) return;

    async function load() {
      try {
        const [intelRes, stratRes, opsRes] = await Promise.all([
          fetch(`${VPS_API}/api/mission/intel?limit=50`, { headers: { 'x-api-key': API_KEY } }),
          fetch(`${VPS_API}/api/mission/strategy?limit=20`, { headers: { 'x-api-key': API_KEY } }),
          fetch(`${VPS_API}/api/mission/operational-log`, { headers: { 'x-api-key': API_KEY } }).catch(() => null),
        ]);

        const liveEvents: TimelineEvent[] = [];

        if (intelRes.ok) {
          const intel = await intelRes.json();
          for (const r of (intel.reports || [])) {
            const ts = r.modified || r.timestamp;
            if (!ts) continue;
            liveEvents.push({
              time: formatAESTShort(ts),
              type: r.priority === 'CRITICAL' ? 'alert' : 'intel',
              event: `HB#${r.heartbeat || '?'}: ${r.findings?.[0] || r.filename || 'Intel report'}`,
            });
          }
        }

        if (stratRes.ok) {
          const strat = await stratRes.json();
          for (const u of (strat.updates || [])) {
            const ts = u.modified;
            if (!ts) continue;
            liveEvents.push({
              time: formatAESTShort(ts),
              type: 'strategy',
              event: `Strategy: ${u.filename || 'Strategy directive'} (${u.orderCount || 0} orders)`,
            });
          }
        }

        if (opsRes?.ok) {
          const ops = await opsRes.json();
          for (const ev of (ops.events || [])) {
            liveEvents.push({
              time: formatAESTShort(ev.timestamp || ev.time || ''),
              type: ev.type || 'action',
              event: ev.event || ev.summary || ev.message || 'Operational event',
            });
          }
        }

        // Merge live events with static timeline (static as fallback, live takes priority)
        const seen = new Set<string>();
        const merged: TimelineEvent[] = [];

        // Live events first
        for (const ev of liveEvents) {
          const key = `${ev.time}|${ev.event.slice(0, 30)}`;
          if (!seen.has(key)) {
            seen.add(key);
            merged.push(ev);
          }
        }

        // Static events that don't overlap
        for (const ev of TIMELINE) {
          const key = `${ev.time}|${ev.event.slice(0, 30)}`;
          if (!seen.has(key)) {
            seen.add(key);
            merged.push(ev);
          }
        }

        // Sort by time descending (most recent first)
        merged.sort((a, b) => {
          const ta = new Date(a.time).getTime() || 0;
          const tb = new Date(b.time).getTime() || 0;
          return tb - ta;
        });

        setEvents(merged);
        setIsLive(true);
        setLastUpdated(new Date().toISOString());
      } catch {
        setIsLive(false);
      }
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
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 px-1">
        <Dot color={isLive ? '#10b981' : '#f59e0b'} pulse={isLive} />
        <span className="font-mono text-[10px] tracking-wider" style={{ color: isLive ? '#10b981' : '#f59e0b' }}>
          {isLive ? `LIVE — ${events.length} EVENTS` : 'STATIC DATA'}
        </span>
        {lastUpdated && <span className="font-mono text-[9px] text-slate-600 ml-2">Updated {timeAgo(lastUpdated)}</span>}
        <button onClick={() => setEvents(TIMELINE)} className="ml-auto text-[9px] font-mono text-slate-500 hover:text-cyan-400">REFRESH</button>
      </div>

      <div className="relative pl-9">
        <div className="absolute left-[17px] top-0 bottom-0 w-0.5 bg-[#2a3550]" />

        {events.map((ev, i) => {
          const color = TYPE_COLORS[ev.type] || '#64748b';
          return (
            <div key={i} className="animate-fadeIn relative pb-3">
              <div
                className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-[#060a12] z-[1]"
                style={{ border: `2px solid ${color}` }}
              />
              <div className="bg-[#1a2235] border border-[#2a3550] rounded-md py-2 px-3 ml-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[9px] flex-shrink-0" style={{ color }}>{ev.time}</span>
                  <span
                    className="text-[9px] py-px px-1.5 rounded uppercase tracking-wider font-semibold"
                    style={{ background: `${color}18`, color }}
                  >
                    {ev.type}
                  </span>
                  <span className={`text-[11px] ${ev.type === 'upcoming' ? 'text-pink-400' : 'text-slate-200'}`}>
                    {ev.event}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
