'use client';

import React, { useState, useEffect } from 'react';
import { Dot } from './ui';
import { formatAESTShort } from '../lib/date-utils';

const VPS_API = process.env.NEXT_PUBLIC_VPS_ENDPOINT || 'https://ops.jr8ch.com';
const API_KEY = process.env.NEXT_PUBLIC_VIGIL_API_KEY || '';

const LAST_SEEN_KEY = 'vigil-last-seen';

interface AlertItem {
  type: 'intel' | 'strategy' | 'threat' | 'team-report' | 'hypothesis' | 'pattern';
  title: string;
  time: string;
  detail?: string;
  tabId?: string;
}

const TYPE_ICONS: Record<string, string> = {
  intel: '\uD83D\uDCE1',
  strategy: '\uD83D\uDCDC',
  threat: '\u26A0\uFE0F',
  'team-report': '\uD83D\uDCCB',
  hypothesis: '\uD83E\uDD14',
  pattern: '\uD83D\uDD17',
};

const TYPE_COLORS: Record<string, string> = {
  intel: '#06b6d4',
  strategy: '#3b82f6',
  threat: '#f97316',
  'team-report': '#8b5cf6',
  hypothesis: '#ec4899',
  pattern: '#10b981',
};

export default function WhatsNew({ onNavigate }: { onNavigate?: (tabId: string) => void }) {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [lastSeen, setLastSeen] = useState<string>('');

  useEffect(() => {
    if (!API_KEY) { setLoading(false); return; }

    const stored = localStorage.getItem(LAST_SEEN_KEY);
    const since = stored || new Date(Date.now() - 24 * 3600 * 1000).toISOString(); // Default: last 24h
    setLastSeen(since);

    async function load() {
      try {
        const [intelRes, stratRes, teamRes, hypoRes, patRes] = await Promise.all([
          fetch(`${VPS_API}/api/mission/intel?limit=20`, { headers: { 'x-api-key': API_KEY } }).catch(() => null),
          fetch(`${VPS_API}/api/mission/strategy?limit=10`, { headers: { 'x-api-key': API_KEY } }).catch(() => null),
          fetch(`${VPS_API}/api/mission/team-reports`, { headers: { 'x-api-key': API_KEY } }).catch(() => null),
          fetch(`${VPS_API}/api/mission/hypotheses`, { headers: { 'x-api-key': API_KEY } }).catch(() => null),
          fetch(`${VPS_API}/api/mission/patterns`, { headers: { 'x-api-key': API_KEY } }).catch(() => null),
        ]);

        const sinceTime = new Date(since).getTime();
        const items: AlertItem[] = [];

        if (intelRes?.ok) {
          const data = await intelRes.json();
          for (const r of (data.reports || [])) {
            const t = r.modified || r.timestamp;
            if (t && new Date(t).getTime() > sinceTime) {
              items.push({ type: 'intel', title: `HB#${r.heartbeat || '?'}: ${r.findings?.[0]?.slice(0, 80) || r.filename || 'New intel'}`, time: t, tabId: 'sigint' });
            }
          }
        }

        if (stratRes?.ok) {
          const data = await stratRes.json();
          for (const u of (data.updates || [])) {
            if (u.modified && new Date(u.modified).getTime() > sinceTime) {
              items.push({ type: 'strategy', title: `Strategy: ${u.filename || 'New directive'} (${u.orderCount || 0} orders)`, time: u.modified, tabId: 'orders-ai' });
            }
          }
        }

        if (teamRes?.ok) {
          const data = await teamRes.json();
          for (const r of (data.reports || [])) {
            if (r.received && new Date(r.received).getTime() > sinceTime) {
              items.push({ type: 'team-report', title: `${r.team || 'Agent'} team report`, time: r.received, tabId: 'overview' });
            }
          }
        }

        if (hypoRes?.ok) {
          const data = await hypoRes.json();
          for (const h of (data.hypotheses || [])) {
            if (h.filed && new Date(h.filed).getTime() > sinceTime) {
              items.push({ type: 'hypothesis', title: `${h.id}: ${h.title?.slice(0, 60) || 'New hypothesis'}`, time: h.filed, tabId: 'hypotheses' });
            }
          }
        }

        if (patRes?.ok) {
          const data = await patRes.json();
          for (const p of (data.patterns || [])) {
            const pt = p.detected_at || p.timestamp;
            if (pt && new Date(pt).getTime() > sinceTime) {
              items.push({ type: 'pattern', title: `Pattern: ${p.pattern_class || p.id || 'New match'}`, time: pt, tabId: 'exchange' });
            }
          }
        }

        // Sort by time, most recent first
        items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

        setAlerts(items);
      } catch { /* silent */ }
      setLoading(false);
    }

    load();
  }, []);

  function markSeen() {
    const now = new Date().toISOString();
    localStorage.setItem(LAST_SEEN_KEY, now);
    setDismissed(true);
  }

  if (loading || dismissed || alerts.length === 0) return null;

  return (
    <div className="animate-fadeIn mb-4 rounded-xl border border-cyan-500/20 bg-cyan-500/[.04] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-cyan-500/[.06] border-b border-cyan-500/15">
        <div className="flex items-center gap-2">
          <Dot color="#06b6d4" pulse />
          <span className="font-mono text-[12px] font-bold text-cyan-400 tracking-wider">
            WHAT&apos;S NEW — {alerts.length} UPDATE{alerts.length > 1 ? 'S' : ''} SINCE YOU LEFT
          </span>
          {lastSeen && (
            <span className="font-mono text-[9px] text-slate-500">since {formatAESTShort(lastSeen)}</span>
          )}
        </div>
        <button onClick={markSeen} className="text-[10px] font-mono text-slate-400 hover:text-slate-200 px-2 py-1 border border-[#2a3550] rounded hover:bg-white/[.03] transition-all">
          MARK ALL SEEN
        </button>
      </div>
      <div className="px-4 py-3 space-y-1.5 max-h-[300px] overflow-y-auto">
        {alerts.slice(0, 15).map((alert, i) => (
          <div
            key={i}
            className="flex items-center gap-3 py-1.5 px-2 -mx-2 rounded hover:bg-white/[.02] cursor-pointer transition-all"
            onClick={() => { if (alert.tabId && onNavigate) onNavigate(alert.tabId); markSeen(); }}
          >
            <span className="text-sm flex-shrink-0">{TYPE_ICONS[alert.type] || '\u2022'}</span>
            <span className="text-[11px] text-slate-300 flex-1 min-w-0 truncate">{alert.title}</span>
            <span className="font-mono text-[9px] flex-shrink-0" style={{ color: TYPE_COLORS[alert.type] || '#64748b' }}>
              {formatAESTShort(alert.time)}
            </span>
          </div>
        ))}
        {alerts.length > 15 && (
          <div className="text-center text-[10px] text-slate-500 pt-1">+{alerts.length - 15} more</div>
        )}
      </div>
    </div>
  );
}
