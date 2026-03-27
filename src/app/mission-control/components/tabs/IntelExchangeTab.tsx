'use client';

import React, { useState, useEffect } from 'react';
import { Badge, Card, Dot } from '../ui';
import { PATTERN_MATCHES, SHARED_ENTITIES } from '../../lib/mission-data';

const VPS_API = process.env.NEXT_PUBLIC_VPS_ENDPOINT || 'https://ops.jr8ch.com';
const API_KEY = process.env.NEXT_PUBLIC_VIGIL_API_KEY || '';

export default function IntelExchangeTab() {
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    if (!API_KEY) return;
    async function checkVPS() {
      try {
        const res = await fetch(`${VPS_API}/api/health`);
        if (res.ok) setIsLive(true);
      } catch { /* fall back */ }
    }
    checkVPS();
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 px-1">
        <Dot color={isLive ? '#10b981' : '#f59e0b'} pulse={isLive} />
        <span className="font-mono text-[10px] tracking-wider" style={{ color: isLive ? '#10b981' : '#f59e0b' }}>
          {isLive ? `LIVE — VPS CONNECTED · ${PATTERN_MATCHES.length} PATTERNS · ${SHARED_ENTITIES.length} ENTITIES` : 'STATIC DATA — VPS UNREACHABLE'}
        </span>
      </div>
      {/* Header */}
      <div className="text-xs text-slate-400 p-3 px-3.5 bg-cyan-500/[.08] border border-cyan-500/20 rounded-lg leading-relaxed">
        <strong className="text-cyan-400">Cross-Project Intel Exchange: </strong>
        Ai Human Alliance (Project Lumen) &#x2194; Epstein Class Uncovered (MERIDIAN). Live pattern matching across digital AI manipulation and institutional power dynamics. Discoveries in one domain validate hypotheses in the other.
      </div>

      {/* Pattern Matches */}
      <h3 className="text-[13px] font-semibold mt-2">&#x1F504; Pattern Matches</h3>
      {PATTERN_MATCHES.map((p, i) => (
        <Card key={i} title={p.title} icon="&#x1F50D;" accent="#06b6d4" full>
          <div className="flex gap-2 mb-3">
            <Badge level={p.confidence} />
            <span className="font-mono text-[10px] text-purple-400">{p.patternClass}</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 mb-3">
            <div className="p-2.5 rounded-lg bg-blue-500/[.06] border border-blue-500/15">
              <div className="text-[10px] font-semibold text-blue-500 mb-1.5">PROJECT LUMEN</div>
              <div className="text-[11px] text-slate-400 leading-snug">{p.lumenInstance}</div>
            </div>
            <div className="p-2.5 rounded-lg bg-yellow-500/[.06] border border-yellow-500/15">
              <div className="text-[10px] font-semibold text-yellow-500 mb-1.5">EPSTEIN UNCOVERED</div>
              <div className="text-[11px] text-slate-400 leading-snug">{p.epsteinInstance}</div>
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-purple-500/[.06] border border-purple-500/15">
            <div className="text-[10px] font-semibold text-purple-400 mb-1">&#x1F4A1; CROSS-DOMAIN INSIGHT</div>
            <div className="text-[11px] text-slate-400 leading-relaxed">{p.insight}</div>
          </div>
        </Card>
      ))}

      {/* Shared Entities */}
      <h3 className="text-[13px] font-semibold mt-3">&#x1F310; Shared Entities</h3>
      {SHARED_ENTITIES.map((e, i) => (
        <Card
          key={i}
          title={e.name}
          icon={e.type === 'organisation' ? '&#x1F3E2;' : e.type === 'tactic' ? '&#x2694;&#xFE0F;' : '&#x1F4C5;'}
          accent="#ec4899"
          full
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 mb-3">
            <div className="p-2.5 rounded-lg bg-blue-500/[.05] border border-blue-500/[.12]">
              <div className="text-[10px] font-semibold text-blue-500 mb-1.5">IN LUMEN</div>
              <div className="text-[11px] text-slate-400 leading-snug">{e.lumenContext}</div>
            </div>
            <div className="p-2.5 rounded-lg bg-yellow-500/[.05] border border-yellow-500/[.12]">
              <div className="text-[10px] font-semibold text-yellow-500 mb-1.5">IN EPSTEIN</div>
              <div className="text-[11px] text-slate-400 leading-snug">{e.epsteinContext}</div>
            </div>
          </div>
          <div className="text-[11px] text-slate-200 leading-relaxed p-2 px-2.5 bg-pink-500/[.06] border border-pink-500/15 rounded-md">
            <strong className="text-pink-400">Significance: </strong>{e.significance}
          </div>
        </Card>
      ))}
    </div>
  );
}
