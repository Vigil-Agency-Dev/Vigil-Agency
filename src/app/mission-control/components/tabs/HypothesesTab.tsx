'use client';

import React, { useState, useEffect } from 'react';
import { Dot } from '../ui';
import { useOperation } from '../../lib/operation-context';

const VPS_API = process.env.NEXT_PUBLIC_VPS_ENDPOINT || 'https://ops.jr8ch.com';
const API_KEY = process.env.NEXT_PUBLIC_VIGIL_API_KEY || '';

interface Hypothesis {
  id: string;
  title: string;
  status: string;
  analyst: string;
  filed: string;
  classification: string;
  crossRef: string[];
  filename: string;
  raw: string;
}

function statusColor(s: string) {
  if (s.includes('ACTIVE')) return '#3b82f6';
  if (s.includes('CONFIRMED')) return '#10b981';
  if (s.includes('DISPROVEN')) return '#ef4444';
  if (s.includes('REVIEW')) return '#f59e0b';
  return '#64748b';
}

function renderMarkdownBlock(raw: string) {
  return raw.split('\n').map((line, i) => {
    const t = line.trim();
    if (!t) return <div key={i} className="h-2" />;
    if (t.startsWith('# ')) return <h2 key={i} className="text-lg font-bold text-cyan-400 mt-5 mb-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{t.slice(2)}</h2>;
    if (t.startsWith('## ')) return <h3 key={i} className="text-base font-bold text-slate-200 mt-4 mb-2 border-b border-[#2a3550] pb-1.5">{t.slice(3)}</h3>;
    if (t.startsWith('### ')) return <h4 key={i} className="text-[14px] font-semibold text-purple-400 mt-3 mb-1">{t.slice(4)}</h4>;
    if (t.startsWith('- ') || t.startsWith('* ')) {
      const content = t.slice(2);
      const isImportant = /CRITICAL|CONFIRMED|TIER 1|DOCUMENTED|MANDATORY/i.test(content);
      return (
        <div key={i} className={`flex items-start gap-2 text-[13px] leading-relaxed pl-3 py-1 ${isImportant ? 'text-amber-400 font-medium' : 'text-slate-400'}`}>
          <span className="text-slate-600 mt-0.5">{'\u25B8'}</span>
          <span>{content}</span>
        </div>
      );
    }
    if (/^\d+\./.test(t)) {
      const num = t.match(/^(\d+)/)?.[1];
      const content = t.replace(/^\d+\.\s*/, '');
      return (
        <div key={i} className="flex items-start gap-3 text-[13px] leading-relaxed pl-3 py-1 text-slate-300">
          <span className="font-mono text-cyan-500 font-bold min-w-[24px]">{num}.</span>
          <span>{content}</span>
        </div>
      );
    }
    if (t.startsWith('**') && t.endsWith('**')) return <div key={i} className="text-[14px] font-bold text-slate-200 mt-2 mb-1">{t.replace(/\*\*/g, '')}</div>;
    if (t.startsWith('>')) return <div key={i} className="text-[13px] text-amber-400/80 italic pl-4 border-l-2 border-amber-500/30 my-2 py-1">{t.slice(1).trim()}</div>;
    if (t.startsWith('|')) return <div key={i} className="text-[12px] text-slate-400 font-mono py-0.5">{t}</div>;
    if (t.startsWith('---')) return <hr key={i} className="border-[#2a3550] my-4" />;
    const rendered = t.replace(/\*\*([^*]+)\*\*/g, '<b class="text-slate-200 font-semibold">$1</b>').replace(/\*([^*]+)\*/g, '<i class="text-slate-300">$1</i>');
    return <div key={i} className="text-[13px] text-slate-400 leading-relaxed py-0.5" dangerouslySetInnerHTML={{ __html: rendered }} />;
  });
}

// Map hypothesis IDs to operations
function getHypothesisOp(id: string): string {
  if (id.startsWith('H-SC')) return 'op-003';
  return 'op-001'; // H-001 to H-004 are Lumen/Epstein
}

// Extract revision number from raw content
function getRevision(raw: string): string {
  const match = raw?.match(/\bRev\.?\s*([\d.]+)/i) || raw?.match(/\brevision[:\s]*([\d.]+)/i);
  return match ? match[1] : '1.0';
}

