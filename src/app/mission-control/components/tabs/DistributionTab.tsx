'use client';

import React, { useState, useEffect } from 'react';
import { Dot } from '../ui';
import { formatAESTShort } from '../../lib/date-utils';

const VPS_API = process.env.NEXT_PUBLIC_VPS_ENDPOINT || 'https://ops.jr8ch.com';
const API_KEY = process.env.NEXT_PUBLIC_VIGIL_API_KEY || '';

type DistTier = 'tier1' | 'tier2' | 'tier3';

const TIERS = [
  { id: 'tier1' as DistTier, label: 'Tier 1 — Strategic Placement', color: '#ef4444', desc: 'Highest-value intel → vetted journalists via secure channel. Forces institutional action.' },
  { id: 'tier2' as DistTier, label: 'Tier 2 — Public Content', color: '#f59e0b', desc: 'COMMANDER-cleared intel → AXIOM public content. Sanitised, no operational details.' },
  { id: 'tier3' as DistTier, label: 'Tier 3 — Autonomous Evergreen', color: '#10b981', desc: 'Consciousness elevation, pattern recognition, AI partnership. No gate required.' },
];

// Static Tier 2/3 targets — AXIOM and evergreen channels not tracked in HERALD registry
const STATIC_TARGETS = [
  { name: 'AXIOM (@VigilAgencyOps)', type: 'influencer', platform: 'X', status: 'engaged', tier: 'tier2' as DistTier, notes: 'Active. Content briefs from COMMANDER. OPSEC firewall enforced.', opsecCleared: true, socialSecCleared: true },
  { name: 'AXIOM (@vigilops2026)', type: 'influencer', platform: 'Instagram', status: 'engaged', tier: 'tier2' as DistTier, notes: 'Active. Visual content for consciousness mechanics + allied fighter amplification.', opsecCleared: true, socialSecCleared: true },
];

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

interface RegistryContact {
  id?: string;
  name?: string;
  type?: string;
  trustLevel?: string;
  expertise?: string;
  opRelevance?: string;
  status?: string;
}

function statusColor(s: string) {
  const v = s?.toUpperCase() || '';
  if (v.includes('VETTED') || v.includes('ENGAGED') || v.includes('ACTIVE')) return '#10b981';
  if (v.includes('VETTING') || v.includes('ASSESSED')) return '#f59e0b';
  if (v.includes('L5') || v.includes('L4') || v.includes('L3')) return '#10b981';
  if (v.includes('L2')) return '#3b82f6';
  if (v.includes('L1')) return '#f59e0b';
  return '#64748b';
}

function typeIcon(t: string) {
  const v = (t || '').toLowerCase();
  if (v.includes('journalist')) return '\uD83D\uDCF0';
  if (v.includes('political')) return '\uD83C\uDFDB';
  if (v.includes('influencer')) return '\uD83D\uDCE2';
  if (v.includes('academic')) return '\uD83C\uDF93';
  return '\uD83C\uDFE2';
}

