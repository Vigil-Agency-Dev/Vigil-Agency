'use client';

import React, { useState, useEffect } from 'react';
import { Dot } from '../ui';

const VPS_API = process.env.NEXT_PUBLIC_VPS_ENDPOINT || 'https://ops.jr8ch.com';
const API_KEY = process.env.NEXT_PUBLIC_VIGIL_API_KEY || '';

interface Finding {
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

function renderMarkdownBlock(raw: string) {
  return raw.split('\n').map((line, i) => {
    const t = line.trim();
    if (!t) return <div key={i} className="h-2" />;
    if (t.startsWith('# ')) return <h2 key={i} className="text-lg font-bold text-amber-400 mt-5 mb-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{t.slice(2)}</h2>;
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
          <span className="font-mono text-amber-500 font-bold min-w-[24px]">{num}.</span>
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

function extractSourceCount(raw: string): number {
  const match = raw.match(/(\d+)\s*independent\s*source/i);
  return match ? parseInt(match[1]) : 0;
}

function extractEvidenceTier(raw: string): string {
  const match = raw.match(/\*\*Evidence Tier:\*\*\s*(.+)/);
  return match ? match[1].trim() : '';
}

function extractConfirmationDate(raw: string): string {
  const match = raw.match(/\*\*Confirmed:\*\*\s*(.+)/);
  return match ? match[1].trim() : '';
}

export default function FindingsTab() {
  const [findings, setFindings] = useState<Finding[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState<string | null>(null);

  useEffect(() => {
    if (!API_KEY) { setLoading(false); return; }
    async function fetchFindings() {
      try {
        const res = await fetch(`${VPS_API}/api/mission/hypotheses`, { headers: { 'x-api-key': API_KEY } });
        if (!res.ok) throw new Error(`${res.status}`);
        const data = await res.json();
        // Filter to only CONFIRMED entries
        const confirmed = (data.hypotheses || []).filter((h: Finding) =>
          h.status.toUpperCase().includes('CONFIRMED')
        );
        if (confirmed.length > 0) {
          setFindings(confirmed);
          setIsLive(true);
          if (!expanded && confirmed.length > 0) setExpanded(confirmed[0].id);
        }
      } catch { /* no data */ }
      setLoading(false);
    }
    fetchFindings();
    const interval = setInterval(fetchFindings, 120000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="text-center py-16 text-slate-500 text-sm">Loading confirmed findings...</div>;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 px-1">
        <Dot color={isLive ? '#f59e0b' : '#64748b'} pulse={isLive} />
        <span className="font-mono text-xs tracking-wider" style={{ color: isLive ? '#f59e0b' : '#64748b' }}>
          {isLive ? `LIVE \u2014 ${findings.length} CONFIRMED FINDING${findings.length !== 1 ? 'S' : ''} FROM VPS` : 'NO CONFIRMED FINDINGS'}
        </span>
      </div>

      <div className="p-5 bg-gradient-to-r from-amber-500/[.08] to-yellow-500/[.04] border border-amber-500/20 rounded-xl">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xl">{'\uD83D\uDCDC'}</span>
          <h2 className="text-base font-bold text-amber-400" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            CONFIRMED FINDINGS
          </h2>
        </div>
        <p className="text-[13px] text-slate-300 leading-relaxed">
          {findings.length} hypothesis{findings.length !== 1 ? ' hypotheses have' : ' has'} been validated and graduated to confirmed finding status.
          These represent established intelligence with multi-source empirical validation.
        </p>
      </div>

      {findings.map(f => {
        const findingId = f.id.replace('H-', 'F-');
        const sourceCount = extractSourceCount(f.raw || '');
        const evidenceTier = extractEvidenceTier(f.raw || '');
        const confirmedDate = extractConfirmationDate(f.raw || '');
        const isExpanded = expanded === f.id;
        const isRawVisible = showRaw === f.id;

        return (
          <div key={f.id} className="bg-[#111b2a] border border-[#1e2d44] rounded-xl overflow-hidden" style={{ borderLeft: '3px solid #f59e0b' }}>
            <div
              className="flex items-start justify-between px-5 py-4 cursor-pointer hover:bg-[#131f30] transition-colors"
              onClick={() => setExpanded(isExpanded ? null : f.id)}
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1 flex-wrap">
                  <span className="font-mono text-[13px] font-bold text-amber-400">{findingId}</span>
                  <span className="text-[15px] font-bold text-slate-200">{f.title}</span>
                  <span className="font-mono text-[10px] px-2.5 py-0.5 rounded-full font-bold" style={{ background: '#f59e0b15', color: '#f59e0b', border: '1px solid #f59e0b30' }}>
                    CONFIRMED
                  </span>
                  {evidenceTier && (
                    <span className="font-mono text-[9px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      {evidenceTier}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-[12px] text-slate-500 flex-wrap">
                  <span>Analyst: <span className="text-purple-400 font-semibold">{f.analyst}</span></span>
                  {confirmedDate && (
                    <>
                      <span>{'\u2022'}</span>
                      <span>Confirmed: <span className="text-amber-400">{confirmedDate}</span></span>
                    </>
                  )}
                  {sourceCount > 0 && (
                    <>
                      <span>{'\u2022'}</span>
                      <span className="text-amber-400 font-semibold">{sourceCount} independent sources</span>
                    </>
                  )}
                  <span>{'\u2022'}</span>
                  <span>Graduated from {f.id}</span>
                </div>
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {f.crossRef.map((ref, i) => (
                    <span key={i} className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">{ref}</span>
                  ))}
                </div>
              </div>
              <span className="text-slate-500 text-sm shrink-0 ml-3">{isExpanded ? '\u25BE' : '\u25B8'}</span>
            </div>

            {isExpanded && (
              <div className="border-t border-[#1e2d44] px-5 py-4">
                <div className="flex items-center gap-3 mb-4">
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowRaw(isRawVisible ? null : f.id); }}
                    className="font-mono text-[11px] px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 transition-colors"
                  >
                    {isRawVisible ? '\u25BE HIDE FULL DOCUMENT' : '\u25B8 VIEW FULL DOCUMENT'}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const blob = new Blob([f.raw || ''], { type: 'text/markdown' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a'); a.href = url;
                      a.download = f.filename || `${findingId}.md`; a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="font-mono text-[11px] px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/20 transition-colors"
                  >
                    {'\u2B07'} DOWNLOAD .MD
                  </button>
                </div>

                {isRawVisible && f.raw ? (
                  <div className="bg-[#0a0f18] rounded-xl p-6 border border-[#1a2740] max-h-[80vh] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                    {renderMarkdownBlock(f.raw)}
                  </div>
                ) : (
                  <div className="text-[13px] text-slate-400 leading-relaxed">
                    <div className="font-mono text-[11px] text-slate-600 mb-2">{f.filename}</div>
                    <div className="text-slate-300">{f.raw?.split('\n').find(l => l.startsWith('**') && l.length > 50)?.replace(/\*\*/g, '') || 'Click VIEW FULL DOCUMENT to read.'}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {findings.length === 0 && (
        <div className="p-4 rounded-xl bg-[#111b2a] border border-dashed border-[#2a3550] text-center">
          <div className="text-[13px] text-slate-500">No confirmed findings yet. Hypotheses graduate to findings when validated by MERIDIAN with multi-source evidence.</div>
        </div>
      )}
    </div>
  );
}
