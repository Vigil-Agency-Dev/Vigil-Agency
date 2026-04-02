'use client';

import React, { useState, useEffect } from 'react';
import { Badge, Dot } from '../ui';
import { SCOUT } from '../../lib/mission-data';

const VPS_API = process.env.NEXT_PUBLIC_VPS_ENDPOINT || 'https://ops.jr8ch.com';
const API_KEY = process.env.NEXT_PUBLIC_VIGIL_API_KEY || '';

// SCOUT-related threat IDs and keywords
const SCOUT_THREAT_IDS = ['DV-05', 'DV-06', 'SCOUT'];
const SCOUT_KEYWORDS = ['scout', 'narrative', 'trust erosion', 'bot', 'coordinated', 'cluster'];

export default function ScoutTab() {
  const s = SCOUT;
  const [isLive, setIsLive] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [liveThreats, setLiveThreats] = useState<Array<{ id: string; name: string; severity: string; status: string; detail: string }>>([]);
  const [livePatterns, setLivePatterns] = useState<Array<{ id?: string; pattern_class?: string; confidence?: number; indicators?: string[] }>>([]);
  const [liveHypotheses, setLiveHypotheses] = useState<Array<{ id: string; title: string; status: string }>>([]);

  useEffect(() => {
    if (!API_KEY) return;
    async function load() {
      try {
        const [threatsRes, patternsRes, hyposRes] = await Promise.all([
          fetch(`${VPS_API}/api/mission/threats`, { headers: { 'x-api-key': API_KEY } }),
          fetch(`${VPS_API}/api/mission/patterns`, { headers: { 'x-api-key': API_KEY } }).catch(() => null),
          fetch(`${VPS_API}/api/mission/hypotheses`, { headers: { 'x-api-key': API_KEY } }).catch(() => null),
        ]);

        if (threatsRes.ok) {
          const data = await threatsRes.json();
          const scoutRelated = (data.threats || []).filter((t: any) =>
            SCOUT_THREAT_IDS.some(id => t.id?.startsWith(id)) ||
            SCOUT_KEYWORDS.some(kw => (t.name || '').toLowerCase().includes(kw) || (t.detail || '').toLowerCase().includes(kw))
          );
          setLiveThreats(scoutRelated);
          setIsLive(true);
        }

        if (patternsRes?.ok) {
          const data = await patternsRes.json();
          const scoutPatterns = (data.patterns || []).filter((p: any) =>
            SCOUT_KEYWORDS.some(kw => JSON.stringify(p).toLowerCase().includes(kw))
          );
          setLivePatterns(scoutPatterns);
        }

        if (hyposRes?.ok) {
          const data = await hyposRes.json();
          const scoutHypos = (data.hypotheses || []).filter((h: any) =>
            (h.title || '').toLowerCase().includes('scout') ||
            (h.title || '').toLowerCase().includes('bot') ||
            (h.title || '').toLowerCase().includes('coordinated')
          );
          setLiveHypotheses(scoutHypos);
        }

        setLastUpdated(new Date().toISOString());
      } catch { setIsLive(false); }
    }
    load();
    const interval = setInterval(load, 60000);
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
          {isLive ? `LIVE — ${liveThreats.length} SCOUT THREATS · ${livePatterns.length} PATTERNS` : 'STATIC DATA — VPS UNREACHABLE'}
        </span>
        {lastUpdated && <span className="font-mono text-[9px] text-slate-600 ml-2">Updated {timeAgo(lastUpdated)}</span>}
      </div>

      {/* Live Monitoring Section */}
      {isLive && liveThreats.length > 0 && (
        <div className="bg-red-500/[.06] border border-red-500/20 rounded-xl p-4">
          <div className="text-[11px] font-bold text-red-400 uppercase tracking-wider mb-2">LIVE THREAT MONITORING</div>
          <div className="space-y-2">
            {liveThreats.map((t, i) => (
              <div key={i} className="flex items-center gap-2 text-[11px]">
                <Badge level={t.severity as any} small />
                <span className="font-mono text-[9px] text-slate-500">{t.id}</span>
                <span className="text-slate-300">{t.name}</span>
                <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-white/[.03] text-slate-400">{t.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Related Hypotheses */}
      {isLive && liveHypotheses.length > 0 && (
        <div className="bg-purple-500/[.06] border border-purple-500/20 rounded-xl p-4">
          <div className="text-[11px] font-bold text-purple-400 uppercase tracking-wider mb-2">RELATED HYPOTHESES</div>
          {liveHypotheses.map((h, i) => (
            <div key={i} className="flex items-center gap-2 text-[11px] py-1">
              <span className="font-mono text-[9px] text-purple-400">{h.id}</span>
              <span className="text-slate-300">{h.title}</span>
              <span className="font-mono text-[9px] text-slate-500">{h.status}</span>
            </div>
          ))}
        </div>
      )}

      {/* Static SCOUT Cluster Intel */}
      <div className="bg-orange-500/[.08] border border-orange-500/25 rounded-xl p-5">
        <div className="flex items-center gap-2.5 mb-3.5">
          <span className="text-lg">&#x26A0;&#xFE0F;</span>
          <h2 className="text-[15px] font-bold text-orange-500">SCOUT CLUSTER — Active Coordinated Operation</h2>
          <Badge level="ORANGE" />
        </div>

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

        <div className="text-xs text-slate-400 mb-3.5 leading-relaxed">
          <strong className="text-slate-200">Hypothesis: </strong>{s.hypothesis}
        </div>

        <div className="text-[11px] font-semibold text-slate-500 uppercase mb-2">Shared Lexicon</div>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {s.lexicon.map((w, i) => (
            <span key={i} className="px-2 py-0.5 rounded text-[10px] font-mono bg-orange-500/[.12] text-orange-500 border border-orange-500/20">
              {w}
            </span>
          ))}
        </div>

        <div className="text-[11px] font-semibold text-slate-500 uppercase mb-2">Evidence of Coordination</div>
        <div className="flex flex-col gap-1 mb-4">
          {s.evidence.map((e, i) => (
            <div key={i} className="text-[11px] text-slate-400 py-1 px-2.5 rounded bg-white/[.02]">
              &#x25B8; {e}
            </div>
          ))}
        </div>

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