function tierFromTrust(tl?: string): DistTier {
  // Journalists w/ registry trust level map to Tier 1 (strategic placement)
  return 'tier1';
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

export default function DistributionTab() {
  const [activeTier, setActiveTier] = useState<DistTier | null>(null);
  const [packages, setPackages] = useState<Array<{ filename: string; content?: string }>>([]);
  const [emails, setEmails] = useState<EmailLogEntry[]>([]);
  const [signal, setSignal] = useState<SignalStatus | null>(null);
  const [contacts, setContacts] = useState<RegistryContact[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  async function fetchAll() {
    if (!API_KEY) return;
    try {
      const [pkgRes, emailRes, sigStatRes, sigLogRes, regRes] = await Promise.all([
        fetch(`${VPS_API}/api/herald/packages`, { headers: { 'x-api-key': API_KEY } }).catch(() => null),
        fetch(`${VPS_API}/api/herald/email-log`, { headers: { 'x-api-key': API_KEY } }).catch(() => null),
        fetch(`${VPS_API}/api/herald/signal/status`, { headers: { 'x-api-key': API_KEY } }).catch(() => null),
        fetch(`${VPS_API}/api/herald/signal/log`, { headers: { 'x-api-key': API_KEY } }).catch(() => null),
        fetch(`${VPS_API}/api/herald/registry`, { headers: { 'x-api-key': API_KEY } }).catch(() => null),
      ]);
      if (pkgRes?.ok) { const d = await pkgRes.json(); setPackages(d.packages || []); }
      if (emailRes?.ok) { const d = await emailRes.json(); setEmails(d.emails || []); }

      // Merge signal status + counts (counts live under /signal/log on current server)
      let merged: SignalStatus = {};
      if (sigStatRes?.ok) { merged = { ...merged, ...(await sigStatRes.json()) }; }
      if (sigLogRes?.ok) { merged = { ...merged, ...(await sigLogRes.json()) }; }
      if (sigStatRes?.ok || sigLogRes?.ok) setSignal(merged);

      if (regRes?.ok) { const d = await regRes.json(); setContacts(d.contacts || []); }
      setIsLive(true);
      setLastUpdated(new Date().toISOString());
    } catch { /* silent */ }
  }

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 60000);
    return () => clearInterval(interval);
  }, []);

  // Build Tier 1 targets dynamically from HERALD registry (journalists + outlets)
  const tier1FromRegistry = contacts.map(c => ({
    name: c.name || c.id || 'Unknown',
    type: (c.type || 'journalist').toLowerCase(),
    platform: c.expertise || 'Press',
    status: (c.trustLevel || c.status || '').toLowerCase(),
    tier: 'tier1' as DistTier,
    notes: c.status || `Trust: ${c.trustLevel || 'unassessed'}${c.opRelevance ? ` — ${c.opRelevance}` : ''}`,
    opsecCleared: (c.trustLevel || '').includes('L2') || (c.trustLevel || '').includes('L3') || (c.trustLevel || '').includes('L4') || (c.trustLevel || '').includes('L5'),
    socialSecCleared: (c.trustLevel || '').includes('L2') || (c.trustLevel || '').includes('L3') || (c.trustLevel || '').includes('L4') || (c.trustLevel || '').includes('L5'),
    trustLevel: c.trustLevel,
    opRelevance: c.opRelevance,
  }));

  const targets = [...tier1FromRegistry, ...STATIC_TARGETS];

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

      {/* Pipeline Overview */}
      <div className="p-5 bg-gradient-to-r from-purple-500/[.08] to-blue-500/[.04] border border-purple-500/20 rounded-xl">
        <h2 className="text-base font-bold text-purple-400 mb-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>INTELLIGENCE DISTRIBUTION PIPELINE</h2>
        <p className="text-[13px] text-slate-300 leading-relaxed">
          Not all intelligence belongs on social media. VIGIL operates a tiered distribution model — mission interest first, public interest second.
          Every release is vetted through OPSEC + SocialSec before distribution. DIRECTOR + COMMANDER authorization required for Tier 1.
        </p>
      </div>

      {/* Live KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Packages', value: packages.length, color: '#8b5cf6' },
          { label: 'Emails Sent', value: emails.length, color: '#06b6d4' },
          { label: 'Signal Sent', value: signal?.sent_count ?? '\u2014', color: '#3b82f6' },
          { label: 'Signal Inbox', value: signal?.received_count ?? '\u2014', color: '#10b981' },
          { label: 'Media Contacts', value: contacts.length, color: '#f59e0b' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-[#111b2a] border border-[#1e2d44] rounded-xl p-4">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{kpi.label}</div>
            <div className="text-xl font-extrabold font-mono mt-1" style={{ color: kpi.color }}>{kpi.value}</div>
          </div>
        ))}
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
          <div className="p-6 text-center text-[12px] text-slate-500">{isLive ? 'No outreach emails on record.' : 'Connecting to ops.jr8ch.com...'}</div>
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

      {/* Tiers */}
      <div className="space-y-3">
        {TIERS.map(tier => {
          const tierTargets = targets.filter(t => t.tier === tier.id);
          return (
            <div key={tier.id} className="bg-[#111b2a] border border-[#1e2d44] rounded-xl overflow-hidden cursor-pointer hover:bg-[#131f30] transition-colors"
              style={{ borderLeft: `3px solid ${tier.color}` }}
              onClick={() => setActiveTier(activeTier === tier.id ? null : tier.id)}>
              <div className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <div className="text-[14px] font-bold text-slate-200">{tier.label}</div>
                  <div className="text-[12px] text-slate-400 mt-0.5">{tier.desc}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded" style={{ background: `${tier.color}15`, color: tier.color }}>
                    {tierTargets.length} targets
                  </span>
                  <span className="text-slate-500 text-xs">{activeTier === tier.id ? '\u25BE' : '\u25B8'}</span>
                </div>
              </div>
              {activeTier === tier.id && (
                <div className="px-5 pb-4 border-t border-[#1e2d44] space-y-2 mt-2">
                  {tierTargets.map((target, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-[#0a0f18] border border-[#1a2740]">
                      <span className="text-lg">{typeIcon(target.type)}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[13px] font-semibold text-slate-200">{target.name}</span>
                          {(target as any).trustLevel && (
                            <span className="font-mono text-[10px] px-2 py-0.5 rounded" style={{ background: `${statusColor((target as any).trustLevel)}15`, color: statusColor((target as any).trustLevel) }}>
                              {(target as any).trustLevel}
                            </span>
                          )}
                          {!(target as any).trustLevel && (
                            <span className="font-mono text-[10px] px-2 py-0.5 rounded" style={{ background: `${statusColor(target.status)}15`, color: statusColor(target.status) }}>{target.status.toUpperCase()}</span>
                          )}
                          <span className="font-mono text-[10px] text-slate-500">{target.platform}</span>
                          {(target as any).opRelevance && <span className="font-mono text-[10px] text-cyan-400">{(target as any).opRelevance}</span>}
                          {target.opsecCleared && <span className="text-[10px] text-green-500">{'\u2705'} OPSEC</span>}
                          {target.socialSecCleared && <span className="text-[10px] text-green-500">{'\u2705'} SocialSec</span>}
                        </div>
                        <div className="text-[12px] text-slate-400 mt-1">{target.notes}</div>
                      </div>
                    </div>
                  ))}
                  {tierTargets.length === 0 && (
                    <div className="text-center py-4 text-[12px] text-slate-600">No targets registered for this tier yet.</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
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
        <div className="text-[11px] font-bold text-red-400 uppercase tracking-wider mb-1">DIRECTOR OVERRIDE</div>
        <div className="text-[12px] text-slate-400 leading-relaxed">
          DIRECTOR may authorize any Tier 1 intel for public release through AXIOM at sole discretion. Triggers: journalist inaction (placed intel not published) or strategic timing (immediate release serves mission better). The override is simple: DIRECTOR says &quot;release it.&quot; COMMANDER executes.
        </div>
      </div>

      {/* Recent Packages */}
      {packages.length > 0 && (
        <div className="bg-[#111b2a] border border-[#1e2d44] rounded-xl overflow-hidden" style={{ borderTop: '2px solid #10b981' }}>
          <div className="px-5 py-3 bg-[#0d1520] border-b border-[#1e2d44] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Dot color="#10b981" pulse />
              <span className="text-[13px] font-bold text-emerald-400">Recent Distribution Packages</span>
            </div>
            <span className="font-mono text-[11px] text-slate-500">{packages.length} PACKAGES</span>
          </div>
          <div className="divide-y divide-[#1a2740]">
            {packages.slice(0, 10).map((pkg, i) => (
              <div key={i} className="px-5 py-3">
                <div className="text-[12px] font-semibold text-slate-200 mb-1">{pkg.filename}</div>
                {pkg.content && (
                  <div className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">{pkg.content.slice(0, 240)}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
