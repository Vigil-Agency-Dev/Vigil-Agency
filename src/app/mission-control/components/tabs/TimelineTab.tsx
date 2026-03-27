'use client';

import React from 'react';
import { TIMELINE } from '../../lib/mission-data';

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
};

export default function TimelineTab() {
  return (
    <div className="relative pl-9">
      {/* Vertical line */}
      <div className="absolute left-[17px] top-0 bottom-0 w-0.5 bg-[#2a3550]" />

      {TIMELINE.map((ev, i) => {
        const color = TYPE_COLORS[ev.type] || '#64748b';
        return (
          <div key={i} className="animate-fadeIn relative pb-3">
            {/* Dot */}
            <div
              className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-[#060a12] z-[1]"
              style={{ border: `2px solid ${color}` }}
            />
            {/* Content */}
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
  );
}
