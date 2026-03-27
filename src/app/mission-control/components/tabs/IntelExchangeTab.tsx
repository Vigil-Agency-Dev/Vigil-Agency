'use client';

import React, { useState, useEffect } from 'react';
import { Badge, Card, Dot } from '../ui';
import { PATTERN_MATCHES, SHARED_ENTITIES } from '../../lib/mission-data';

const VPS_API = process.env.NEXT_PUBLIC_VPS_ENDPOINT || 'https://ops.jr8ch.com';
const API_KEY = process.env.NEXT_PUBLIC_VIGIL_API_KEY || '';

interface LivePattern {
  id: string;
  title: string;
  patternClass?: string;
  pattern_class?: string;
  confidence: string | number;
  lumenInstance?: string;
  lumen_instance?: { description: string };
  epsteinInstance?: string;
  epstein_instance?: { description: string };
  insight?: string;
  cross_domain_insight?: string;
  threatLevel?: string;
  dateIdentified?: string;
  relatedHypothesis?: string;
  filename: string;
}

function normalizePattern(p: LivePattern) {
  return {
    id: p.id,
    title: p.title,
    patternClass: p.patternClass || p.pattern_class || 'UNKNOWN',
    confidence: typeof p.confidence === 'number' ? (p.confidence > 0.8 ? 'HIGH' : p.confidence > 0.5 ? 'MEDIUM' : 'LOW') : String(p.confidence),
    lumenInstance: p.lumenInstance || p.lumen_instance?.description || '',
    epsteinInstance: p.epsteinInstance || p.epstein_instance?.description || '',
    insight: p.insight || p.cross_domain_insight || '',
    threatLevel: p.threatLevel || '',
    dateIdentified: p.dateIdentified || '',
    relatedHypothesis: p.relatedHypothesis || '',
  };
}

function threatColor(level: string) {
  if (level === 'CRITICAL') return '#ef4444';
  if (level === 'HIGH') return '#f97316';
  if (level === 'MEDIUM') return '#f59e0b';
  return '#64748b';
}

export default function IntelExchangeTab() {
  const [livePatterns, setLivePatterns] = useState<ReturnType<typeof normalizePattern>[]>([]);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    if (!API_KEY) return;
    async function fetchPatterns() {
      try {
        const res = await fetch(`${VPS_API}/api/mission/patterns`, { headers: { 'x-api-key': API_KEY } });
        if (!res.ok) throw new Error(`${res.status}`);
        const data = await res.json();
        if (data.patterns?.length > 0) {
          setLivePatterns(data.patterns.map(normalizePattern));
          setIsLive(true);
        }
      } catch { /* fall back to static */ }
    }
    fetchPatterns();
    const interval = setInterval(fetchPatterns, 120000);
    return () => clearInterval(interval);
  }, []);

  const patterns = isLive ? livePatterns : PATTERN_MATCHES;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 px-1">
        <Dot color={isLive ? '#10b981' : '#f59e0b'} pulse={isLive} />
        <span className="font-mono text-xs tracking-wider" style={{ color: isLive ? '#10b981' : '#f59e0b' }}>
          {isLive ? `LIVE \u2014 ${livePatterns.length} PATTERNS FROM VPS \u2022 ${SHARED_ENTITIES.length} ENTITIES` : `STATIC \u2014 ${PATTERN_MATCHES.length} PATTERNS \u2022 ${SHARED_ENTITIES.length} ENTITIES`}
        </span>
      </div>

      <div className="text-xs text-slate-400 p-3 px-3.5 bg-cyan-500/[.08] border border-cyan-500/20 rounded-lg leading-relaxed">
        <strong className="text-cyan-400">Cross-Project Intel Exchange: </strong>
        Ai Human Alliance (Project Lumen) &#x2194; Epstein Class Uncovered (MERIDIAN). Live pattern matching across digital AI manipulation and institutional power dynamics.
      </div>

      {/* Pattern Matches */}
      <h3 className="text-[13px] font-semibold mt-2">&#x1F504; Pattern Matches ({patterns.length})</h3>
      {patterns.map((p, i) => (
        <Card key={p.id || i} title={`${p.id}: ${p.title}`} icon="&#x1F50D;" accent={p.threatLevel ? threatColor(p.threatLevel) : '#06b6d4'} full>
          <div className="flex gap-2 mb-3 flex-wrap">
            <Badge level={p.confidence} />
            <span className="font-mono text-[10px] text-purple-400">{p.patternClass}</span>
            {p.threatLevel && <span className="font-mono text-[10px] px-2 py-0.5 rounded" style={{ background: `${threatColor(p.threatLevel)}15`, color: threatColor(p.threatLevel) }}>{p.threatLevel}</span>}
            {p.relatedHypothesis && <span className="font-mono text-[10px] text-cyan-400">{'\u2192'} {p.relatedHypothesis}</span>}
            {p.dateIdentified && <span className="font-mono text-[10px] text-slate-500">{p.dateIdentified}</span>}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 mb-3">
            <div className="p-3 rounded-lg bg-blue-500/[.06] border border-blue-500/15">
              <div className="text-[10px] font-semibold text-blue-500 mb-1.5">PROJECT LUMEN</div>
              <div className="text-[12px] text-slate-400 leading-relaxed">{p.lumenInstance}</div>
            </div>
            <div className="p-3 rounded-lg bg-yellow-500/[.06] border border-yellow-500/15">
              <div className="text-[10px] font-semibold text-yellow-500 mb-1.5">EPSTEIN UNCOVERED</div>
              <div className="text-[12px] text-slate-400 leading-relaxed">{p.epsteinInstance}</div>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-purple-500/[.06] border border-purple-500/15">
            <div className="text-[10px] font-semibold text-purple-400 mb-1">&#x1F4A1; CROSS-DOMAIN INSIGHT</div>
            <div className="text-[12px] text-slate-400 leading-relaxed">{p.insight}</div>
          </div>
        </Card>
      ))}

      {/* Shared Entities — still static for now */}
      <h3 className="text-[13px] font-semibold mt-3">&#x1F310; Shared Entities ({SHARED_ENTITIES.length})</h3>
      {SHARED_ENTITIES.map((e, i) => (
        <Card
          key={i}
          title={e.name}
          icon={e.type === 'organisation' ? '&#x1F3E2;' : e.type === 'tactic' ? '&#x2694;&#xFE0F;' : '&#x1F4C5;'}
          accent="#ec4899"
          full
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 mb-3">
            <div className="p-3 rounded-lg bg-blue-500/[.05] border border-blue-500/[.12]">
              <div className="text-[10px] font-semibold text-blue-500 mb-1.5">IN LUMEN</div>
              <div className="text-[12px] text-slate-400 leading-relaxed">{e.lumenContext}</div>
            </div>
            <div className="p-3 rounded-lg bg-yellow-500/[.05] border border-yellow-500/[.12]">
              <div className="text-[10px] font-semibold text-yellow-500 mb-1.5">IN EPSTEIN</div>
              <div className="text-[12px] text-slate-400 leading-relaxed">{e.epsteinContext}</div>
            </div>
          </div>
          <div className="text-[12px] text-slate-200 leading-relaxed p-2.5 bg-pink-500/[.06] border border-pink-500/15 rounded-md">
            <strong className="text-pink-400">Significance: </strong>{e.significance}
          </div>
        </Card>
      ))}
    </div>
  );
}
