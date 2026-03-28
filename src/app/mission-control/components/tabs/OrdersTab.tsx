'use client';

import React, { useState, useEffect } from 'react';
import { Badge, Dot } from '../ui';
import { ORDERS } from '../../lib/mission-data';

const VPS_API = process.env.NEXT_PUBLIC_VPS_ENDPOINT || 'https://ops.jr8ch.com';
const API_KEY = process.env.NEXT_PUBLIC_VIGIL_API_KEY || '';

interface LiveStrategy {
  filename: string;
  sections: string[];
  orderCount: number;
  orders: Array<{ id: number; text: string }>;
  raw?: string;
}

function orderColor(status: string) {
  switch (status) {
    case 'ACTIVE': return '#3b82f6';
    case 'PENDING': return '#f59e0b';
    case 'SUPERSEDED': return '#64748b';
    default: return '#10b981';
  }
}

function orderBadgeLevel(status: string) {
  switch (status) {
    case 'ACTIVE': return 'AMBER';
    case 'PENDING': return 'YELLOW';
    case 'SUPERSEDED': return 'MEDIUM';
    default: return 'GREEN';
  }
}

// Simple markdown renderer for strategy content
function renderStrategyMarkdown(raw: string) {
  const lines = raw.split('\n');
  const elements: React.ReactNode[] = [];

  lines.forEach((line, i) => {
    const t = line.trim();
    if (!t) { elements.push(<div key={i} className="h-1.5" />); return; }
    if (t.startsWith('# ')) {
      elements.push(<h2 key={i} className="text-base font-bold text-cyan-400 mt-5 mb-2 tracking-wider" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{t.slice(2)}</h2>);
    } else if (t.startsWith('## ')) {
      elements.push(<h3 key={i} className="text-sm font-bold text-slate-200 mt-4 mb-2 border-b border-[#2a3550] pb-1.5">{t.slice(3)}</h3>);
    } else if (t.startsWith('### ')) {
      elements.push(<h4 key={i} className="text-[13px] font-semibold text-purple-400 mt-3 mb-1">{t.slice(4)}</h4>);
    } else if (t.startsWith('- ') || t.startsWith('* ')) {
      const content = t.slice(2);
      const isImportant = /CRITICAL|RED FLAG|ELEVATED|URGENT|WARNING|MANDATORY/i.test(content);
      elements.push(
        <div key={i} className={`flex items-start gap-2 text-[13px] leading-relaxed pl-3 py-1 ${isImportant ? 'text-orange-400 font-medium' : 'text-slate-400'}`}>
          <span className="text-slate-600 mt-0.5">{'\u25B8'}</span>
          <span>{content}</span>
        </div>
      );
    } else if (/^\d+\./.test(t)) {
      const content = t.replace(/^\d+\.\s*/, '');
      const num = t.match(/^(\d+)/)?.[1];
      elements.push(
        <div key={i} className="flex items-start gap-3 text-[13px] leading-relaxed pl-3 py-1 text-slate-300">
          <span className="font-mono text-cyan-500 font-bold min-w-[24px]">#{num}</span>
          <span>{content}</span>
        </div>
      );
    } else if (t.startsWith('>')) {
      elements.push(
        <div key={i} className="text-[13px] text-amber-400/80 italic pl-4 border-l-2 border-amber-500/30 my-2 py-1">
          {t.slice(1).trim()}
        </div>
      );
    } else if (t.startsWith('---')) {
      elements.push(<hr key={i} className="border-[#2a3550] my-4" />);
    } else if (t.startsWith('**') && t.endsWith('**')) {
      elements.push(<div key={i} className="text-[13px] font-semibold text-slate-200 mt-2">{t.replace(/\*\*/g, '')}</div>);
    } else {
      const rendered = t.replace(/\*\*([^*]+)\*\*/g, '<b class="text-slate-200 font-semibold">$1</b>');
      elements.push(<div key={i} className="text-[13px] text-slate-400 leading-relaxed py-0.5" dangerouslySetInnerHTML={{ __html: rendered }} />);
    }
  });

  return elements;
}

