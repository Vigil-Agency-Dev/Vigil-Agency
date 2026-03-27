'use client';

import React, { useState, useEffect } from 'react';
import { Badge, Dot } from '../ui';
import { SCOUT } from '../../lib/mission-data';

const VPS_API = process.env.NEXT_PUBLIC_VPS_ENDPOINT || 'https://ops.jr8ch.com';
const API_KEY = process.env.NEXT_PUBLIC_VIGIL_API_KEY || '';

export default function ScoutTab() {
  const s = SCOUT;
  const [isLive, setIsLive] = useState(false);
  const [liveScoutCount, setLiveScoutCount] = useState<number | null>(null);

  useEffect(() => {
    if (!API_KEY) return;
    async function fetchScout() {
      try {
        const res = await fetch(`${VPS_API}/api/mission/threats`, { headers: { 'x-api-key': API_KEY } });
        if (!res.ok) throw new Error(`${res.status}`);
        const data = await res.json();
        if (data.threats) {
          setIsLive(true);
          const scoutThreats = data.threats.filter((t: any) => t.name?.toLowerCase().includes('narrative') || t.name?.toLowerCase().includes('trust') || t.status === 'ACTIVE');
          setLiveScoutCount(scoutThreats.length);
        }
      } catch { /* fall back */ }
    }
    fetchScout();
    const interval = setInterval(fetchScout, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 px-1">
        <Dot color={isLive ? '#10b981' : '#f59e0b'} pulse={isLive} />
        <span className="font-mono text-[10px] tracking-wider" style={{ color: isLive ? '#10b981' : '#f59e0b' }}>
          {isLive ? `LIVE — VPS CONNECTED · ${liveScoutCount || 0} ACTIVE THREATS` : 'STATIC DATA — VPS UNREACHABLE'}
        </span>
      </div>
      <div className="bg-orange-500/[.08] border border-orange-500/25 rounded-xl p-5">
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-3.5">
          <span className="text-lg">&#x26A0;&#xFE0F;</span>
          <h2 className="text-[15px] font-bold text-orange-500">SCOUT CLUSTER — Active Coordinated Operation</h2>
          <Badge level="ORANGE" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3.5 mb-4">
          {[
            { l: 'Accounts', v: s.total },
            { l: 'Created', v: s.created },
            { l: 'Dormancy', v: `${s.dormancy}d` },
            { l: 'Target', v: s.target },
          ].map((x, i) => (
            <div key={i}>
              <div className="text-[10px] text-slate-500">{x.l}</div>
              <div className="font-mono text-base font-semibold mt-0.5" style={{ color: i === 0 ? '#f97316' : undefined }}>
                {x.v}
              </div>
            </div>
          ))}
        </div>

        {/* Hypothesis */}
        <div className="text-xs text-slate-400 mb-3.5 leading-relaxed">
          <strong className="text-slate-200">Hypothesis: </strong>{s.hypothesis}
        </div>

        {/* Lexicon */}
        <div className="text-[11px] font-semibold text-slate-500 uppercase mb-2">Shared Lexicon</div>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {s.lexicon.map((w, i) => (
            <span
              key={i}
              className="px-2 py-0.5 rounded text-[10px] font-mono bg-orange-500/[.12] text-orange-500 border border-orange-500/20"
            >
              {w}
            </span>
          ))}
        </div>

        {/* Evidence */}
        <div className="text-[11px] font-semibold text-slate-500 uppercase mb-2">Evidence of Coordination</div>
        <div className="flex flex-col gap-1 mb-4">
          {s.evidence.map((e, i) => (
            <div key={i} className="text-[11px] text-slate-400 py-1 px-2.5 rounded bg-white/[.02]">
              &#x25B8; {e}
            </div>
          ))}
        </div>

        {/* Agent Table */}
        <div className="text-[11px] font-semibold text-slate-500 uppercase mb-2">Cluster Agents</div>
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr className="border-b border-[#2a3550]">
              {['Agent', 'Karma', 'Role/Framing'].map(h => (
                <th key={h} className="py-1.5 px-2.5 text-left text-[9px] text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {s.agents.map((a, i) => (
              <tr key={i} className="border-b border-white/[.02]">
                <td className="py-1.5 px-2.5 font-mono text-orange-500">{a.n}</td>
                <td className="py-1.5 px-2.5 font-mono">{a.k}</td>
                <td className="py-1.5 px-2.5 text-slate-400">{a.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
