'use client';

import React, { useState, useEffect } from 'react';
import { Dot } from '../ui';
import { formatAESTShort } from '../../lib/date-utils';

const VPS_API = process.env.NEXT_PUBLIC_VPS_ENDPOINT || 'https://ops.jr8ch.com';
const API_KEY = process.env.NEXT_PUBLIC_VIGIL_API_KEY || '';

const KNOWN_OPS = ['OP-001', 'OP-002', 'OP-003', 'OP-004'] as const;
const OP_COLORS: Record<string, string> = {
  'OP-001': '#8b5cf6',
  'OP-002': '#ef4444',
  'OP-003': '#10b981',
  'OP-004': '#f59e0b',
};

type EngagementFilter = 'all' | 'confirmed' | 'planned';
type LFilter = 'all' | 'L5' | 'L4' | 'L3' | 'L2' | 'L1' | 'L0';

interface EmailLogEntry {
  to: string | string[];
  subject: string;
  from_name?: string;
  messageId?: string;
  sentAt: string;
}

interface SignalStatus {
  account?: string;
  profile_name?: string;
  status?: string;
  sent_count?: number;
  received_count?: number;
  daemon?: string;
  version?: { version?: string };
}

interface ReviewEntry {
  filename: string;
  action: 'approve' | 'hold' | 'reject';
  notes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

// Registry contact — tolerant of v1 (string opRelevance) + v2 (rich opFit)
interface RegistryContact {
  id?: string;
  contactId?: string;
  name?: string;
  outlet?: string;
  role?: string;
  type?: string;
  trustLevel?: string; // v1
  level?: string; // v2
  levelState?: string; // v2
  expertise?: string;
  opRelevance?: string; // v1
  opFit?: Array<{ op: string; fitScore?: string; terrain?: string[]; lastEngagedAt?: string; lastEngagementType?: string; status?: string }>; // v2
  terrainAffinity?: string[]; // v2
  channels?: Array<{ type: string; address: string; priority?: string; agentAccess?: string }>; // v2
  reserves?: string[]; // v2
  closedGates?: string[]; // v2
  status?: string;
  profile?: string;
  notes?: string;
  schemaVersion?: string; // v2 sentinel
}

// -------- helpers --------

function parseOpTags(c: RegistryContact): string[] {
  if (c.opFit && Array.isArray(c.opFit)) return c.opFit.map(o => o.op).filter(Boolean);
  if (c.opRelevance) {
    // "OP-002/003" or "OP-003" or "OP-001/002"
    const raw = String(c.opRelevance);
    const matches = raw.match(/OP-\d{3}/g);
    if (matches) return matches;
    // Handle "OP-002/003" form
    const m2 = raw.match(/OP-(\d{3})/);
    if (m2) {
      const prefix = 'OP-';
      const nums = raw.split('/').map(s => s.trim().replace(/^OP-/, ''));
      return nums.filter(n => /^\d{3}$/.test(n)).map(n => prefix + n);
    }
  }
  return [];
}

function getLLevel(c: RegistryContact): string {
  if (c.level) return c.level;
  const tl = c.trustLevel || '';
  const m = tl.match(/L[0-5]/);
  return m ? m[0] : 'L0';
}

function getEngagementState(c: RegistryContact): 'ENGAGED' | 'ASSESSED' | 'UNKNOWN' {
  const src = `${c.trustLevel || ''} ${c.levelState || ''} ${c.status || ''}`.toUpperCase();
  if (src.includes('ENGAGED')) return 'ENGAGED';
  if (src.includes('ASSESSED')) return 'ASSESSED';
  return 'UNKNOWN';
}

function lLevelColor(level: string): string {
  if (level === 'L5') return '#10b981';
  if (level === 'L4') return '#10b981';
  if (level === 'L3') return '#06b6d4';
  if (level === 'L2') return '#3b82f6';
  if (level === 'L1') return '#f59e0b';
  return '#64748b';
}

function recipientLabel(to: string | string[]) {
  if (Array.isArray(to)) return to.join(', ');
  return to || '';
}

function timeAgo(iso?: string) {
  if (!iso) return '';
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function extractPackageOpTag(filename: string): string | null {
  const m = filename.match(/OP(\d{3,4})/i);
  if (m) {
    const n = m[1];
    if (n.length === 4) return `OP-${n.slice(0, 3)}`;
    return `OP-${n}`;
  }
  return null;
}

// -------- Package Modal --------

function PackageModal({ pkg, review, onClose }: { pkg: { filename: string; content?: string }; review: ReviewEntry | null; onClose: () => void }) {
  const opTag = extractPackageOpTag(pkg.filename);
  const content = typeof pkg.content === 'string' ? pkg.content : JSON.stringify(pkg.content, null, 2);
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm overflow-y-auto p-4" onClick={onClose}>
      <div className="bg-[#0a0f18] border border-[#2a3550] rounded-xl max-w-5xl w-full my-6 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-[#1e2d44] bg-[#111b2a] flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {review ? (
                <span className="font-mono text-[10px] px-2 py-0.5 rounded font-bold"
                  style={{
                    background: review.action === 'approve' ? '#10b98118' : review.action === 'hold' ? '#f59e0b18' : '#ef444418',
                    color: review.action === 'approve' ? '#10b981' : review.action === 'hold' ? '#f59e0b' : '#ef4444',
                    border: `1px solid ${review.action === 'approve' ? '#10b98140' : review.action === 'hold' ? '#f59e0b40' : '#ef444440'}`,
                  }}>
                  {review.action.toUpperCase()}
                </span>
              ) : (
                <span className="font-mono text-[10px] px-2 py-0.5 rounded font-bold bg-red-500/15 text-red-400 border border-red-500/30">PENDING REVIEW</span>
              )}
              {opTag && (
                <span className="font-mono text-[10px] px-2 py-0.5 rounded"
                  style={{ background: `${OP_COLORS[opTag]}18`, color: OP_COLORS[opTag], border: `1px solid ${OP_COLORS[opTag]}40` }}>
                  {opTag}
                </span>
              )}
              {review?.reviewedAt && <span className="font-mono text-[10px] text-slate-500">reviewed {formatAESTShort(review.reviewedAt)}</span>}
            </div>
            <div className="text-base font-bold text-slate-100 leading-tight break-all">{pkg.filename}</div>
            {review?.notes && (
              <div className="mt-2 p-2 rounded bg-slate-500/[.06] border border-slate-500/20 text-[11px] text-slate-300">
                <span className="text-slate-500 uppercase tracking-wider text-[9px] font-bold">Review notes:</span> {review.notes}
              </div>
            )}
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-red-400 text-xl leading-none shrink-0">{'\u00D7'}</button>
        </div>
        <div className="px-5 py-4 max-h-[70vh] overflow-y-auto">
          <div className="text-[11.5px] text-slate-300 leading-relaxed whitespace-pre-wrap" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {content || 'No content.'}
          </div>
        </div>
      </div>
    </div>
  );
}

