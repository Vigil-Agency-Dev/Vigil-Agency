'use client';

import React, { useState, useEffect } from 'react';
import { Dot } from '../ui';
import { formatAESTShort, timeAgo } from '../../lib/date-utils';
import IntelExchangeTab from './IntelExchangeTab';
import CorrelationMapTab from './CorrelationMapTab';

const VPS_API = process.env.NEXT_PUBLIC_VPS_ENDPOINT || 'https://ops.jr8ch.com';
const API_KEY = process.env.NEXT_PUBLIC_VIGIL_API_KEY || '';

interface MeridianBriefing {
  filename: string;
  source: string;
  modified: string;
  sizeBytes: number;
  mcId: string | null;
  title: string;
  classification: string | null;
  filed_by: string | null;
  summary: string;
  body: string;
}

type Section = 'briefings' | 'patterns' | 'entities';

export default function CrossDomainTab() {
  const [briefings, setBriefings] = useState<MeridianBriefing[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<Section>('briefings');
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!API_KEY) return;
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`${VPS_API}/api/mission/meridian-briefings?limit=20`, {
          headers: { 'x-api-key': API_KEY },
        });
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          setBriefings(data.briefings || []);
          setIsLive(true);
          setLastUpdated(new Date().toISOString());
        }
      } catch {
        /* leave prior state */
      }
    }

    load();
    const interval = setInterval(load, 120000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const sections: { id: Section; label: string; count: number | null }[] = [
    { id: 'briefings', label: 'MERIDIAN Briefings', count: briefings.length || null },
    { id: 'patterns', label: 'Pattern Correlation', count: null },
    { id: 'entities', label: 'Shared Entities & Pattern Matches', count: null },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Cross-domain header */}
      <div className="rounded-xl border border-[#2a3550] bg-gradient-to-r from-purple-500/[.06] to-cyan-500/[.04] p-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <Dot color={isLive ? '#10b981' : '#f59e0b'} pulse={isLive} />
            <div>
              <div className="text-[14px] font-bold tracking-wide text-slate-200">Cross-Domain Intelligence</div>
              <div className="text-[11px] text-slate-500">MERIDIAN synthesis · Pattern correlation across SIGINT + HUMINT theatres</div>
            </div>
          </div>
          {lastUpdated && (
            <span className="font-mono text-[10px] text-slate-500">Updated {timeAgo(lastUpdated)}</span>
          )}
        </div>
      </div>

      {/* Section nav */}
      <div className="flex items-center gap-1.5 border-b border-[#1e2d44] pb-0">
        {sections.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`font-mono text-[11px] px-3 py-2 border-b-2 transition-colors -mb-[1px] ${
              activeSection === s.id
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            }`}
          >
            {s.label.toUpperCase()}
            {s.count !== null && (
              <span className="ml-1.5 text-slate-600">({s.count})</span>
            )}
          </button>
        ))}
      </div>

      {/* Section 1: MERIDIAN Briefings */}
      {activeSection === 'briefings' && (
        <div className="flex flex-col gap-3">
          <div className="text-[11px] text-slate-500 leading-relaxed italic">
            MERIDIAN cross-domain briefings fuse SIGINT (Clarion) and HUMINT (Cairn) intel with OSINT research. MC-### sequence is MERIDIAN&apos;s canonical briefing register.
          </div>

          {briefings.length === 0 ? (
            <div className="text-center py-10 bg-[#111b2a] border border-[#1e2d44] rounded-xl">
              <div className="text-[13px] text-slate-500">
                {isLive ? 'No MERIDIAN briefings in the current window.' : 'Connecting to MERIDIAN feed...'}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {briefings.map(b => {
                const id = b.filename;
                const isExpanded = expanded === id;
                return (
                  <div key={id} className={`bg-[#111b2a] border border-[#1e2d44] rounded-xl overflow-hidden transition-colors ${isExpanded ? 'ring-1 ring-purple-500/20' : ''}`}
                    style={{ borderLeft: '3px solid #8b5cf6' }}>
                    <div
                      className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-[#131f30] transition-colors"
                      onClick={() => setExpanded(isExpanded ? null : id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">MERIDIAN</span>
                          {b.mcId && (
                            <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-400">{b.mcId}</span>
                          )}
                          <span className="text-[13px] font-semibold text-slate-200 truncate">{b.title}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 font-mono text-[10px] text-slate-500">
                          <span>{formatAESTShort(b.modified)}</span>
                          <span className="text-slate-600">·</span>
                          <span>{timeAgo(b.modified)}</span>
                          {b.classification && <span className="text-amber-500">· {b.classification}</span>}
                          <span className="truncate">· {b.source}</span>
                        </div>
                      </div>
                      <span className="text-slate-500 text-xs shrink-0">{isExpanded ? '▾' : '▸'}</span>
                    </div>
                    {!isExpanded && b.summary && (
                      <div className="px-4 pb-2.5 text-[12px] text-slate-400 leading-snug line-clamp-2">{b.summary}</div>
                    )}
                    {isExpanded && (
                      <div className="px-4 pb-3 border-t border-[#1e2d44]">
                        <div className="mt-2 text-[12px] text-slate-300 leading-relaxed p-3 rounded-lg bg-[#0a0f18] border border-[#1a2740] whitespace-pre-wrap" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', maxHeight: '700px', overflowY: 'auto' }}>
                          {b.body}
                        </div>
                        <div className="mt-2 font-mono text-[9px] text-slate-600 truncate">{b.filename}</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Section 2: Pattern Correlation (correlation map viz) */}
      {activeSection === 'patterns' && (
        <div className="flex flex-col gap-2">
          <div className="text-[11px] text-slate-500 leading-relaxed italic mb-1">
            Radial correlation graph of hypotheses, threats, patterns, entities, and allies. Central nodes = active hypotheses; outer rings = supporting evidence and relationships.
          </div>
          <CorrelationMapTab />
        </div>
      )}

      {/* Section 3: Shared Entities + Pattern Matches */}
      {activeSection === 'entities' && (
        <div className="flex flex-col gap-2">
          <div className="text-[11px] text-slate-500 leading-relaxed italic mb-1">
            Entities appearing across both SIGINT and HUMINT feeds, plus live pattern matches between Ai Human Alliance and Epstein Class Uncovered investigations.
          </div>
          <IntelExchangeTab />
        </div>
      )}
    </div>
  );
}
