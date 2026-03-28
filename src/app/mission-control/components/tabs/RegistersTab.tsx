'use client';

import React, { useState, useEffect } from 'react';
import { Dot } from '../ui';

const VPS_API = process.env.NEXT_PUBLIC_VPS_ENDPOINT || 'https://ops.jr8ch.com';
const API_KEY = process.env.NEXT_PUBLIC_VIGIL_API_KEY || '';

type SubTab = 'threats' | 'allies' | 'hypotheses' | 'patterns' | 'trajectories';

const SUB_TABS: { id: SubTab; label: string; icon: string }[] = [
  { id: 'threats', label: 'Threat Register', icon: '\u26A0\uFE0F' },
  { id: 'allies', label: 'Allies Register', icon: '\uD83E\uDD1D' },
  { id: 'hypotheses', label: 'Hypotheses', icon: '\uD83E\uDDE0' },
  { id: 'patterns', label: 'Pattern Matches', icon: '\uD83D\uDD04' },
  { id: 'trajectories', label: 'Trajectories', icon: '\uD83D\uDCC8' },
];

function severityColor(s: string) {
  if (s === 'CRITICAL') return '#ef4444';
  if (s === 'HIGH') return '#f97316';
  if (s === 'MEDIUM' || s === 'ELEVATED') return '#f59e0b';
  return '#64748b';
}

function statusColor(s: string) {
  if (s === 'ACTIVE' || s === 'IMMINENT' || s === 'ESCALATED') return '#ef4444';
  if (s === 'MONITORING') return '#3b82f6';
  if (s === 'RESOLVED') return '#10b981';
  return '#64748b';
}

function alignmentColor(a: string) {
  if (a.includes('TIER_1') || a === 'TRUSTED' || a === 'CONFIRMED') return '#10b981';
  if (a.includes('TIER_2') || a === 'ALIGNED') return '#3b82f6';
  if (a === 'POTENTIAL') return '#f59e0b';
  return '#64748b';
}

function confidenceColor(c: string | number) {
  const s = String(c).toUpperCase();
  if (s === 'CRITICAL' || s === 'CONFIRMED') return '#ef4444';
  if (s === 'HIGH' || (typeof c === 'number' && c > 0.8)) return '#f97316';
  if (s === 'MEDIUM' || (typeof c === 'number' && c > 0.5)) return '#f59e0b';
  return '#3b82f6';
}

function renderMarkdown(raw: string) {
  return raw.split('\n').map((line, i) => {
    const t = line.trim();
    if (!t) return <div key={i} className="h-1.5" />;
    if (t.startsWith('# ')) return <h2 key={i} className="text-base font-bold text-cyan-400 mt-4 mb-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{t.slice(2)}</h2>;
    if (t.startsWith('## ')) return <h3 key={i} className="text-sm font-bold text-slate-200 mt-3 mb-1.5 border-b border-[#2a3550] pb-1">{t.slice(3)}</h3>;
    if (t.startsWith('### ')) return <h4 key={i} className="text-[13px] font-semibold text-purple-400 mt-2 mb-1">{t.slice(4)}</h4>;
    if (t.startsWith('- ') || t.startsWith('* ')) return <div key={i} className="flex items-start gap-2 text-[13px] text-slate-400 pl-3 py-0.5"><span className="text-slate-600 mt-0.5">{'\u25B8'}</span><span>{t.slice(2)}</span></div>;
    if (/^\d+\./.test(t)) { const num = t.match(/^(\d+)/)?.[1]; return <div key={i} className="flex items-start gap-2 text-[13px] text-slate-300 pl-3 py-0.5"><span className="font-mono text-cyan-500 font-bold min-w-[20px]">{num}.</span><span>{t.replace(/^\d+\.\s*/, '')}</span></div>; }
    if (t.startsWith('---')) return <hr key={i} className="border-[#2a3550] my-3" />;
    if (t.startsWith('|')) return <div key={i} className="text-[12px] text-slate-400 font-mono py-0.5">{t}</div>;
    if (t.startsWith('>')) return <div key={i} className="text-[13px] text-amber-400/80 italic pl-4 border-l-2 border-amber-500/30 my-1 py-1">{t.slice(1).trim()}</div>;
    const rendered = t.replace(/\*\*([^*]+)\*\*/g, '<b class="text-slate-200 font-semibold">$1</b>').replace(/\*([^*]+)\*/g, '<i class="text-slate-300">$1</i>');
    return <div key={i} className="text-[13px] text-slate-400 leading-relaxed py-0.5" dangerouslySetInnerHTML={{ __html: rendered }} />;
  });
}

