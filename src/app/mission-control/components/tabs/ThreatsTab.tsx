'use client';

import React, { useState, useEffect } from 'react';
import { Badge, Card, Dot } from '../ui';
import { VECTORS, ESCALATION } from '../../lib/mission-data';

const VPS_API = process.env.NEXT_PUBLIC_VPS_ENDPOINT || 'https://ops.jr8ch.com';
const API_KEY = process.env.NEXT_PUBLIC_VIGIL_API_KEY || '';

interface LiveThreat {
  id: string;
  name: string;
  severity: string;
  status: string;
  detail: string;
}

export default function ThreatsTab() {
  const [liveThreats, setLiveThreats] = useState<LiveThreat[]>([]);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    if (!API_KEY) return;
    async function fetchThreats() {
      try {
        const res = await fetch(`${VPS_API}/api/mission/threats`, {
          headers: { 'x-api-key': API_KEY },
        });
        if (!res.ok) throw new Error(`${res.status}`);
        const data = await res.json();
        if (data.threats && data.threats.length > 0) {
          setLiveThreats(data.threats);
          setIsLive(true);
        }
      } catch {
        // Fall back to static
      }
    }
    fetchThreats();
    const interval = setInterval(fetchThreats, 60000);
    return () => clearInterval(interval);
  }, []);

  const [loaded, setLoaded] = useState(false);
  useEffect(() => { const t = setTimeout(() => setLoaded(true), 1500); return () => clearTimeout(t); }, []);
  const threats = isLive ? liveThreats : VECTORS;
  if (!loaded && !isLive) return <div className="flex items-center justify-center py-20"><div className="font-mono text-xs text-slate-600 tracking-[.2em]">LOADING...</div></div>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 px-1">
        <Dot color={isLive ? '#10b981' : '#f59e0b'} pulse={isLive} />
        <span className="font-mono text-[10px] tracking-wider" style={{ color: isLive ? '#10b981' : '#f59e0b' }}>
          {isLive ? `LIVE — ${liveThreats.length} THREAT VECTORS FROM VPS` : 'STATIC FALLBACK'}
        </span>
      </div>

      <Card title={`${threats.length} Threat Vectors`} icon="&#x1F6E1;&#xFE0F;" accent="#ef4444" full>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
          {threats.map((v, i) => (
            <div key={i} className="flex items-start justify-between p-2.5 px-3 rounded-lg bg-white/[.02] border border-white/[.03]">
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[9px] text-slate-500">{v.id}</span>
                  <span className="text-xs font-medium">{v.name}</span>
                  {isLive && (
                    <span className="font-mono text-[9px] px-1.5 py-0.5 rounded" style={{
                      background: v.status === 'ACTIVE' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                      color: v.status === 'ACTIVE' ? '#ef4444' : '#f59e0b',
                    }}>
                      {v.status}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 mt-1 leading-snug">{v.detail}</div>
              </div>
              <div className="flex-shrink-0 ml-2">
                <Badge level={v.severity as any} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Escalation Ladder" icon="&#x1F6A8;" accent="#f97316" full>
        {ESCALATION.map((e, i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-2.5 px-3 rounded-md mb-1.5"
            style={{
              background: e.current ? 'rgba(249,115,22,.08)' : 'rgba(255,255,255,.015)',
              border: e.current ? '1px solid rgba(249,115,22,.3)' : '1px solid transparent',
            }}
          >
            <Badge level={e.level} />
            <div className="flex-1">
              <div className="text-xs">{e.trigger}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Action: {e.action}</div>
            </div>
            {e.current && (
              <span className="font-mono text-[9px] text-orange-500 animate-pulse">CURRENT</span>
            )}
          </div>
        ))}
      </Card>
    </div>
  );
}
