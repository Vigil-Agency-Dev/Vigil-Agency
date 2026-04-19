'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Dot } from '../ui';
import { formatAESTShort } from '../../lib/date-utils';
import {
  fetchPendingReview,
  fetchFrontmatterAndBody,
  submitDirectorAction,
  type ReviewRegisterData,
  type PendingItem,
  type DirectorAction,
  type Urgency,
} from '../../lib/director-review';

const URGENCY_COLOR: Record<Urgency, string> = {
  HARD_STOP: '#ef4444',
  CRITICAL: '#ef4444',
  ELEVATED: '#f97316',
  ROUTINE: '#64748b',
};

const STATUS_COLOR: Record<string, string> = {
  PROSPECTIVE: '#8b5cf6',
  AWAITING_DIRECTOR_GO: '#ef4444',
  HELD: '#f59e0b',
  AUTHORISED: '#10b981',
  AUTHORISED_WITH_AMENDMENTS: '#06b6d4',
  REJECTED: '#94a3b8',
  SUPERSEDED: '#64748b',
  CLOSED: '#64748b',
  DRAFT: '#475569',
};

function timeAgo(iso?: string) {
  if (!iso) return '';
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function Badge({ color, children, bold }: { color: string; children: React.ReactNode; bold?: boolean }) {
  return (
    <span
      className={`font-mono text-[10px] px-2 py-0.5 rounded ${bold ? 'font-bold' : ''}`}
      style={{ background: `${color}18`, color, border: `1px solid ${color}40` }}
    >
      {children}
    </span>
  );
}

function ActionModal({
  item,
  onClose,
  onSubmitted,
}: {
  item: PendingItem;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [body, setBody] = useState<string>('');
  const [loadingBody, setLoadingBody] = useState(true);
  const [action, setAction] = useState<DirectorAction | null>(null);
  const [amendments, setAmendments] = useState('');
  const [reason, setReason] = useState('');
  const [newHeldPending, setNewHeldPending] = useState(item.heldPending || '');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string; replyPath?: string; serverAction?: boolean } | null>(null);

  useEffect(() => {
    setLoadingBody(true);
    fetchFrontmatterAndBody(item.path)
      .then(d => setBody(d.body))
      .catch(err => setBody(`Failed to load: ${err.message}`))
      .finally(() => setLoadingBody(false));
  }, [item.path]);

  async function handleSubmit() {
    if (!action) return;
    if (action === 'AUTHORISE_WITH_AMENDMENTS' && !amendments.trim()) {
      setResult({ ok: false, message: 'Amendments text is required for this action.' });
      return;
    }
    if ((action === 'REJECT' || action === 'RETURN') && !reason.trim()) {
      setResult({ ok: false, message: 'Reason is required for reject/return.' });
      return;
    }
    setSubmitting(true);
    setResult(null);
    const res = await submitDirectorAction({
      path: item.path,
      action,
      amendments: action === 'AUTHORISE_WITH_AMENDMENTS' ? amendments.trim() : undefined,
      reason: (action === 'REJECT' || action === 'RETURN') ? reason.trim() : undefined,
      newHeldPending: action === 'RETURN' ? newHeldPending.trim() || undefined : undefined,
    }, item);
    setSubmitting(false);
    if (res.success) {
      setResult({
        ok: true,
        message: `Filed ${action}${res.serverAction ? ' (server)' : ' (client shim)'}. Reply written.`,
        replyPath: res.replyPath,
        serverAction: res.serverAction,
      });
      setTimeout(() => { onSubmitted(); }, 1200);
    } else {
      setResult({ ok: false, message: res.error || 'Action failed.' });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm overflow-y-auto p-4" onClick={onClose}>
      <div className="bg-[#0a0f18] border border-[#2a3550] rounded-xl max-w-5xl w-full my-6 overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#1e2d44] bg-[#111b2a] flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge color={STATUS_COLOR[item.status] || '#64748b'} bold>{item.status}</Badge>
              {item.urgency !== 'ROUTINE' && <Badge color={URGENCY_COLOR[item.urgency]} bold>{item.urgency}</Badge>}
              {item.operation && <Badge color="#06b6d4">{item.operation}</Badge>}
              {item.filedBy && <span className="font-mono text-[10px] text-slate-500">filed by {item.filedBy}</span>}
              {item.filedAt && <span className="font-mono text-[10px] text-slate-500">{formatAESTShort(item.filedAt)}</span>}
            </div>
            <div className="text-base font-bold text-slate-100 leading-tight">{item.title}</div>
            <div className="font-mono text-[10px] text-slate-600 mt-1 truncate">{item.path}</div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-red-400 text-xl leading-none shrink-0">{'\u00D7'}</button>
        </div>

        {/* Meta */}
        <div className="px-5 py-3 border-b border-[#1e2d44] bg-[#0d1520] grid grid-cols-2 md:grid-cols-4 gap-3 text-[11px]">
          {item.actionRequired && (
            <div>
              <div className="text-slate-500 uppercase tracking-wider text-[9px]">Action required</div>
              <div className="text-slate-200 font-mono">{item.actionRequired.replace(/_/g, ' ')}</div>
            </div>
          )}
          {item.reservedGateRef && (
            <div>
              <div className="text-slate-500 uppercase tracking-wider text-[9px]">Reserved gate</div>
              <div className="text-slate-200 font-mono">{item.reservedGateRef}</div>
            </div>
          )}
          {item.heldPending && (
            <div className="col-span-2 md:col-span-2">
              <div className="text-amber-400 uppercase tracking-wider text-[9px]">Held pending</div>
              <div className="text-amber-200">{item.heldPending}</div>
            </div>
          )}
          {item.supersedes && (
            <div className="col-span-2 md:col-span-4">
              <div className="text-slate-500 uppercase tracking-wider text-[9px]">Supersedes</div>
              <div className="text-slate-400 font-mono truncate">{item.supersedes}</div>
            </div>
          )}
        </div>

        {/* Body content */}
        <div className="px-5 py-4 max-h-[45vh] overflow-y-auto">
          {loadingBody ? (
            <div className="text-center py-8 text-[12px] text-slate-500">Loading content...</div>
          ) : (
            <div className="text-[12px] text-slate-300 leading-relaxed font-mono whitespace-pre-wrap" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11.5px' }}>
              {body}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t border-[#1e2d44] bg-[#0d1520]">
          <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-3">DIRECTOR Action</div>

          {!action && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <button onClick={() => setAction('AUTHORISE')} className="py-2.5 rounded-lg bg-green-500/10 text-green-400 text-[12px] font-bold hover:bg-green-500/20 border border-green-500/20">
                {'\u2713'} AUTHORISE
              </button>
              <button onClick={() => setAction('AUTHORISE_WITH_AMENDMENTS')} className="py-2.5 rounded-lg bg-cyan-500/10 text-cyan-400 text-[12px] font-bold hover:bg-cyan-500/20 border border-cyan-500/20">
                {'\u270E'} AUTHORISE + AMEND
              </button>
              <button onClick={() => setAction('RETURN')} className="py-2.5 rounded-lg bg-amber-500/10 text-amber-400 text-[12px] font-bold hover:bg-amber-500/20 border border-amber-500/20">
                {'\u21A9'} RETURN
              </button>
              <button onClick={() => setAction('REJECT')} className="py-2.5 rounded-lg bg-red-500/10 text-red-400 text-[12px] font-bold hover:bg-red-500/20 border border-red-500/20">
                {'\u2715'} REJECT
              </button>
            </div>
          )}

          {action && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[11px]">
                <span className="text-slate-500">Selected:</span>
                <span className="font-mono font-bold" style={{ color: action === 'AUTHORISE' ? '#10b981' : action === 'REJECT' ? '#ef4444' : action === 'RETURN' ? '#f59e0b' : '#06b6d4' }}>
                  {action.replace(/_/g, ' ')}
                </span>
                <button onClick={() => { setAction(null); setResult(null); }} className="ml-auto text-[10px] text-slate-500 hover:text-slate-300 underline">change</button>
              </div>

              {action === 'AUTHORISE_WITH_AMENDMENTS' && (
                <textarea
                  value={amendments}
                  onChange={e => setAmendments(e.target.value)}
                  placeholder="Required: amendments to apply. These will be written to the reply file adjacent to the original, and COMMANDER + owning agent will be notified via team report."
                  className="w-full bg-[#0a0f18] border border-[#2a3550] rounded-md p-3 text-[12px] text-slate-200 placeholder:text-slate-600 focus:border-cyan-500 outline-none resize-y min-h-[120px] font-mono"
                />
              )}

              {action === 'REJECT' && (
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Required: reason for rejection. Be specific — the filing agent needs enough to understand what to change or whether to re-file at all."
                  className="w-full bg-[#0a0f18] border border-[#2a3550] rounded-md p-3 text-[12px] text-slate-200 placeholder:text-slate-600 focus:border-red-500 outline-none resize-y min-h-[100px] font-mono"
                />
              )}

              {action === 'RETURN' && (
                <>
                  <textarea
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    placeholder="Required: what additional information is needed before you can action this?"
                    className="w-full bg-[#0a0f18] border border-[#2a3550] rounded-md p-3 text-[12px] text-slate-200 placeholder:text-slate-600 focus:border-amber-500 outline-none resize-y min-h-[80px] font-mono"
                  />
                  <input
                    value={newHeldPending}
                    onChange={e => setNewHeldPending(e.target.value)}
                    placeholder="Optional: update held_pending string (short, one-line what's blocking)"
                    className="w-full bg-[#0a0f18] border border-[#2a3550] rounded-md p-2.5 text-[12px] text-slate-200 placeholder:text-slate-600 focus:border-amber-500 outline-none font-mono"
                  />
                </>
              )}

              {action === 'AUTHORISE' && (
                <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20 text-[11px] text-slate-300">
                  This will file a DIRECTOR-GO reply adjacent to the original, flip status to AUTHORISED, and notify COMMANDER + the owning agent via team report. No amendments.
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-lg bg-cyan-500/15 text-cyan-400 text-[12px] font-bold hover:bg-cyan-500/25 border border-cyan-500/30 disabled:opacity-50"
                >
                  {submitting ? 'FILING...' : `FILE ${action.replace(/_/g, ' ')}`}
                </button>
                <button onClick={() => { setAction(null); setResult(null); }} className="px-4 py-2.5 rounded-lg text-slate-500 text-[11px] hover:text-slate-300">
                  CANCEL
                </button>
              </div>
            </div>
          )}

          {result && (
            <div className={`mt-3 p-3 rounded-lg text-[11px] ${result.ok ? 'bg-green-500/5 border border-green-500/20 text-green-300' : 'bg-red-500/5 border border-red-500/20 text-red-300'}`}>
              <div className="font-bold">{result.ok ? 'SUCCESS' : 'FAILED'}</div>
              <div className="mt-1">{result.message}</div>
              {result.replyPath && <div className="mt-1 font-mono text-[10px] opacity-70 break-all">{result.replyPath}</div>}
              {result.ok && result.serverAction === false && (
                <div className="mt-1 text-amber-300 text-[10px]">Using client shim — server-side /api/director/action not yet deployed. Write was non-atomic but succeeded.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PendingCard({ item, onOpen }: { item: PendingItem; onOpen: () => void }) {
  const statusColor = STATUS_COLOR[item.status] || '#64748b';
  const urgencyHi = item.urgency === 'HARD_STOP' || item.urgency === 'CRITICAL';
  return (
    <button
      onClick={onOpen}
      className="w-full text-left bg-[#111b2a] border rounded-xl p-4 hover:bg-[#131f30] transition-colors"
      style={{
        borderColor: urgencyHi ? URGENCY_COLOR[item.urgency] : '#1e2d44',
        borderLeft: `3px solid ${urgencyHi ? URGENCY_COLOR[item.urgency] : statusColor}`,
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <Badge color={statusColor} bold>{item.status}</Badge>
            {item.urgency !== 'ROUTINE' && <Badge color={URGENCY_COLOR[item.urgency]} bold>{item.urgency}</Badge>}
            {item.operation && <Badge color="#06b6d4">{item.operation}</Badge>}
            {item.actionRequired && <span className="font-mono text-[10px] text-cyan-400">{item.actionRequired.replace(/_/g, ' ')}</span>}
          </div>
          <div className="text-[13px] font-semibold text-slate-100 leading-snug">{item.title}</div>
          <div className="text-[11px] text-slate-400 mt-1 line-clamp-2">{item.summary}</div>
        </div>
        <span className="text-slate-600 text-xs shrink-0">{'\u25B8'}</span>
      </div>
      {item.heldPending && (
        <div className="mt-2 p-2 rounded bg-amber-500/[.06] border border-amber-500/20">
          <div className="text-[9px] font-bold text-amber-400 uppercase tracking-wider mb-0.5">Held pending</div>
          <div className="text-[11px] text-amber-200 leading-snug">{item.heldPending}</div>
        </div>
      )}
      <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-500 font-mono">
        {item.filedBy && <span>filed by {item.filedBy}</span>}
        {item.filedAt && <span>{formatAESTShort(item.filedAt)} {'\u2022'} {timeAgo(item.filedAt)}</span>}
        <span className="ml-auto truncate opacity-60">{item.folder}/{item.filename}</span>
      </div>
    </button>
  );
}

export default function ReviewRegisterTab() {
  const [data, setData] = useState<ReviewRegisterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewTab, setViewTab] = useState<'pending' | 'history'>('pending');
  const [selected, setSelected] = useState<PendingItem | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const d = await fetchPendingReview();
      setData(d);
    } catch (e: any) {
      setErr(e.message || 'Load failed');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, [load]);

  const pending = data?.pending || [];
  const history = data?.history || [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 px-1">
        <Dot color={pending.length > 0 ? '#ef4444' : '#10b981'} pulse={pending.length > 0} />
        <span className="font-mono text-xs tracking-wider text-red-400">
          DIRECTOR REVIEW & APPROVE REGISTER
        </span>
        {data?.serverScan === false && (
          <span className="font-mono text-[9px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">CLIENT SCAN</span>
        )}
        {data?.serverScan === true && (
          <span className="font-mono text-[9px] px-2 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">SERVER SCAN</span>
        )}
        {data?.scannedAt && <span className="font-mono text-[9px] text-slate-600 ml-2">Scanned {timeAgo(data.scannedAt)} ({data.scanDurationMs}ms)</span>}
        <button onClick={load} className="ml-auto text-[9px] font-mono text-slate-500 hover:text-cyan-400">REFRESH</button>
      </div>

      {/* Intro */}
      <div className="p-5 bg-gradient-to-r from-red-500/[.06] to-purple-500/[.04] border border-red-500/20 rounded-xl">
        <h2 className="text-base font-bold text-red-400 mb-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>DIRECTOR-RESERVED ACTION QUEUE</h2>
        <p className="text-[13px] text-slate-300 leading-relaxed">
          Every DIRECTOR-actionable artefact across the dead-drop surfaces here — distribution directives, commander recommendations, escalations, reserved-gate decisions. Authorise, authorise with amendments, return for info, or reject. All actions file a reply file adjacent to the original and notify COMMANDER via team report.
        </p>
        <p className="text-[11px] text-slate-500 mt-2">
          Scan convention: YAML frontmatter <code className="text-cyan-400">director_review: true</code>. Items without frontmatter are not scanned (safe default). Reply files carry <code className="text-cyan-400">director_review: false</code> and never recurse.
        </p>
      </div>

      {err && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-[12px] text-red-300">
          Load error: {err}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Pending', value: pending.length, color: pending.length > 0 ? '#ef4444' : '#64748b' },
          { label: 'Hard Stop', value: pending.filter(p => p.urgency === 'HARD_STOP').length, color: '#ef4444' },
          { label: 'Critical', value: pending.filter(p => p.urgency === 'CRITICAL').length, color: '#ef4444' },
          { label: 'Held', value: pending.filter(p => p.status === 'HELD').length, color: '#f59e0b' },
          { label: 'History', value: history.length, color: '#64748b' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-[#111b2a] border border-[#1e2d44] rounded-xl p-4">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{kpi.label}</div>
            <div className="text-xl font-extrabold font-mono mt-1" style={{ color: kpi.color }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Tab switcher */}
      <div className="flex items-center gap-2 border-b border-[#1e2d44]">
        <button
          onClick={() => setViewTab('pending')}
          className={`px-4 py-2 text-[12px] font-bold border-b-2 transition-colors ${viewTab === 'pending' ? 'border-red-400 text-red-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
        >
          PENDING ({pending.length})
        </button>
        <button
          onClick={() => setViewTab('history')}
          className={`px-4 py-2 text-[12px] font-bold border-b-2 transition-colors ${viewTab === 'history' ? 'border-slate-300 text-slate-300' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
        >
          HISTORY ({history.length})
        </button>
      </div>

      {/* List */}
      {loading && !data ? (
        <div className="p-10 text-center text-[12px] text-slate-500">Scanning dead-drop...</div>
      ) : viewTab === 'pending' ? (
        pending.length === 0 ? (
          <div className="p-10 text-center">
            <div className="text-[13px] text-slate-400 mb-1">Inbox zero.</div>
            <div className="text-[11px] text-slate-600">
              No items awaiting DIRECTOR action. Items appear here once agents file artefacts with <code className="text-cyan-400">director_review: true</code> frontmatter.
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {pending.map(item => (
              <PendingCard key={item.path} item={item} onOpen={() => setSelected(item)} />
            ))}
          </div>
        )
      ) : (
        history.length === 0 ? (
          <div className="p-10 text-center text-[12px] text-slate-500">No action history yet.</div>
        ) : (
          <div className="space-y-2">
            {history.map(item => (
              <PendingCard key={item.path} item={item} onOpen={() => setSelected(item)} />
            ))}
          </div>
        )
      )}

      {/* Errors from scan */}
      {data?.errors && data.errors.length > 0 && (
        <details className="bg-[#111b2a] border border-[#1e2d44] rounded-xl p-4">
          <summary className="cursor-pointer text-[11px] font-bold text-amber-400">Scan errors ({data.errors.length})</summary>
          <div className="mt-2 space-y-1 text-[10px] text-slate-500 font-mono">
            {data.errors.slice(0, 20).map((e, i) => <div key={i}>{e}</div>)}
          </div>
        </details>
      )}

      {selected && <ActionModal item={selected} onClose={() => setSelected(null)} onSubmitted={() => { setSelected(null); load(); }} />}
    </div>
  );
}