export default function OrdersTab({ realm }: { realm?: 'ai' | 'human' }) {
  const realmLabel = realm === 'human' ? 'AXIOM Directives (Human Realm)' : 'ClarionAgent Directives (AI Realm)';
  const realmColor = realm === 'human' ? '#f59e0b' : '#3b82f6';
  const [liveStrategies, setLiveStrategies] = useState<LiveStrategy[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!API_KEY) return;
    async function fetchStrategy() {
      try {
        const res = await fetch(`${VPS_API}/api/mission/strategy?limit=10`, { headers: { 'x-api-key': API_KEY } });
        if (!res.ok) throw new Error(`${res.status}`);
        const data = await res.json();
        const updates = Array.isArray(data) ? data : data.updates || data.data || [];
        if (updates.length > 0) { setLiveStrategies(updates); setIsLive(true); }
      } catch { /* static fallback */ }
    }
    fetchStrategy();
    const interval = setInterval(fetchStrategy, 60000);
    return () => clearInterval(interval);
  }, []);

  if (isLive && liveStrategies.length > 0) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Dot color="#10b981" pulse />
          <span className="font-mono text-xs tracking-wider" style={{ color: realmColor }}>{realmLabel} — {liveStrategies.length} BRIEFINGS</span>
        </div>

        {liveStrategies.map((s, i) => {
          const isExpanded = expanded === s.filename;

          return (
            <div key={i} className="bg-[#111b2a] border border-[#1e2d44] rounded-xl overflow-hidden" style={{ borderLeft: '3px solid #3b82f6' }}>
              {/* Header — always visible, clickable */}
              <div
                className="flex items-center justify-between px-5 py-3.5 cursor-pointer hover:bg-[#131f30] transition-colors"
                onClick={() => setExpanded(isExpanded ? null : s.filename)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-base">{'\uD83D\uDCCB'}</span>
                  <div>
                    <div className="text-[14px] font-bold text-slate-200">{s.filename}</div>
                    <div className="text-[12px] text-slate-500 mt-0.5">{s.sections.length} sections {s.orderCount > 0 ? `\u2022 ${s.orderCount} orders` : ''}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {s.orderCount > 0 && <span className="font-mono text-[11px] px-2.5 py-1 rounded bg-orange-500/10 text-orange-400 font-semibold">{s.orderCount} ORDERS</span>}
                  <span className="text-slate-500">{isExpanded ? '\u25BE' : '\u25B8'}</span>
                </div>
              </div>

              {/* Section tags — always visible */}
              <div className="px-5 pb-3 flex flex-wrap gap-1.5">
                {s.sections.slice(0, 8).map((sec, j) => (
                  <span key={j} className="text-[11px] text-slate-400 py-0.5 px-2.5 rounded-full bg-white/[.03] border border-white/[.06]">
                    {sec}
                  </span>
                ))}
                {s.sections.length > 8 && <span className="text-[11px] text-slate-600">+{s.sections.length - 8} more</span>}
              </div>

              {/* Orders preview — always visible if present */}
              {s.orders.length > 0 && (
                <div className="px-5 pb-3">
                  <div className="text-[11px] font-bold text-orange-400 uppercase tracking-wider mb-2">Active Orders</div>
                  <div className="space-y-1.5">
                    {s.orders.map((order, j) => (
                      <div key={j} className="flex items-start gap-3 py-2 px-3 rounded-lg bg-orange-500/[.05] border border-orange-500/[.12]">
                        <span className="font-mono text-[13px] font-bold text-orange-400 shrink-0 mt-px">#{order.id}</span>
                        <span className="text-[13px] text-slate-300 leading-relaxed">{order.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Full strategy markdown — expanded only */}
              {isExpanded && s.raw && (
                <div className="px-5 pb-5 pt-2 border-t border-[#1e2d44]">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">Full Strategy Document</div>
                  <div className="bg-[#0a0f18] rounded-xl p-5 border border-[#1a2740] max-h-[600px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                    {renderStrategyMarkdown(s.raw)}
                  </div>
                </div>
              )}

              {isExpanded && !s.raw && (
                <div className="px-5 pb-4 pt-2 border-t border-[#1e2d44] text-center text-[13px] text-slate-600">
                  Full document not available in this response. Check the VPS dead-drop directly.
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Static fallback
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 px-1">
        <Dot color="#f59e0b" />
        <span className="font-mono text-xs tracking-wider text-amber-500">STATIC FALLBACK — VPS UNREACHABLE</span>
      </div>

      {[...ORDERS].reverse().map((o, i) => (
        <div key={i} className="animate-fadeIn flex items-start gap-4 p-4 bg-[#111b2a] border border-[#1e2d44] rounded-xl" style={{ borderLeft: `3px solid ${orderColor(o.status)}` }}>
          <div className="font-mono text-[11px] text-slate-500 min-w-[30px]">#{o.id}</div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[14px] font-semibold text-slate-200">{o.title}</span>
              <Badge level={orderBadgeLevel(o.status)} small />
            </div>
            <div className="text-[13px] text-slate-400 leading-relaxed">{o.summary}</div>
          </div>
          <div className="font-mono text-[11px] text-slate-500 shrink-0 whitespace-nowrap">{o.date}</div>
        </div>
      ))}
    </div>
  );
}