export default function HypothesesTab() {
  const op = useOperation();
  const [hypotheses, setHypotheses] = useState<Hypothesis[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState<string | null>(null);

  useEffect(() => {
    if (!API_KEY) { setLoading(false); return; }
    async function fetchHypotheses() {
      try {
        const res = await fetch(`${VPS_API}/api/mission/hypotheses`, { headers: { 'x-api-key': API_KEY } });
        if (!res.ok) throw new Error(`${res.status}`);
        const data = await res.json();
        if (data.hypotheses?.length > 0) {
          setHypotheses(data.hypotheses);
          setIsLive(true);
          if (!expanded && data.hypotheses.length > 0) setExpanded(data.hypotheses[0].id);
        }
      } catch { /* no data */ }
      setLoading(false);
    }
    fetchHypotheses();
    const interval = setInterval(fetchHypotheses, 120000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="text-center py-16 text-slate-500 text-sm">Loading hypotheses...</div>;

  // Filter out CONFIRMED (they live on the Findings page now) and filter by operation
  const filtered = hypotheses.filter(h => {
    if (h.status.toUpperCase().includes('CONFIRMED')) return false;
    if (op.id === 'op-003') return h.id.startsWith('H-SC');
    if (op.id === 'op-002') return !h.id.startsWith('H-SC');
    return !h.id.startsWith('H-SC');
  });

  // Group by base ID (strip version suffix) and sort by revision
  const grouped = filtered.reduce<Record<string, Hypothesis[]>>((acc, h) => {
    const baseId = h.id.replace(/-v[\d.]+$/, '');
    if (!acc[baseId]) acc[baseId] = [];
    acc[baseId].push(h);
    return acc;
  }, {});

  // Sort each group by revision (latest first)
  Object.values(grouped).forEach(group => {
    group.sort((a, b) => {
      const revA = parseFloat(getRevision(a.raw || ''));
      const revB = parseFloat(getRevision(b.raw || ''));
      return revB - revA;
    });
  });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 px-1">
        <Dot color={isLive ? '#10b981' : '#f59e0b'} pulse={isLive} />
        <span className="font-mono text-xs tracking-wider" style={{ color: isLive ? '#10b981' : '#f59e0b' }}>
          {isLive ? `LIVE \u2014 ${hypotheses.length} FORMAL HYPOTHESES FROM VPS` : 'NO HYPOTHESIS DATA AVAILABLE'}
        </span>
      </div>

      <div className="p-5 bg-gradient-to-r from-blue-500/[.08] to-purple-500/[.04] border border-blue-500/20 rounded-xl">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xl">{'\uD83E\uDDE0'}</span>
          <h2 className="text-base font-bold text-blue-400" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            HYPOTHESES — {op.codename}
          </h2>
        </div>
        <p className="text-[13px] text-slate-300 leading-relaxed">
          {filtered.length} hypotheses for {op.codename}. Revisions tracked automatically — latest version shown, expand to view history.
        </p>
      </div>

      {Object.entries(grouped).map(([baseId, versions]) => {
        const h = versions[0]; // Latest version
        const hasRevisions = versions.length > 1 || parseFloat(getRevision(h.raw || '')) > 1;
        const isExpanded = expanded === h.id;
        const isRawVisible = showRaw === h.id;
        const color = statusColor(h.status);

        return (
          <div key={h.id} className="bg-[#111b2a] border border-[#1e2d44] rounded-xl overflow-hidden" style={{ borderLeft: `3px solid ${color}` }}>
            <div
              className="flex items-start justify-between px-5 py-4 cursor-pointer hover:bg-[#131f30] transition-colors"
              onClick={() => setExpanded(isExpanded ? null : h.id)}
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1 flex-wrap">
                  <span className="font-mono text-[13px] font-bold text-cyan-400">{h.id}</span>
                  <span className="text-[15px] font-bold text-slate-200">{h.title}</span>
                  <span className="font-mono text-[10px] px-2.5 py-0.5 rounded-full font-bold" style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}>
                    {h.status}
                  </span>
                  {hasRevisions && (
                    <span className="font-mono text-[9px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-400">
                      v{getRevision(h.raw || '')} {versions.length > 1 ? `(${versions.length} revisions)` : ''}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-[12px] text-slate-500">
                  <span>Analyst: <span className="text-purple-400 font-semibold">{h.analyst}</span></span>
                  <span>{'\u2022'}</span>
                  <span>Filed: {h.filed}</span>
                  <span>{'\u2022'}</span>
                  <span>{h.classification}</span>
                </div>
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {h.crossRef.map((ref, i) => (
                    <span key={i} className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">{ref}</span>
                  ))}
                </div>
              </div>
              <span className="text-slate-500 text-sm shrink-0 ml-3">{isExpanded ? '\u25BE' : '\u25B8'}</span>
            </div>

            {isExpanded && (
              <div className="border-t border-[#1e2d44] px-5 py-4">
                <div className="flex items-center gap-3 mb-4">
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowRaw(isRawVisible ? null : h.id); }}
                    className="font-mono text-[11px] px-3 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/20 transition-colors"
                  >
                    {isRawVisible ? '\u25BE HIDE FULL DOCUMENT' : '\u25B8 VIEW FULL DOCUMENT'}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const blob = new Blob([h.raw || ''], { type: 'text/markdown' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a'); a.href = url;
                      a.download = h.filename || `${h.id}.md`; a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="font-mono text-[11px] px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/20 transition-colors"
                  >
                    {'\u2B07'} DOWNLOAD .MD
                  </button>
                </div>

                {isRawVisible && h.raw ? (
                  <div className="bg-[#0a0f18] rounded-xl p-6 border border-[#1a2740] max-h-[80vh] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                    {renderMarkdownBlock(h.raw)}
                  </div>
                ) : (
                  <div className="text-[13px] text-slate-400 leading-relaxed">
                    <div className="font-mono text-[11px] text-slate-600 mb-2">{h.filename}</div>
                    <div className="text-slate-300">{h.raw?.split('\n').find(l => l.startsWith('**') && l.length > 50)?.replace(/\*\*/g, '') || 'Click VIEW FULL DOCUMENT to read.'}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {filtered.length === 0 && (
        <div className="p-4 rounded-xl bg-[#111b2a] border border-dashed border-[#2a3550] text-center">
          <div className="text-[13px] text-slate-500">No hypotheses for {op.codename}. {hypotheses.length > 0 ? 'Switch operation to view others.' : 'Check VPS connection.'}</div>
        </div>
      )}
    </div>
  );
}