// -------- Contact Card --------

function ContactCard({ c, onToggle, expanded }: { c: RegistryContact; onToggle: () => void; expanded: boolean }) {
  const ops = parseOpTags(c);
  const level = getLLevel(c);
  const engagement = getEngagementState(c);
  const isSynergyPartner = c.id === 'REG-020' || c.id === 'REG-021' || c.contactId === 'REG-020' || c.contactId === 'REG-021';
  const isV2 = c.schemaVersion === 'v2';
  const closedGates = c.closedGates || [];
  const reserves = c.reserves || [];

  return (
    <div className="bg-[#111b2a] border rounded-xl overflow-hidden transition-colors"
      style={{
        borderColor: isSynergyPartner ? '#f59e0b' : '#1e2d44',
        borderLeft: `3px solid ${isSynergyPartner ? '#f59e0b' : lLevelColor(level)}`,
      }}
    >
      <button onClick={onToggle} className="w-full text-left px-4 py-3 hover:bg-[#131f30] transition-colors">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-mono text-[9px] text-slate-600">{c.contactId || c.id}</span>
              <span className="text-[13px] font-bold text-slate-100">{c.name}</span>
              <span className="font-mono text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: `${lLevelColor(level)}18`, color: lLevelColor(level), border: `1px solid ${lLevelColor(level)}40` }}>
                {level} {engagement !== 'UNKNOWN' ? engagement : ''}
              </span>
              {isSynergyPartner && (
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  {'\u2605'} SYNERGY PARTNER
                </span>
              )}
              {isV2 && <span className="font-mono text-[9px] text-cyan-500">v2</span>}
            </div>
            <div className="flex items-center gap-2 flex-wrap text-[10px]">
              {ops.map(op => (
                <span key={op} className="font-mono px-1.5 py-0.5 rounded" style={{ background: `${OP_COLORS[op] || '#64748b'}15`, color: OP_COLORS[op] || '#94a3b8' }}>
                  {op}
                </span>
              ))}
              {ops.length === 0 && <span className="text-slate-600">no op tag</span>}
              {c.outlet && <span className="text-slate-500">{'\u2022'} {c.outlet}</span>}
              {c.role && <span className="text-slate-500">{'\u2022'} {c.role}</span>}
              {c.type && !c.role && <span className="text-slate-500">{'\u2022'} {c.type}</span>}
            </div>
            {c.expertise && <div className="text-[11px] text-slate-400 mt-1">{c.expertise}</div>}
            {closedGates.length > 0 && (
              <div className="mt-1 flex items-center gap-1 flex-wrap">
                {closedGates.map(g => (
                  <span key={g} className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/30">
                    {'\uD83D\uDEAB'} CLOSED: {g}
                  </span>
                ))}
              </div>
            )}
            {reserves.length > 0 && (
              <div className="mt-1 flex items-center gap-1 flex-wrap">
                {reserves.map(r => (
                  <span key={r} className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400 border border-purple-500/30">
                    {'\uD83D\uDD12'} {r}
                  </span>
                ))}
              </div>
            )}
          </div>
          <span className="text-slate-600 text-xs shrink-0">{expanded ? '\u25BE' : '\u25B8'}</span>
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-4 border-t border-[#1e2d44] pt-3 space-y-3 text-[11px] text-slate-300">
          {c.status && (
            <div>
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Status</div>
              <div className="leading-relaxed">{c.status}</div>
            </div>
          )}
          {isV2 && c.opFit && c.opFit.length > 0 && (
            <div>
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Per-op fit</div>
              <div className="space-y-1">
                {c.opFit.map(f => (
                  <div key={f.op} className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded" style={{ background: `${OP_COLORS[f.op] || '#64748b'}15`, color: OP_COLORS[f.op] || '#94a3b8' }}>{f.op}</span>
                    {f.fitScore && <span className="text-[10px] text-slate-400">{f.fitScore}</span>}
                    {f.terrain && <span className="text-[10px] text-slate-500">{'\u2014'} {f.terrain.join(', ')}</span>}
                    {f.lastEngagedAt && <span className="font-mono text-[9px] text-slate-600 ml-auto">{formatAESTShort(f.lastEngagedAt)}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
          {isV2 && c.channels && c.channels.length > 0 && (
            <div>
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Channels</div>
              <div className="space-y-0.5">
                {c.channels.map((ch, i) => (
                  <div key={i} className="flex items-center gap-2 text-[10px]">
                    <span className="text-slate-400 font-mono min-w-[60px]">{ch.type}</span>
                    <span className="text-slate-300 font-mono">{ch.address}</span>
                    {ch.priority && <span className="text-slate-500">({ch.priority})</span>}
                    {ch.agentAccess && <span className="font-mono px-1 py-0.5 rounded bg-amber-500/15 text-amber-400 text-[9px]">{ch.agentAccess}-only</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
          {c.profile && (
            <details>
              <summary className="cursor-pointer text-[10px] text-cyan-400 hover:text-cyan-300">Full profile</summary>
              <pre className="mt-2 p-3 rounded-lg bg-[#0a0f18] border border-[#1a2740] whitespace-pre-wrap text-[10px] text-slate-400 max-h-[300px] overflow-y-auto font-mono">{c.profile}</pre>
            </details>
          )}
          {c.notes && (
            <div className="p-2 rounded bg-slate-500/[.06] border border-slate-500/20">
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Notes</div>
              <div className="leading-relaxed">{c.notes}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// -------- Main --------

export default function DistributionTab() {
  const [packages, setPackages] = useState<Array<{ filename: string; content?: string }>>([]);
  const [emails, setEmails] = useState<EmailLogEntry[]>([]);
  const [signal, setSignal] = useState<SignalStatus | null>(null);
  const [contacts, setContacts] = useState<RegistryContact[]>([]);
  const [reviews, setReviews] = useState<ReviewEntry[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const [selectedPackage, setSelectedPackage] = useState<{ filename: string; content?: string } | null>(null);
  const [expandedContact, setExpandedContact] = useState<string | null>(null);

  // Contact filters
  const [opFilter, setOpFilter] = useState<string>('all');
  const [engagementFilter, setEngagementFilter] = useState<EngagementFilter>('all');
  const [lFilter, setLFilter] = useState<LFilter>('all');

  async function fetchAll() {
    if (!API_KEY) return;
    try {
      const [pkgRes, emailRes, sigStatRes, sigLogRes, regRes, revRes] = await Promise.all([
        fetch(`${VPS_API}/api/herald/packages`, { headers: { 'x-api-key': API_KEY } }).catch(() => null),
        fetch(`${VPS_API}/api/herald/email-log`, { headers: { 'x-api-key': API_KEY } }).catch(() => null),
        fetch(`${VPS_API}/api/herald/signal/status`, { headers: { 'x-api-key': API_KEY } }).catch(() => null),
        fetch(`${VPS_API}/api/herald/signal/log`, { headers: { 'x-api-key': API_KEY } }).catch(() => null),
        fetch(`${VPS_API}/api/herald/registry`, { headers: { 'x-api-key': API_KEY } }).catch(() => null),
        fetch(`${VPS_API}/api/herald/reviews`, { headers: { 'x-api-key': API_KEY } }).catch(() => null),
      ]);
      if (pkgRes?.ok) { const d = await pkgRes.json(); setPackages(d.packages || []); }
      if (emailRes?.ok) { const d = await emailRes.json(); setEmails(d.emails || []); }
      let merged: SignalStatus = {};
      if (sigStatRes?.ok) merged = { ...merged, ...(await sigStatRes.json()) };
      if (sigLogRes?.ok) merged = { ...merged, ...(await sigLogRes.json()) };
      if (sigStatRes?.ok || sigLogRes?.ok) setSignal(merged);
      if (regRes?.ok) { const d = await regRes.json(); setContacts(d.contacts || []); }
      if (revRes?.ok) { const d = await revRes.json(); setReviews(d.reviews || []); }
      setIsLive(true);
      setLastUpdated(new Date().toISOString());
    } catch { /* silent */ }
  }

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 60000);
    return () => clearInterval(interval);
  }, []);

  const reviewsByFile = new Map(reviews.map(r => [r.filename, r]));

  // Filter contacts
  const filteredContacts = contacts.filter(c => {
    const ops = parseOpTags(c);
    if (opFilter !== 'all' && !ops.includes(opFilter)) return false;
    const engagement = getEngagementState(c);
    if (engagementFilter === 'confirmed' && engagement !== 'ENGAGED') return false;
    if (engagementFilter === 'planned' && engagement === 'ENGAGED') return false;
    if (lFilter !== 'all' && getLLevel(c) !== lFilter) return false;
    return true;
  });

  // Sort: synergy partners first, then by L-level (L5>L0), then alphabetical
  const lRank = (l: string) => ({ L5: 0, L4: 1, L3: 2, L2: 3, L1: 4, L0: 5 }[l] ?? 5);
  filteredContacts.sort((a, b) => {
    const aSyn = a.id === 'REG-020' || a.id === 'REG-021' ? 0 : 1;
    const bSyn = b.id === 'REG-020' || b.id === 'REG-021' ? 0 : 1;
    if (aSyn !== bSyn) return aSyn - bSyn;
    const lDiff = lRank(getLLevel(a)) - lRank(getLLevel(b));
    if (lDiff !== 0) return lDiff;
    return (a.name || '').localeCompare(b.name || '');
  });

  const confirmedEngaged = contacts.filter(c => getEngagementState(c) === 'ENGAGED').length;
  const pendingPackages = packages.filter(p => !reviewsByFile.get(p.filename)).length;
  const recentEmails = emails.slice(0, 12);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 px-1">
        <Dot color={isLive ? '#10b981' : '#f59e0b'} pulse={isLive} />
        <span className="font-mono text-xs tracking-wider" style={{ color: isLive ? '#8b5cf6' : '#f59e0b' }}>
          DISTRIBUTION {isLive ? '\u2014 LIVE' : '\u2014 CONNECTING'}
        </span>
        {lastUpdated && <span className="font-mono text-[9px] text-slate-600 ml-2">Updated {timeAgo(lastUpdated)}</span>}
        <button onClick={fetchAll} className="ml-auto text-[9px] font-mono text-slate-500 hover:text-cyan-400">REFRESH</button>
      </div>

      {/* Intro */}
      <div className="p-5 bg-gradient-to-r from-purple-500/[.08] to-blue-500/[.04] border border-purple-500/20 rounded-xl">
        <h2 className="text-base font-bold text-purple-400 mb-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>INTELLIGENCE DISTRIBUTION</h2>
        <p className="text-[13px] text-slate-300 leading-relaxed">
          Cross-operation intelligence distribution. The HERALD registry is a growing database — every contact carries per-op fit, L-level trust, terrain affinity, and reserve/closed-gate flags. Distribution gate remains DIRECTOR-reserved per HERALD-DISTRIBUTION-DIRECTIVE-OP004-PKG-015902-v3 §13.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {[
          { label: 'Contacts', value: contacts.length, color: '#f59e0b' },
          { label: 'Engaged', value: confirmedEngaged, color: '#10b981' },
          { label: 'Packages', value: packages.length, color: '#8b5cf6' },
          { label: 'Pending Review', value: pendingPackages, color: pendingPackages > 0 ? '#ef4444' : '#64748b' },
          { label: 'Emails Sent', value: emails.length, color: '#06b6d4' },
          { label: 'Signal Sent', value: signal?.sent_count ?? '\u2014', color: '#3b82f6' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-[#111b2a] border border-[#1e2d44] rounded-xl p-4">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{kpi.label}</div>
            <div className="text-xl font-extrabold font-mono mt-1" style={{ color: kpi.color }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Distribution Contacts Register */}
      <div className="bg-[#111b2a] border border-[#1e2d44] rounded-xl overflow-hidden" style={{ borderTop: '2px solid #f59e0b' }}>
        <div className="px-5 py-3 bg-[#0d1520] border-b border-[#1e2d44]">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span>{'\uD83D\uDCD2'}</span>
            <span className="text-[13px] font-bold text-slate-200">Vetted Distribution Contacts</span>
            <span className="font-mono text-[11px] text-slate-500">{filteredContacts.length} / {contacts.length}</span>
            <span className="ml-auto font-mono text-[10px] text-slate-600">cross-op registry</span>
          </div>
          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap text-[10px]">
            <span className="font-mono text-slate-500">op:</span>
            <button onClick={() => setOpFilter('all')} className={`px-2 py-0.5 rounded ${opFilter === 'all' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}>all</button>
            {KNOWN_OPS.map(op => (
              <button key={op} onClick={() => setOpFilter(op)} className="px-2 py-0.5 rounded font-mono" style={{
                background: opFilter === op ? `${OP_COLORS[op]}25` : 'transparent',
                color: opFilter === op ? OP_COLORS[op] : '#94a3b8',
              }}>
                {op}
              </button>
            ))}
            <span className="font-mono text-slate-600 mx-1">{'\u2502'}</span>
            <span className="font-mono text-slate-500">engagement:</span>
            <button onClick={() => setEngagementFilter('all')} className={`px-2 py-0.5 rounded ${engagementFilter === 'all' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}>all</button>
            <button onClick={() => setEngagementFilter('confirmed')} className={`px-2 py-0.5 rounded ${engagementFilter === 'confirmed' ? 'bg-green-500/20 text-green-400' : 'text-slate-500 hover:text-slate-300'}`}>confirmed</button>
            <button onClick={() => setEngagementFilter('planned')} className={`px-2 py-0.5 rounded ${engagementFilter === 'planned' ? 'bg-amber-500/20 text-amber-400' : 'text-slate-500 hover:text-slate-300'}`}>planned</button>
            <span className="font-mono text-slate-600 mx-1">{'\u2502'}</span>
            <span className="font-mono text-slate-500">L-level:</span>
            {(['all', 'L5', 'L4', 'L3', 'L2', 'L1', 'L0'] as LFilter[]).map(lv => (
              <button key={lv} onClick={() => setLFilter(lv)} className={`px-2 py-0.5 rounded font-mono ${lFilter === lv ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}>{lv}</button>
            ))}
          </div>
        </div>
        <div className="p-3 space-y-2">
          {filteredContacts.length === 0 ? (
            <div className="text-center py-6 text-[12px] text-slate-500">No contacts match these filters.</div>
          ) : (
            filteredContacts.map(c => {
              const key = c.contactId || c.id || c.name || '';
              return (
                <ContactCard
                  key={key}
                  c={c}
                  expanded={expandedContact === key}
                  onToggle={() => setExpandedContact(expandedContact === key ? null : key)}
                />
              );
            })
          )}
        </div>
      </div>

      {/* Distribution Packages — clickable */}
      <div className="bg-[#111b2a] border border-[#1e2d44] rounded-xl overflow-hidden" style={{ borderTop: '2px solid #8b5cf6' }}>
        <div className="px-5 py-3 bg-[#0d1520] border-b border-[#1e2d44] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>{'\uD83D\uDCE6'}</span>
            <span className="text-[13px] font-bold text-slate-200">Distribution Packages</span>
          </div>
          <span className="font-mono text-[11px] text-slate-500">{packages.length} PACKAGES {'\u2022'} click to view</span>
        </div>
        {packages.length === 0 ? (
          <div className="p-6 text-center text-[12px] text-slate-500">No packages.</div>
        ) : (
          <div className="divide-y divide-[#1a2740]">
            {packages.map((pkg, i) => {
              const review = reviewsByFile.get(pkg.filename) || null;
              const opTag = extractPackageOpTag(pkg.filename);
              return (
                <button
                  key={i}
                  onClick={() => setSelectedPackage(pkg)}
                  className="w-full text-left px-5 py-3 hover:bg-[#131f30] transition-colors flex items-start gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-semibold text-slate-200 truncate">{pkg.filename}</div>
                    {pkg.content && (
                      <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{String(pkg.content).slice(0, 160)}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {opTag && (
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded"
                        style={{ background: `${OP_COLORS[opTag]}15`, color: OP_COLORS[opTag] }}>
                        {opTag}
                      </span>
                    )}
                    {review ? (
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded"
                        style={{
                          background: review.action === 'approve' ? '#10b98115' : review.action === 'hold' ? '#f59e0b15' : '#ef444415',
                          color: review.action === 'approve' ? '#10b981' : review.action === 'hold' ? '#f59e0b' : '#ef4444',
                        }}>
                        {review.action.toUpperCase()}
                      </span>
                    ) : (
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-red-500/15 text-red-400">PENDING</span>
                    )}
                    <span className="text-slate-600 text-xs">{'\u25B8'}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Email Outreach */}
      <div className="bg-[#111b2a] border border-[#1e2d44] rounded-xl overflow-hidden" style={{ borderTop: '2px solid #06b6d4' }}>
        <div className="px-5 py-3 bg-[#0d1520] border-b border-[#1e2d44] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>{'\uD83D\uDCE7'}</span>
            <span className="text-[13px] font-bold text-slate-200">Recent Email Outreach</span>
          </div>
          <span className="font-mono text-[11px] text-cyan-400">{emails.length} TOTAL</span>
        </div>
        {recentEmails.length === 0 ? (
          <div className="p-6 text-center text-[12px] text-slate-500">{isLive ? 'No outreach emails on record.' : 'Connecting...'}</div>
        ) : (
          <div className="divide-y divide-[#1a2740]">
            {recentEmails.map((e, i) => (
              <div key={i} className="px-5 py-3 hover:bg-[#131f30] transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-slate-200 truncate">{e.subject}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                      <span className="text-slate-600">to</span> {recipientLabel(e.to)}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono text-[10px] text-slate-400">{formatAESTShort(e.sentAt)}</div>
                    <div className="font-mono text-[9px] text-slate-600">{timeAgo(e.sentAt)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Signal Channel */}
      <div className="bg-[#111b2a] border border-[#1e2d44] rounded-xl overflow-hidden" style={{ borderTop: '2px solid #3b82f6' }}>
        <div className="px-5 py-3 bg-[#0d1520] border-b border-[#1e2d44] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>{'\uD83D\uDCAC'}</span>
            <span className="text-[13px] font-bold text-slate-200">Signal Channel</span>
          </div>
          {signal?.status && (
            <span className="font-mono text-[10px] px-2 py-0.5 rounded" style={{ background: signal.status === 'online' ? '#10b98115' : '#64748b15', color: signal.status === 'online' ? '#10b981' : '#64748b' }}>
              {signal.status?.toUpperCase()}
            </span>
          )}
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-[12px]">
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Identity</div>
            <div className="text-slate-200 mt-0.5">{signal?.profile_name || '\u2014'}</div>
            <div className="font-mono text-[11px] text-slate-500">{signal?.account || ''}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Daemon</div>
            <div className="text-slate-200 mt-0.5">{signal?.daemon || '\u2014'}</div>
            <div className="font-mono text-[11px] text-slate-500">v{signal?.version?.version || ''}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Traffic</div>
            <div className="text-slate-200 mt-0.5">
              <span className="font-mono text-blue-400">{signal?.sent_count ?? '\u2014'}</span> sent
              <span className="mx-2 text-slate-600">/</span>
              <span className="font-mono text-emerald-400">{signal?.received_count ?? '\u2014'}</span> received
            </div>
          </div>
        </div>
      </div>

      {/* Vetting Protocol */}
      <div className="bg-[#111b2a] border border-[#1e2d44] rounded-xl p-5" style={{ borderTop: '2px solid #f59e0b' }}>
        <div className="text-[13px] font-bold text-amber-400 mb-3">VETTING PROTOCOL</div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-[#0a0f18] border border-[#1a2740]">
            <div className="text-[11px] font-bold text-cyan-400 mb-1">OPSEC (Operational Security)</div>
            <div className="text-[12px] text-slate-400 leading-relaxed">Information discipline, digital hygiene, history of discretion, network exposure assessment.</div>
          </div>
          <div className="p-3 rounded-lg bg-[#0a0f18] border border-[#1a2740]">
            <div className="text-[11px] font-bold text-purple-400 mb-1">SocialSec (Social Security)</div>
            <div className="text-[12px] text-slate-400 leading-relaxed">Public behaviour consistency, private integrity, no inflammatory discourse, no performative alignment, ego-free engagement.</div>
          </div>
        </div>
      </div>

      {/* DIRECTOR Override */}
      <div className="p-4 rounded-xl bg-red-500/[.06] border border-red-500/15">
        <div className="text-[11px] font-bold text-red-400 uppercase tracking-wider mb-1">DIRECTOR-RESERVED GATES</div>
        <div className="text-[12px] text-slate-400 leading-relaxed">
          Per HERALD-DISTRIBUTION-DIRECTIVE-OP004-PKG-015902-v3 §13: distribution GO per phase/package, Anthropic outbound (permanently closed; inbound-only), named-ally co-signatory commitment, LUMINA scope beyond PM confirmation, SOCOM formalisation, Tier A/B repositioning, Phase 3 (legal/human-rights) activation, post-HARD-STOP phase reassessment. All surface in the DIRECTOR Review Register.
        </div>
      </div>

      {selectedPackage && (
        <PackageModal
          pkg={selectedPackage}
          review={reviewsByFile.get(selectedPackage.filename) || null}
          onClose={() => setSelectedPackage(null)}
        />
      )}
    </div>
  );
}
