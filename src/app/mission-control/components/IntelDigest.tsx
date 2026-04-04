'use client';

import React, { useState, useEffect } from 'react';
import { Dot } from './ui';

const VPS_API = process.env.NEXT_PUBLIC_VPS_ENDPOINT || 'https://ops.jr8ch.com';
const API_KEY = process.env.NEXT_PUBLIC_VIGIL_API_KEY || '';

interface DigestData {
  topFindings: string[];
  redFlags: string[];
  questionsForDirector: string[];
  criticalCount: number;
  elevatedCount: number;
  routineCount: number;
  lastReport: string;
}

export default function IntelDigest() {
  const [digest, setDigest] = useState<DigestData | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [showFindings, setShowFindings] = useState(true);
  const [showRedFlags, setShowRedFlags] = useState(true);
  const [showQuestions, setShowQuestions] = useState(true);

  useEffect(() => {
    if (!API_KEY) return;
    async function load() {
      try {
        const res = await fetch(`${VPS_API}/api/mission/intel?limit=20`, { headers: { 'x-api-key': API_KEY } });
        if (!res.ok) return;
        const data = await res.json();
        const reports = data.reports || [];

        const findings: string[] = [];
        const redFlags: string[] = [];
        const questions: string[] = [];
        let critical = 0, elevated = 0, routine = 0;
        let lastReport = '';

        const cutoff = Date.now() - 24 * 3600 * 1000;

        for (const r of reports) {
          const t = r.modified || r.timestamp;
          if (t && new Date(t).getTime() < cutoff) continue;
          if (!lastReport && t) lastReport = t;

          if (r.priority === 'CRITICAL') critical++;
          else if (r.priority === 'ELEVATED') elevated++;
          else routine++;

          if (Array.isArray(r.findings)) {
            for (const f of r.findings.slice(0, 3)) {
              if (typeof f === 'string' && f.length > 10 && !findings.includes(f)) {
                findings.push(f);
              }
            }
          }

          if (Array.isArray(r.redFlags)) {
            for (const f of r.redFlags) {
              const text = typeof f === 'string' ? f : f?.name || f?.title || '';
              if (text && !redFlags.includes(text)) redFlags.push(text);
            }
          }

          if (Array.isArray(r.questions)) {
            for (const q of r.questions) {
              if (typeof q === 'string' && !questions.includes(q)) questions.push(q);
            }
          }
        }

        setDigest({
          topFindings: findings.slice(0, 10),
          redFlags: redFlags.slice(0, 10),
          questionsForDirector: questions.slice(0, 10),
          criticalCount: critical,
          elevatedCount: elevated,
          routineCount: routine,
          lastReport,
        });
        setIsLive(true);
      } catch { /* silent */ }
    }
    load();
    const interval = setInterval(load, 120000);
    return () => clearInterval(interval);
  }, []);

  if (!digest || !isLive) return null;
  if (digest.topFindings.length === 0 && digest.redFlags.length === 0 && digest.questionsForDirector.length === 0) return null;

  const totalItems = digest.topFindings.length + digest.redFlags.length + digest.questionsForDirector.length;

  return (
    <div className="animate-fadeIn bg-[#111b2a] border border-[#1e2d44] rounded-xl overflow-hidden" style={{ borderTop: '2px solid #06b6d4' }}>
      {/* Header — always visible */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#0d1520]">
        <div className="flex items-center gap-3">
          <span className="text-base">{'\uD83C\uDFAF'}</span>
          <span className="font-mono text-[12px] font-bold text-cyan-400 tracking-wider">INTEL DIGEST — LAST 24 HOURS</span>
          <div className="flex items-center gap-2 ml-2">
            {digest.criticalCount > 0 && <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400">{digest.criticalCount} CRITICAL</span>}
            {digest.elevatedCount > 0 && <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400">{digest.elevatedCount} ELEVATED</span>}
            {digest.routineCount > 0 && <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-slate-500/10 text-slate-400">{digest.routineCount} ROUTINE</span>}
          </div>
        </div>
        <span className="font-mono text-[9px] text-slate-500">{totalItems} items</span>
      </div>

      <div className="divide-y divide-[#1a2740]">
        {/* Top Findings */}
        {digest.topFindings.length > 0 && (
          <div>
            <div
              className="flex items-center justify-between px-5 py-2.5 cursor-pointer hover:bg-[#0f1825] transition-colors"
              onClick={() => setShowFindings(!showFindings)}
            >
              <div className="flex items-center gap-2">
                <span className="text-cyan-500 text-xs">{'\u25B8'}</span>
                <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">TOP FINDINGS</span>
                <span className="font-mono text-[9px] text-slate-500">{digest.topFindings.length}</span>
              </div>
              <span className="text-slate-600 text-xs">{showFindings ? '\u25BE' : '\u25B8'}</span>
            </div>
            {showFindings && (
              <div className="px-5 pb-3 space-y-1">
                {digest.topFindings.map((f, i) => (
                  <div key={i} className="flex items-start gap-2 text-[12px] text-slate-300 py-1 leading-relaxed pl-2 rounded hover:bg-white/[.02]">
                    <span className="text-cyan-500 mt-0.5 flex-shrink-0">{'\u25B8'}</span>
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Red Flags */}
        {digest.redFlags.length > 0 && (
          <div>
            <div
              className="flex items-center justify-between px-5 py-2.5 cursor-pointer hover:bg-[#0f1825] transition-colors"
              onClick={() => setShowRedFlags(!showRedFlags)}
            >
              <div className="flex items-center gap-2">
                <span className="text-red-500 text-xs">{'\u26A0\uFE0F'}</span>
                <span className="text-[11px] font-bold text-red-400 uppercase tracking-wider">RED FLAGS</span>
                <span className="font-mono text-[9px] text-slate-500">{digest.redFlags.length}</span>
              </div>
              <span className="text-slate-600 text-xs">{showRedFlags ? '\u25BE' : '\u25B8'}</span>
            </div>
            {showRedFlags && (
              <div className="px-5 pb-3 space-y-1">
                {digest.redFlags.map((f, i) => (
                  <div key={i} className="flex items-start gap-2 text-[12px] text-red-300 py-1 leading-relaxed pl-2 rounded hover:bg-white/[.02]">
                    <span className="text-red-500 mt-0.5 flex-shrink-0">{'\u26A0\uFE0F'}</span>
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Questions for DIRECTOR */}
        {digest.questionsForDirector.length > 0 && (
          <div>
            <div
              className="flex items-center justify-between px-5 py-2.5 cursor-pointer hover:bg-[#0f1825] transition-colors"
              onClick={() => setShowQuestions(!showQuestions)}
            >
              <div className="flex items-center gap-2">
                <span className="text-purple-400 text-xs">?</span>
                <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">QUESTIONS FOR DIRECTOR</span>
                <span className="font-mono text-[9px] text-slate-500">{digest.questionsForDirector.length}</span>
              </div>
              <span className="text-slate-600 text-xs">{showQuestions ? '\u25BE' : '\u25B8'}</span>
            </div>
            {showQuestions && (
              <div className="px-5 pb-3 space-y-1">
                {digest.questionsForDirector.map((q, i) => (
                  <div key={i} className="flex items-start gap-2 text-[12px] text-purple-300 py-1 leading-relaxed pl-2 rounded hover:bg-white/[.02]">
                    <span className="text-purple-400 mt-0.5 flex-shrink-0">?</span>
                    <span>{q}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
