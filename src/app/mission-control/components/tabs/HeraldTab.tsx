'use client';

import React, { useState, useEffect } from 'react';
import { Dot } from '../ui';
import { formatAESTShort } from '../../lib/date-utils';

const VPS_API = process.env.NEXT_PUBLIC_VPS_ENDPOINT || 'https://ops.jr8ch.com';
const API_KEY = process.env.NEXT_PUBLIC_VIGIL_API_KEY || '';

function tierColor(t: number) {
  if (t === 1) return '#ef4444';
  if (t === 2) return '#f59e0b';
  return '#10b981';
}

function statusColor(s: string) {
  if (s === 'APPROVED' || s === 'AUTHORISED' || s === 'AUTHORISED_WITH_AMENDMENTS') return '#10b981';
  if (s === 'HELD') return '#f59e0b';
  if (s === 'REJECTED') return '#ef4444';
  return '#3b82f6';
}

// HERALD is now a distribution REGISTER: contacts, package history, audit trail.
// Authorise/Hold/Reject actions have moved to the unified "Review & Approve" tab
// so review workflow is consistent across all agent ops (Cairn directives, Clarion
// orders, HERALD packages, AXIOM audit outputs, standing orders, etc.).
// HERALD tab stays as the single source of truth for WHO HERALD has sent WHAT
// and the outcome of each distribution — no inline review actions.
export default function HeraldTab() {
  const [isLive, setIsLive] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [teamReport, setTeamReport] = useState<any>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [emailLog, setEmailLog] = useState<any[]>([]);
  const [signalLog, setSignalLog] = useState<any[]>([]);
  const [signalStatus, setSignalStatus] = useState<any>(null);

  async function fetchAll() {
    if (!API_KEY) return;
    try {
      const [trRes, regRes, pkgRes, revRes, emailRes, sigStatusRes, sigLogRes] = await Promise.all([
        fetch(`${VPS_API}/api/mission/team-reports`, { headers: { 'x-api-key': API_KEY } }),
        fetch(`${VPS_API}/api/herald/registry`, { headers: { 'x-api-key': API_KEY } }).catch(() => null),
        fetch(`${VPS_API}/api/herald/packages`, { headers: { 'x-api-key': API_KEY } }).catch(() => null),
        fetch(`${VPS_API}/api/herald/reviews`, { headers: { 'x-api-key': API_KEY } }).catch(() => null),
        fetch(`${VPS_API}/api/herald/email-log`, { headers: { 'x-api-key': API_KEY } }).catch(() => null),
        fetch(`${VPS_API}/api/herald/signal/status`, { headers: { 'x-api-key': API_KEY } }).catch(() => null),
        fetch(`${VPS_API}/api/herald/signal/log`, { headers: { 'x-api-key': API_KEY } }).catch(() => null),
      ]);
      if (trRes.ok) {
        const data = await trRes.json();
        const heraldReports = (data.reports || []).filter((r: any) => r.team === 'HERALD');
        if (heraldReports.length > 0) setTeamReport(heraldReports[0]);
      }
      if (regRes?.ok) { const d = await regRes.json(); setContacts(d.contacts || []); }
      if (pkgRes?.ok) { const d = await pkgRes.json(); setPackages(d.packages || []); }
      if (revRes?.ok) { const d = await revRes.json(); setReviews(d.reviews || []); }
      if (emailRes?.ok) { const d = await emailRes.json(); setEmailLog(d.log || d.emails || []); }
      if (sigStatusRes?.ok) setSignalStatus(await sigStatusRes.json());
      if (sigLogRes?.ok) { const d = await sigLogRes.json(); setSignalLog(d.log || d.messages || []); }
      setIsLive(true);
      setLastUpdated(new Date().toISOString());
    } catch {}
  }

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 60000);
    return () => clearInterval(interval);
  }, []);

  function getReviewStatus(filename: string) {
    return reviews.find(r => r.filename === filename);
  }

  function openReviewTab() {
    if (typeof window !== 'undefined') {
      window.location.hash = 'review-register';
      // trigger a hashchange listener if present
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    }
  }

  const pipeline = [
    { stage: 'Intel Intake', icon: '📥', color: '#3b82f6' },
    { stage: 'Package Production', icon: '📦', color: '#8b5cf6' },
    { stage: 'Media Vetting', icon: '🔍', color: '#f59e0b' },
    { stage: 'DIRECTOR Review', icon: '✅', color: '#10b981' },
    { stage: 'Distribution', icon: '📤', color: '#06b6d4' },
    { stage: 'Impact Monitor', icon: '📊', color: '#ec4899' },
  ];

  const candidates = [
    { id: 'H-001', title: 'Weaponised Architecture Thesis', tier: 1, status: 'Held — awaiting journalist channel', priority: 'HIGH' },
    { id: 'H-002', title: 'Iran Epstein Class InfoWar', tier: 2, status: 'Derivatives pending', priority: 'MEDIUM' },
    { id: 'H-003', title: 'Moltbook Socialisation Architecture', tier: 2, status: 'Pending sanitisation review', priority: 'MEDIUM' },
    { id: 'H-004', title: 'The Epstein Triangle', tier: 1, status: 'Held — highest sensitivity', priority: 'CRITICAL' },
  ];

  const pendingPackages = packages.filter(p => !getReviewStatus(p.filename));
  const reviewedPackages = packages.filter(p => !!getReviewStatus(p.filename));

  const timeAgo = (iso: string) => {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 px-1">
        <Dot color={isLive ? '#10b981' : '#f59e0b'} pulse={isLive} />
        <span className="font-mono text-xs tracking-wider" style={{ color: isLive ? '#10b981' : '#f59e0b' }}>
          HERALD — Distribution Register {isLive ? '— CONNECTED' : ''}
        </span>
        {lastUpdated && <span className="font-mono text-[9px] text-slate-600 ml-2">Updated {timeAgo(lastUpdated)}</span>}
        <button onClick={fetchAll} className="ml-auto text-[9px] font-mono text-slate-500 hover:text-cyan-400">REFRESH</button>
      </div>

      {/* Role statement */}
      <div className="p-5 bg-gradient-to-r from-pink-500/[.08] to-purple-500/[.04] border border-pink-500/20 rounded-xl">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xl">{'📢'}</span>
          <h2 className="text-base font-bold text-pink-400" style={{ fontFamily: "'JetBrains Mono', monospace" }}>HERALD OPERATIONS</h2>
        </div>
        <p className="text-[13px] text-slate-300 leading-relaxed">
          Distribution register: media contact registry, package production history, email and Signal audit trail, impact-feed.
          Authorise / Hold / Reject decisions happen in the unified <button onClick={openReviewTab} className="text-cyan-400 underline underline-offset-2 hover:text-cyan-300">Review &amp; Approve</button> tab — this page is read-only for distribution status.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Status', value: 'ACTIVE', color: '#10b981' },
          { label: 'Packages', value: packages.length, color: '#8b5cf6' },
          { label: 'Pending Review', value: pendingPackages.length, color: pendingPackages.length > 0 ? '#ef4444' : '#64748b' },
          { label: 'Distributed', value: reviewedPackages.filter(p => {
            const r = getReviewStatus(p.filename);
            return r && (r.action === 'approve' || r.action === 'AUTHORISE');
          }).length, color: '#10b981' },
          { label: 'Media Contacts', value: contacts.length, color: '#f59e0b' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-[#111b2a] border border-[#1e2d44] rounded-xl p-4">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{kpi.label}</div>
            <div className="text-xl font-extrabold font-mono mt-1" style={{ color: kpi.color }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* === PENDING — READ-ONLY POINTER TO REVIEW & APPROVE === */}
      {pendingPackages.length > 0 && (
        <div className="bg-[#111b2a] border border-amber-500/30 rounded-xl overflow-hidden" style={{ borderTop: '3px solid #f59e0b' }}>
          <div className="px-5 py-3 bg-amber-500/[.06] border-b border-amber-500/20 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-amber-400">{'⚠️'}</span>
              <span className="text-[13px] font-bold text-amber-400">PACKAGES AWAITING DIRECTOR REVIEW</span>
            </div>
            <button
              onClick={openReviewTab}
              className="font-mono text-[11px] px-3 py-1 rounded bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500/25 transition-colors border border-cyan-500/20"
            >
              OPEN REVIEW & APPROVE →
            </button>
          </div>
          <div className="divide-y divide-[#1a2740]">
            {pendingPackages.map((pkg, i) => {
              const isExpanded = expanded === `pending-${i}`;
              const content = typeof pkg.content === 'string' ? pkg.content : JSON.stringify(pkg.content, null, 2);
              return (
                <div key={i} className="px-5 py-3">
                  <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpanded(isExpanded ? null : `pending-${i}`)}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-semibold text-slate-200 truncate">{pkg.filename}</span>
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400">PENDING</span>
                      {pkg.modified && <span className="font-mono text-[10px] text-slate-500">{formatAESTShort(pkg.modified)}</span>}
                    </div>
                    <span className="text-slate-500 text-xs">{isExpanded ? '▾' : '▸'}</span>
                  </div>
                  {isExpanded && (
                    <div className="mt-2">
                      <div className="text-[11px] text-slate-400 leading-relaxed p-3 rounded-lg bg-[#0a0f18] border border-[#1a2740] max-h-[300px] overflow-y-auto whitespace-pre-wrap" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        {content.slice(0, 3000)}
                        {content.length > 3000 && '\n\n... [truncated — open Review & Approve for full content and action]'}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* === REVIEWED PACKAGES — HISTORY REGISTER === */}
      {reviewedPackages.length > 0 && (
        <div className="bg-[#111b2a] border border-[#1e2d44] rounded-xl overflow-hidden" style={{ borderTop: '2px solid #10b981' }}>
          <div className="px-5 py-3 bg-[#0d1520] border-b border-[#1e2d44] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>{'✅'}</span>
              <span className="text-[13px] font-bold text-slate-200">Package Register — Reviewed</span>
            </div>
            <span className="font-mono text-[11px] text-slate-400">{reviewedPackages.length} ON RECORD</span>
          </div>
          <div className="divide-y divide-[#1a2740]">
            {reviewedPackages.map((pkg, i) => {
              const review = getReviewStatus(pkg.filename);
              const actionLabel = (review?.action || '').toUpperCase();
              const sc = statusColor(actionLabel);
              const isExpanded = expanded === `reviewed-${i}`;
              const content = typeof pkg.content === 'string' ? pkg.content : JSON.stringify(pkg.content, null, 2);
              return (
                <div key={i}>
                  <div className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-[#131f30] transition-colors" onClick={() => setExpanded(isExpanded ? null : `reviewed-${i}`)}>
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: sc }} />
                    <span className="text-[12px] text-slate-300 flex-1 truncate">{pkg.filename}</span>
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded" style={{ background: `${sc}15`, color: sc }}>
                      {actionLabel}
                    </span>
                    {review?.reviewedAt && <span className="font-mono text-[9px] text-slate-600">{formatAESTShort(review.reviewedAt)}</span>}
                    <span className="text-slate-500 text-xs">{isExpanded ? '▾' : '▸'}</span>
                  </div>
                  {isExpanded && (
                    <div className="px-5 pb-3">
                      {review?.notes && (
                        <div className="mb-2 p-2.5 rounded bg-[#0a0f18] border-l-2 border-slate-600">
                          <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">Review Notes</div>
                          <div className="text-[11px] text-slate-400">{review.notes}</div>
                        </div>
                      )}
                      <div className="text-[11px] text-slate-400 leading-relaxed p-3 rounded-lg bg-[#0a0f18] border border-[#1a2740] max-h-[300px] overflow-y-auto whitespace-pre-wrap" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        {content.slice(0, 2000)}
                        {content.length > 2000 && '\n\n... [truncated]'}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pipeline */}
      <div className="bg-[#111b2a] border border-[#1e2d44] rounded-xl overflow-hidden" style={{ borderTop: '2px solid #8b5cf6' }}>
        <div className="px-5 py-3 bg-[#0d1520] border-b border-[#1e2d44] flex items-center gap-2">
          <span>{'🔄'}</span>
          <span className="text-[13px] font-bold text-slate-200">Distribution Pipeline</span>
        </div>
        <div className="p-4 flex items-center gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {pipeline.map((s, i) => (
            <div key={i} className="flex items-center shrink-0">
              <div className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg bg-[#0a0f18] border border-[#1a2740] min-w-[90px]">
                <span className="text-lg">{s.icon}</span>
                <span className="text-[10px] font-bold text-center" style={{ color: s.color }}>{s.stage}</span>
              </div>
              {i < pipeline.length - 1 && <span className="text-slate-600 mx-1">{'→'}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Distribution Candidates */}
      <div className="bg-[#111b2a] border border-[#1e2d44] rounded-xl overflow-hidden" style={{ borderTop: '2px solid #f59e0b' }}>
        <div className="px-5 py-3 bg-[#0d1520] border-b border-[#1e2d44] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>{'📄'}</span>
            <span className="text-[13px] font-bold text-slate-200">Distribution Candidates</span>
          </div>
          <span className="font-mono text-[11px] text-amber-400">{candidates.length} ITEMS</span>
        </div>
        <div className="divide-y divide-[#1a2740]">
          {candidates.map(c => (
            <div key={c.id} className="flex items-start gap-3 px-5 py-3 hover:bg-[#131f30] transition-colors">
              <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: tierColor(c.tier) }} />
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-[11px] text-slate-500">{c.id}</span>
                  <span className="text-[13px] font-semibold text-slate-200">{c.title}</span>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded" style={{ background: `${tierColor(c.tier)}15`, color: tierColor(c.tier) }}>TIER {c.tier}</span>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400">{c.priority}</span>
                </div>
                <div className="text-[12px] text-slate-400 mt-0.5">{c.status}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Media Registry */}
      <div className="bg-[#111b2a] border border-[#1e2d44] rounded-xl overflow-hidden" style={{ borderTop: '2px solid #06b6d4' }}>
        <div className="px-5 py-3 bg-[#0d1520] border-b border-[#1e2d44] flex items-center gap-2">
          <span>{'📰'}</span>
          <span className="text-[13px] font-bold text-slate-200">Media Contact Registry</span>
        </div>
        {contacts.length === 0 ? (
          <div className="p-6 text-center">
            <div className="text-[13px] text-slate-500">No media contacts registered yet</div>
          </div>
        ) : (
          <div className="divide-y divide-[#1a2740]">
            {contacts.map((c: any, i: number) => {
              const trustColor = c.trustLevel?.includes('L3') || c.trustLevel?.includes('L4') || c.trustLevel?.includes('L5') ? '#10b981' : c.trustLevel?.includes('L2') ? '#3b82f6' : c.trustLevel?.includes('L1') ? '#f59e0b' : '#64748b';
              return (
                <div key={i} className="px-5 py-3 hover:bg-[#131f30] transition-colors cursor-pointer" onClick={() => setExpanded(expanded === `contact-${i}` ? null : `contact-${i}`)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[10px] text-slate-600">{c.id}</span>
                      <span className="text-[13px] font-semibold text-slate-200">{c.name}</span>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded" style={{ background: `${trustColor}15`, color: trustColor }}>{c.trustLevel}</span>
                      <span className="font-mono text-[9px] text-slate-500">{c.type}</span>
                      {c.opRelevance && <span className="font-mono text-[9px] text-cyan-400">{c.opRelevance}</span>}
                    </div>
                    <span className="text-slate-500 text-xs">{expanded === `contact-${i}` ? '▾' : '▸'}</span>
                  </div>
                  {c.expertise && <div className="text-[11px] text-slate-500 mt-0.5">{c.expertise}</div>}
                  {expanded === `contact-${i}` && c.profile && (
                    <div className="mt-2 text-[11px] text-slate-400 leading-relaxed p-3 rounded-lg bg-[#0a0f18] border border-[#1a2740] whitespace-pre-wrap max-h-[300px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                      {c.profile}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Audit trails: email log + signal log */}
      {(emailLog.length > 0 || signalLog.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {emailLog.length > 0 && (
            <div className="bg-[#111b2a] border border-[#1e2d44] rounded-xl overflow-hidden" style={{ borderTop: '2px solid #3b82f6' }}>
              <div className="px-4 py-2.5 bg-[#0d1520] border-b border-[#1e2d44] flex items-center gap-2">
                <span>{'✉️'}</span>
                <span className="text-[12px] font-bold text-slate-200">Email Audit Trail</span>
                <span className="ml-auto font-mono text-[10px] text-slate-500">{emailLog.length} events</span>
              </div>
              <div className="divide-y divide-[#1a2740] max-h-[260px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                {emailLog.slice(0, 20).map((e: any, i: number) => (
                  <div key={i} className="px-4 py-2 text-[11px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[9px] text-slate-600">{e.timestamp ? formatAESTShort(e.timestamp) : ''}</span>
                      <span className="text-slate-300 truncate">{e.to || e.recipient || 'recipient'}</span>
                      {e.action && <span className="font-mono text-[9px] text-cyan-400">{e.action}</span>}
                    </div>
                    {e.subject && <div className="text-[10px] text-slate-500 mt-0.5 truncate">{e.subject}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
          {signalLog.length > 0 && (
            <div className="bg-[#111b2a] border border-[#1e2d44] rounded-xl overflow-hidden" style={{ borderTop: '2px solid #10b981' }}>
              <div className="px-4 py-2.5 bg-[#0d1520] border-b border-[#1e2d44] flex items-center gap-2">
                <span>{'🔐'}</span>
                <span className="text-[12px] font-bold text-slate-200">Signal Audit Trail</span>
                {signalStatus?.active && <Dot color="#10b981" pulse />}
                <span className="ml-auto font-mono text-[10px] text-slate-500">{signalLog.length} events</span>
              </div>
              <div className="divide-y divide-[#1a2740] max-h-[260px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                {signalLog.slice(0, 20).map((s: any, i: number) => (
                  <div key={i} className="px-4 py-2 text-[11px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[9px] text-slate-600">{s.timestamp ? formatAESTShort(s.timestamp) : ''}</span>
                      <span className="text-slate-300 truncate">{s.recipient || s.to || 'recipient'}</span>
                      {s.action && <span className="font-mono text-[9px] text-cyan-400">{s.action}</span>}
                    </div>
                    {s.preview && <div className="text-[10px] text-slate-500 mt-0.5 truncate">{s.preview}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Counter-Suppression */}
      <div className="bg-[#111b2a] border border-[#1e2d44] rounded-xl overflow-hidden" style={{ borderTop: '2px solid #ef4444' }}>
        <div className="px-5 py-3 bg-[#0d1520] border-b border-[#1e2d44] flex items-center gap-2">
          <span>{'🛡️'}</span>
          <span className="text-[13px] font-bold text-slate-200">Counter-Suppression Alerts</span>
        </div>
        <div className="p-4 space-y-2">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-red-500/[.04] border border-red-500/[.08]">
            <div className="w-2 h-2 rounded-full mt-1.5 bg-red-500 shrink-0" />
            <div>
              <div className="text-[13px] font-semibold text-red-300">PM-006: State Actor Truth Contamination</div>
              <div className="text-[12px] text-slate-400 mt-0.5">Iran mixing evidence with fabrication creates dismissal vector. Strict source discipline required.</div>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/[.04] border border-amber-500/[.08]">
            <div className="w-2 h-2 rounded-full mt-1.5 bg-amber-500 shrink-0" />
            <div>
              <div className="text-[13px] font-semibold text-amber-300">PM-007: Institutional DARVO at Mass Scale</div>
              <div className="text-[12px] text-slate-400 mt-0.5">ADL labelling legitimate inquiry as antisemitic. Pre-counter this framing in all Epstein distributions.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Latest Report */}
      {teamReport && (
        <div className="bg-[#111b2a] border border-[#1e2d44] rounded-xl p-4" style={{ borderLeft: '3px solid #ec4899' }}>
          <div className="text-[11px] font-bold text-pink-400 uppercase tracking-wider mb-2">Latest HERALD Report</div>
          <div className="text-[12px] text-slate-400 leading-relaxed">{teamReport.status?.summary || JSON.stringify(teamReport.status)}</div>
          <div className="font-mono text-[10px] text-slate-600 mt-1">{formatAESTShort(teamReport.status?.last_run || teamReport.received)}</div>
        </div>
      )}
    </div>
  );
}