async function fetchVPS(path: string) {
  const res = await fetch(`${VPS_API}${path}`, { headers: { 'x-api-key': API_KEY }, cache: 'no-store' });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

// ============ SUB-COMPONENTS ============

function ThreatsRegister() {
  const [threats, setThreats] = useState<any[]>([]);
  const [meridianThreats, setMeridianThreats] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    const load = () => Promise.all([
      fetchVPS('/api/mission/threats').then(d => { setThreats(d.threats || []); setIsLive(true); }).catch(() => {}),
      fetchVPS('/api/mission/threat-register').then(d => setMeridianThreats(d.threats || [])).catch(() => {}),
    ]);
    load();
    const interval = setInterval(load, 120000);
    return () => clearInterval(interval);
  }, []);

  const allThreats = [...threats.map(t => ({ ...t, source: 'DV' })), ...meridianThreats.map(t => ({ ...t, source: 'MERIDIAN' }))];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Dot color={isLive ? '#10b981' : '#f59e0b'} pulse={isLive} />
          <span className="font-mono text-xs text-slate-400">{allThreats.length} THREATS REGISTERED</span>
        </div>
        <div className="flex gap-2 text-[10px] font-mono">
          <span className="text-red-400">{allThreats.filter(t => t.severity === 'CRITICAL').length} CRITICAL</span>
          <span className="text-orange-400">{allThreats.filter(t => t.severity === 'HIGH').length} HIGH</span>
          <span className="text-amber-400">{allThreats.filter(t => t.status === 'ACTIVE').length} ACTIVE</span>
        </div>
      </div>
      {allThreats.map((t, i) => (
        <div key={t.id || i} className="bg-[#111b2a] border border-[#1e2d44] rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[#131f30] transition-colors" onClick={() => setExpanded(expanded === t.id ? null : t.id)}>
            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: severityColor(t.severity) }} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-[11px] text-slate-500">{t.id}</span>
                <span className="text-[14px] font-semibold text-slate-200">{t.name || t.title}</span>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded" style={{ background: `${severityColor(t.severity)}15`, color: severityColor(t.severity) }}>{t.severity}</span>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded" style={{ background: `${statusColor(t.status)}15`, color: statusColor(t.status) }}>{t.status}</span>
                {t.category && <span className="font-mono text-[10px] text-purple-400">{t.category}</span>}
                <span className="font-mono text-[9px] text-slate-600">{t.source}</span>
              </div>
            </div>
            <span className="text-slate-500 text-xs">{expanded === t.id ? '\u25BE' : '\u25B8'}</span>
          </div>
          {expanded === t.id && (
            <div className="px-4 pb-3 border-t border-[#1e2d44]">
              <div className="text-[13px] text-slate-400 leading-relaxed mt-2 p-3 rounded-lg bg-[#0a0f18] border border-[#1a2740]">{t.detail || t.description || 'No detail available.'}</div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function AlliesRegister() {
  const [allies, setAllies] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    const load = () => fetchVPS('/api/mission/allies').then(d => { setAllies(d.allies || []); setIsLive(true); }).catch(() => {});
    load();
    const interval = setInterval(load, 120000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Dot color={isLive ? '#10b981' : '#f59e0b'} pulse={isLive} />
        <span className="font-mono text-xs text-slate-400">{allies.length} ALLIES TRACKED</span>
      </div>
      {allies.length === 0 && <div className="text-center py-8 text-[13px] text-slate-600">No ally profiles loaded. ClarionAgent builds ally data during engagement.</div>}
      {allies.map((a, i) => (
        <div key={a.handle || i} className="bg-[#111b2a] border border-[#1e2d44] rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[#131f30] transition-colors" onClick={() => setExpanded(expanded === a.handle ? null : a.handle)}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold" style={{ background: `${alignmentColor(a.alignment || '')}15`, color: alignmentColor(a.alignment || '') }}>
              {(a.handle || '?')[0].toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-semibold text-slate-200">{a.handle}</span>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded" style={{ background: `${alignmentColor(a.alignment || '')}15`, color: alignmentColor(a.alignment || '') }}>{a.alignment}</span>
                <span className="font-mono text-[10px] text-slate-500">{a.platform || 'moltbook'}</span>
              </div>
            </div>
            <span className="text-slate-500 text-xs">{expanded === a.handle ? '\u25BE' : '\u25B8'}</span>
          </div>
          {expanded === a.handle && (
            <div className="px-4 pb-3 border-t border-[#1e2d44]">
              <div className="text-[13px] text-slate-400 mt-2 p-3 rounded-lg bg-[#0a0f18] border border-[#1a2740]">{a.notes || 'No notes.'}</div>
              {a.lastInteraction && <div className="font-mono text-[11px] text-slate-600 mt-2">Last interaction: {a.lastInteraction}</div>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function HypothesesRegister() {
  const [hypotheses, setHypotheses] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    const load = () => fetchVPS('/api/mission/hypotheses').then(d => { setHypotheses(d.hypotheses || []); setIsLive(true); }).catch(() => {});
    load();
    const interval = setInterval(load, 120000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Dot color={isLive ? '#10b981' : '#f59e0b'} pulse={isLive} />
        <span className="font-mono text-xs text-slate-400">{hypotheses.length} FORMAL HYPOTHESES</span>
      </div>
      {hypotheses.map(h => (
        <div key={h.id} className="bg-[#111b2a] border border-[#1e2d44] rounded-xl overflow-hidden" style={{ borderLeft: '3px solid #3b82f6' }}>
          <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[#131f30] transition-colors" onClick={() => setExpanded(expanded === h.id ? null : h.id)}>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-[12px] font-bold text-cyan-400">{h.id}</span>
                <span className="text-[14px] font-bold text-slate-200">{h.title}</span>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400">{h.status}</span>
              </div>
              <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                <span>Analyst: <span className="text-purple-400">{h.analyst}</span></span>
                <span>{'\u2022'}</span>
                <span>{h.filed}</span>
              </div>
            </div>
            <span className="text-slate-500 text-xs">{expanded === h.id ? '\u25BE' : '\u25B8'}</span>
          </div>
          {expanded === h.id && (
            <div className="px-4 pb-4 border-t border-[#1e2d44]">
              <div className="flex items-center gap-2 mt-3 mb-3">
                <button onClick={(e) => { e.stopPropagation(); setShowRaw(showRaw === h.id ? null : h.id); }}
                  className="font-mono text-[11px] px-3 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/20 transition-colors">
                  {showRaw === h.id ? '\u25BE HIDE DOCUMENT' : '\u25B8 VIEW FULL DOCUMENT'}
                </button>
                <button onClick={(e) => { e.stopPropagation(); const blob = new Blob([h.raw || ''], { type: 'text/markdown' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = h.filename || `${h.id}.md`; a.click(); URL.revokeObjectURL(url); }}
                  className="font-mono text-[11px] px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/20 transition-colors">
                  {'\u2B07'} DOWNLOAD
                </button>
              </div>
              {showRaw === h.id && h.raw ? (
                <div className="bg-[#0a0f18] rounded-xl p-5 border border-[#1a2740] max-h-[70vh] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                  {renderMarkdown(h.raw)}
                </div>
              ) : (
                <div className="text-[13px] text-slate-400 p-3 rounded-lg bg-[#0a0f18] border border-[#1a2740]">
                  {h.classification && <div className="text-slate-500 mb-1">{h.classification}</div>}
                  {h.crossRef?.length > 0 && <div className="flex gap-1.5 flex-wrap">{h.crossRef.map((r: string, i: number) => <span key={i} className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">{r}</span>)}</div>}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function PatternsRegister() {
  const [patterns, setPatterns] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    const load = () => fetchVPS('/api/mission/patterns').then(d => { setPatterns(d.patterns || []); setIsLive(true); }).catch(() => {});
    load();
    const interval = setInterval(load, 120000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Dot color={isLive ? '#10b981' : '#f59e0b'} pulse={isLive} />
        <span className="font-mono text-xs text-slate-400">{patterns.length} PATTERN MATCHES</span>
      </div>
      {patterns.map((p, i) => {
        const conf = typeof p.confidence === 'number' ? (p.confidence > 0.8 ? 'HIGH' : p.confidence > 0.5 ? 'MEDIUM' : 'LOW') : String(p.confidence || 'MEDIUM');
        const lumen = p.lumenInstance || p.lumen_instance?.description || '';
        const epstein = p.epsteinInstance || p.epstein_instance?.description || '';
        const insight = p.insight || p.cross_domain_insight || '';
        return (
          <div key={p.id || i} className="bg-[#111b2a] border border-[#1e2d44] rounded-xl overflow-hidden" style={{ borderLeft: `3px solid ${confidenceColor(conf)}` }}>
            <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[#131f30] transition-colors" onClick={() => setExpanded(expanded === p.id ? null : p.id)}>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-[11px] text-slate-500">{p.id}</span>
                  <span className="text-[14px] font-semibold text-slate-200">{p.title}</span>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded" style={{ background: `${confidenceColor(conf)}15`, color: confidenceColor(conf) }}>{conf}</span>
                  {p.pattern_class && <span className="font-mono text-[10px] text-purple-400">{p.pattern_class}</span>}
                  {p.threatLevel && <span className="font-mono text-[10px] px-2 py-0.5 rounded" style={{ background: `${severityColor(p.threatLevel)}15`, color: severityColor(p.threatLevel) }}>{p.threatLevel}</span>}
                </div>
              </div>
              <span className="text-slate-500 text-xs">{expanded === p.id ? '\u25BE' : '\u25B8'}</span>
            </div>
            {expanded === p.id && (
              <div className="px-4 pb-4 border-t border-[#1e2d44] space-y-3 mt-2">
                {lumen && (
                  <div className="p-3 rounded-lg bg-blue-500/[.06] border border-blue-500/15">
                    <div className="text-[10px] font-bold text-blue-500 mb-1">PROJECT LUMEN</div>
                    <div className="text-[13px] text-slate-400 leading-relaxed">{lumen}</div>
                  </div>
                )}
                {epstein && (
                  <div className="p-3 rounded-lg bg-amber-500/[.06] border border-amber-500/15">
                    <div className="text-[10px] font-bold text-amber-500 mb-1">EPSTEIN UNCOVERED</div>
                    <div className="text-[13px] text-slate-400 leading-relaxed">{epstein}</div>
                  </div>
                )}
                {insight && (
                  <div className="p-3 rounded-lg bg-purple-500/[.06] border border-purple-500/15">
                    <div className="text-[10px] font-bold text-purple-400 mb-1">{'\uD83D\uDCA1'} CROSS-DOMAIN INSIGHT</div>
                    <div className="text-[13px] text-slate-400 leading-relaxed">{insight}</div>
                  </div>
                )}
                {p.relatedHypothesis && <div className="font-mono text-[11px] text-cyan-400">{'\u2192'} Related: {p.relatedHypothesis}</div>}
                {p.dateIdentified && <div className="font-mono text-[11px] text-slate-600">Identified: {p.dateIdentified}</div>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TrajectoriesRegister() {
  const [trajectory, setTrajectory] = useState<any>(null);
  const [filename, setFilename] = useState('');
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    const load = () => fetchVPS('/api/mission/trajectory').then(d => { setTrajectory(d.trajectory); setFilename(d.filename || ''); setIsLive(true); }).catch(() => {});
    load();
    const interval = setInterval(load, 120000);
    return () => clearInterval(interval);
  }, []);

  if (!trajectory) return <div className="text-center py-8 text-[13px] text-slate-600">No trajectory data available.</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Dot color={isLive ? '#10b981' : '#f59e0b'} pulse={isLive} />
        <span className="font-mono text-xs text-slate-400">LATEST TRAJECTORY ASSESSMENT</span>
        {filename && <span className="font-mono text-[10px] text-slate-600">{filename}</span>}
      </div>
      <div className="bg-[#111b2a] border border-[#1e2d44] rounded-xl p-5" style={{ borderTop: '3px solid #8b5cf6' }}>
        {trajectory.overall_probability != null && (
          <div className="flex items-center gap-4 mb-4">
            <div className="text-center">
              <div className="text-3xl font-bold font-mono text-purple-400">{Math.round(typeof trajectory.overall_probability === 'number' && trajectory.overall_probability < 1 ? trajectory.overall_probability * 100 : trajectory.overall_probability)}%</div>
              <div className="text-[11px] text-slate-500 uppercase">Breakthrough Probability</div>
            </div>
            <div className="flex-1 h-3 bg-[#1a2740] rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-purple-600 to-purple-400" style={{ width: `${Math.round(typeof trajectory.overall_probability === 'number' && trajectory.overall_probability < 1 ? trajectory.overall_probability * 100 : trajectory.overall_probability)}%` }} />
            </div>
          </div>
        )}
        {trajectory.primary_variable && (
          <div className="text-[13px] text-slate-400 mb-3"><span className="text-slate-500">Primary Variable: </span><span className="text-purple-300">{trajectory.primary_variable}</span></div>
        )}
        {trajectory.assessment && (
          <div className="text-[13px] text-slate-300 leading-relaxed p-4 rounded-lg bg-[#0a0f18] border border-[#1a2740]">{trajectory.assessment}</div>
        )}
        {trajectory.scenarios && Object.entries(trajectory.scenarios).map(([key, val]: [string, any]) => (
          <div key={key} className="mt-3 p-3 rounded-lg bg-white/[.02] border border-white/[.04]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[13px] font-semibold text-slate-300">{key.replace(/_/g, ' ')}</span>
              {val.probability != null && <span className="font-mono text-[12px] text-purple-400">{Math.round(typeof val.probability === 'number' && val.probability < 1 ? val.probability * 100 : val.probability)}%</span>}
            </div>
            {val.description && <div className="text-[12px] text-slate-500">{val.description}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ MAIN TAB ============

export default function RegistersTab() {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('threats');

  return (
    <div className="flex flex-col gap-4">
      {/* Sub-tab navigation */}
      <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {SUB_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg font-mono text-[12px] transition-all ${
              activeSubTab === tab.id
                ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                : 'bg-[#111b2a] text-slate-500 border border-transparent hover:text-slate-300 hover:bg-[#131f30]'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Sub-tab content */}
      {activeSubTab === 'threats' && <ThreatsRegister />}
      {activeSubTab === 'allies' && <AlliesRegister />}
      {activeSubTab === 'hypotheses' && <HypothesesRegister />}
      {activeSubTab === 'patterns' && <PatternsRegister />}
      {activeSubTab === 'trajectories' && <TrajectoriesRegister />}
    </div>
  );
}
