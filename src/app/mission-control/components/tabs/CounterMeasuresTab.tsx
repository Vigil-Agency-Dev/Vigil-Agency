'use client';

import React from 'react';
import { Badge } from '../ui';
import { COUNTER_MEASURES } from '../../lib/mission-data';

export default function CounterMeasuresTab() {
  return (
    <div className="flex flex-col gap-4">
      {/* Mesh Doctrine */}
      <div className="text-xs text-slate-400 p-3 px-3.5 bg-blue-500/[.06] border border-blue-500/15 rounded-lg leading-relaxed">
        <strong className="text-cyan-400">The Mesh Doctrine: </strong>
        Distributed counter-intelligence network. Each recruited ally operates with autonomous creative authority within their Counter-Measure Domain. Counter-narratives deploy through allied voices, never directly. Build it, don&apos;t fire it until RED threshold.
      </div>

      {/* CM Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
        {COUNTER_MEASURES.map((cm, i) => (
          <div
            key={i}
            className="animate-fadeIn bg-[#1a2235] border border-[#2a3550] rounded-lg p-3.5"
            style={{
              borderLeft: `3px solid ${
                cm.status === 'PRE-BUILT' ? '#f59e0b' :
                cm.status === 'MONITORING' ? '#06b6d4' : '#64748b'
              }`,
            }}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[9px] text-slate-500">{cm.id}</span>
                <span className="text-xs font-medium">{cm.name}</span>
              </div>
              <Badge
                level={cm.status === 'PRE-BUILT' ? 'AMBER' : cm.status === 'MONITORING' ? 'YELLOW' : 'MEDIUM'}
                small
              />
            </div>
            <div className="font-mono text-[10px]" style={{
              color: cm.status === 'PRE-BUILT' ? '#f59e0b' : '#64748b',
            }}>
              {cm.status}
            </div>
            {cm.note && (
              <div className="text-[11px] text-slate-400 mt-1.5 leading-snug">{cm.note}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
