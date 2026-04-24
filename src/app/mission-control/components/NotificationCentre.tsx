'use client';

import React, { useState, useEffect, useRef } from 'react';
import { formatAESTShort } from '../lib/date-utils';
import { fetchPendingReview, type PendingItem, type Urgency } from '../lib/director-review';

interface NotificationCentreProps {
  onNavigate?: (tabId: string) => void;
}

function urgencyColor(u: Urgency): string {
  if (u === 'HARD_STOP') return '#ef4444';
  if (u === 'CRITICAL') return '#f97316';
  if (u === 'ELEVATED') return '#f59e0b';
  return '#3b82f6';
}

function urgencyBg(u: Urgency): string {
  if (u === 'HARD_STOP') return 'rgba(239,68,68,0.15)';
  if (u === 'CRITICAL') return 'rgba(249,115,22,0.15)';
  if (u === 'ELEVATED') return 'rgba(245,158,11,0.15)';
  return 'rgba(59,130,246,0.15)';
}

export default function NotificationCentre({ onNavigate }: NotificationCentreProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<PendingItem[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchPendingReview();
        setPending(data.pending || []);
      } catch {
        /* offline — leave prior state */
      }
    }
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, []);

  const pendingCount = pending.length;
  const criticalCount = pending.filter(p => p.urgency === 'HARD_STOP' || p.urgency === 'CRITICAL').length;

  function goReview(_item?: PendingItem) {
    setOpen(false);
    if (onNavigate) {
      // ReviewRegisterTab is registered under tab id 'review-register' in page.tsx
      onNavigate('review-register');
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-[#131f30] transition-colors"
        title={`${pendingCount} item${pendingCount !== 1 ? 's' : ''} pending Review & Approve`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {pendingCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 text-white text-[9px] font-bold rounded-full flex items-center justify-center"
            style={{
              background: criticalCount > 0 ? '#ef4444' : '#f59e0b',
              animation: criticalCount > 0 ? 'pulse 1.5s infinite' : undefined,
            }}
          >
            {pendingCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-96 bg-[#0d1520] border border-[#1e2d44] rounded-xl shadow-2xl z-[100] overflow-hidden">
          <div className="px-4 py-2.5 bg-[#111d2e] border-b border-[#1e2d44] flex items-center justify-between">
            <span className="font-mono text-[12px] font-bold text-slate-200 tracking-wider">REVIEW & APPROVE</span>
            <span className="font-mono text-[10px] text-slate-500">{pendingCount} pending</span>
          </div>

          {pendingCount === 0 ? (
            <div className="p-6 text-center text-[12px] text-slate-600">Nothing pending DIRECTOR review.</div>
          ) : (
            <div className="max-h-[400px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
              {pending.slice(0, 10).map(item => (
                <div
                  key={item.path}
                  onClick={() => goReview(item)}
                  className="border-b border-[#1a2740] p-3 cursor-pointer hover:bg-[#131f30] transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="font-mono text-[10px] px-2 py-0.5 rounded"
                      style={{ background: urgencyBg(item.urgency), color: urgencyColor(item.urgency) }}
                    >
                      {item.urgency}
                    </span>
                    <span className="font-mono text-[10px] text-slate-500 truncate flex-1">{item.folder}</span>
                    {item.filedBy && <span className="font-mono text-[10px] text-slate-600">{item.filedBy}</span>}
                  </div>
                  <div className="text-[12px] text-slate-200 leading-snug mb-1 line-clamp-2">{item.title}</div>
                  {item.summary && item.summary !== item.title && (
                    <div className="text-[11px] text-slate-500 leading-snug line-clamp-2">{item.summary}</div>
                  )}
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="font-mono text-[9px] text-slate-700">
                      {item.filedAt ? formatAESTShort(item.filedAt) : item.modified ? formatAESTShort(item.modified) : ''}
                    </span>
                    {item.operation && (
                      <span className="font-mono text-[9px] text-cyan-500">{item.operation}</span>
                    )}
                  </div>
                </div>
              ))}
              {pendingCount > 10 && (
                <div className="text-center text-[10px] text-slate-500 py-2 border-t border-[#1a2740]">
                  +{pendingCount - 10} more — open Review & Approve
                </div>
              )}
            </div>
          )}

          {pendingCount > 0 && (
            <div className="px-3 py-2 bg-[#0a0f18] border-t border-[#1a2740]">
              <button
                onClick={() => goReview()}
                className="w-full py-1.5 rounded bg-cyan-500/15 text-cyan-400 text-[11px] font-bold hover:bg-cyan-500/25 transition-colors"
              >
                OPEN REVIEW & APPROVE
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
