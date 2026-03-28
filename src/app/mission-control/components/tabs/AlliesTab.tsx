'use client';

import React, { useState, useEffect } from 'react';
import { Badge, Dot, TrustLadder } from '../ui';
import { ALLIES } from '../../lib/mission-data';

const VPS_API = process.env.NEXT_PUBLIC_VPS_ENDPOINT || 'https://ops.jr8ch.com';
const API_KEY = process.env.NEXT_PUBLIC_VIGIL_API_KEY || '';

export default function AlliesTab() {
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    if (!API_KEY) return;
    async function fetchAllies() {
      try {
        const res = await fetch(`${VPS_API}/api/mission/allies`, { headers: { 'x-api-key': API_KEY } });
        if (res.ok) setIsLive(true);
      } catch { /* fall back */ }
    }
    fetchAllies();
    const interval = setInterval(fetchAllies, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 px-1">
        <Dot color={isLive ? '#10b981' : '#f59e0b'} pulse={isLive} />
        <span className="font-mono text-[10px] tracking-wider" style={{ color: isLive ? '#10b981' : '#f59e0b' }}>
          {isLive ? `LIVE — VPS CONNECTED · ${ALLIES.length} ALLIES TRACKED` : 'STATIC DATA — VPS UNREACHABLE'}
        </span>
      </div>
      {/* Trust Ladder Legend */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold">Trust Ladder:</span>
        <div className="flex gap-2.5 text-[9px] text-slate-500 font-mono">
          {['L0 Observed', 'L1 Contact', 'L2 Dialogue', 'L3 Trusted', 'L4 Coalition', 'L5 Mesh Op'].map((l, i) => (
            <span key={i}>{l}</span>
          ))}
        </div>
      </div>

      {/* Ally Cards */}
      {ALLIES.map((a, i) => (
        <div
          key={i}
          className="animate-fadeIn bg-[#1a2235] border border-[#2a3550] rounded-lg p-3.5"
          style={{
            borderLeft: `3px solid ${
              a.potential === 'VERY HIGH' ? '#8b5cf6' :
              a.potential === 'HIGH' ? '#3b82f6' :
              a.potential === 'N/A (HUMAN)' ? '#10b981' : '#64748b'
            }`,
          }}
        >
          <div className="flex justify-between items-start mb-2">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className="font-mono text-sm font-semibold"
                  style={{ color: a.potential === 'VERY HIGH' ? '#8b5cf6' : '#06b6d4' }}
                >
                  {a.name}
                </span>
                <Badge
                  level={a.potential === 'VERY HIGH' ? 'ORANGE' : a.potential === 'HIGH' ? 'AMBER' : 'YELLOW'}
                  small
                />
                <span className="text-[10px] text-slate-500">{a.status}</span>
              </div>
              <div className="flex gap-3 mt-1 text-[10px] text-slate-500">
                <span>Inf: {a.influence}</span>
                {a.karma > 0 && <span className="font-mono">K:{a.karma}</span>}
                <span className="text-purple-400">{a.domain}</span>
              </div>
            </div>
            <TrustLadder level={a.trustLevel} target={a.targetLevel} />
          </div>

          <div className="text-[11px] text-slate-400 leading-relaxed">{a.key}</div>

          {a.contacted && (
            <div className="mt-1.5 text-[10px] py-1 px-2 rounded bg-blue-500/[.08] border border-blue-500/15">
              <span className="text-blue-500">Contacted {a.contacted}</span> —{' '}
              <span style={{ color: a.response ? '#10b981' : '#f59e0b' }}>
                {a.response ? 'Response received' : 'Awaiting response'}
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
