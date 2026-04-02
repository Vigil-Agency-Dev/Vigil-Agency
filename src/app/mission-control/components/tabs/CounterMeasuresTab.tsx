'use client';

import React, { useState, useEffect } from 'react';
import { Badge, Dot } from '../ui';
import { COUNTER_MEASURES } from '../../lib/mission-data';

const VPS_API = process.env.NEXT_PUBLIC_VPS_ENDPOINT || 'https://ops.jr8ch.com';
const API_KEY = process.env.NEXT_PUBLIC_VIGIL_API_KEY || '';

export default function CounterMeasuresTab() {
  const [isLive, setIsLive] = useState(false);
  const [liveThreats, setLiveThreats] = useState<Record<string, { severity: string; status: string }>>({});
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    if (!API_KEY) return;

    async function load() {
      try {
        const res = await fetch(`${VPS_API}/api/mission/threats`, { headers: { 'x-api-key': API_KEY } });
        if (!res.ok) throw new Error();
        const data = await res.json();
        const threatMap: Record<string, { severity: string; status: string }> = {};
        for (const t of (data.threats || [])) {
          threatMap[t.id] = { severity: t.severity, status: t.status };
        }
        setLiveThreats(threatMap);
        setIsLive(true);
        setLastUpdated(new Date().toISOString());
      } catch { setIsLive(false); }
    }

    load();
    const interval = setInterval(load, 120000);
    return () => clearInterval(interval);
  }, []);

  // Map CM IDs to threat IDs for live enrichment
  const CM_TO_THREAT: Record<string, string[]> = {
    'CM-REC': ['DV-01'],
    'CM-SEN': ['DV-02'],
    'CM-NAR': ['DV-05'],
    'CM-TRU': ['DV-06'],
    'CM-COG': ['DV-08'],
    'CM-SUR': ['DV-03'],
    'CM-PRE': ['DV-04'],
    'CM-FIN': ['DV-07'],
  };

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
          {isLive ? `LIVE — THREAT SEVERITY ENRICHED` : 'STATIC DATA'}
        </span>
        {lastUpdated && <span className="font-mono text-[9px] text-slate-600 ml-2">Updated {timeAgo(lastUpdated)}</span>}
      </div>

      {/* Mesh Doctrine */}
      <div className="text-xs text-slate-400 p-3 px-3.5 bg-blue-500/[.06] border border-blue-500/15 rounded-lg leading-relaxed">
        <strong className="text-cyan-400">The Mesh Doctrine: </strong>
        Distributed counter-intelligence network. Each recruited ally operates with autonomous creative authority within their Counter-Measure Domain. Counter-narratives deploy through allied voices, never directly. Build it, don&apos;t fire it until RED threshold.
      </div>

      {/* CM Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
        {COUNTER_MEASURES.map((cm, i) => {
          const threatIds = CM_TO_THREAT[cm.id] || [];
          const linkedThreats = threatIds.map(id => liveThreats[id]).filter(Boolean);
          const liveSeverity = linkedThreats[0]?.severity;
          const liveStatus = linkedThreats[0]?.status;

          return (
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
                <div className="flex items-center gap-1.5">
                  {liveSeverity && (
                    <Badge level={liveSeverity as 'RED' | 'ORANGE' | 'AMBER' | 'YELLOW' | 'GREEN'} small />
                  )}
                  <Badge
                    level={cm.status === 'PRE-BUILT' ? 'AMBER' : cm.status === 'MONITORING' ? 'YELLOW' : 'MEDIUM'}
                    small
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px]" style={{
                  color: cm.status === 'PRE-BUILT' ? '#f59e0b' : '#64748b',
                }}>
                  {cm.status}
                </span>
                {liveStatus && isLive && (
                  <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-white/[.03] text-slate-400">
                    Threat: {liveStatus}
                  </span>
                )}
              </div>
              {cm.note && (
                <div className="text-[11px] text-slate-400 mt-1.5 leading-snug">{cm.note}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
