'use client';

import React, { useState, useEffect, useRef } from 'react';
import { formatAESTShort } from '../lib/date-utils';

const VPS_API = process.env.NEXT_PUBLIC_VPS_ENDPOINT || 'https://ops.jr8ch.com';
const API_KEY = process.env.NEXT_PUBLIC_VIGIL_API_KEY || '';

interface QueueItem {
  id: string;
  filename: string;
  subreddit: string;
  type: string;
  content: string;
  context?: string;
  status: string;
  submittedAt: string;
}

export default function NotificationCentre() {
  const [open, setOpen] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Poll for queue items
  useEffect(() => {
    async function fetchQueue() {
      try {
        const res = await fetch(`${VPS_API}/api/axiom-reddit/queue`, { headers: { 'x-api-key': API_KEY } });
        if (!res.ok) return;
        const data = await res.json();
        setQueue((data.queue || []).filter((q: QueueItem) => q.status === 'pending'));
      } catch { /* offline */ }
    }
    fetchQueue();
    const interval = setInterval(fetchQueue, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleAction = async (filename: string, action: 'approve' | 'reject') => {
    setLoading(true);
    try {
      await fetch(`${VPS_API}/api/axiom-reddit/approve`, {
        method: 'POST',
        headers: { 'x-api-key': API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, action }),
      });
      setQueue(prev => prev.filter(q => q.filename !== filename));
    } catch { /* error */ }
    setLoading(false);
  };

  const pendingCount = queue.length;

  return (
    <div ref={ref} className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-[#131f30] transition-colors"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {pendingCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
            {pendingCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-10 w-80 bg-[#0d1520] border border-[#1e2d44] rounded-xl shadow-2xl z-[100] overflow-hidden">
          <div className="px-4 py-2.5 bg-[#111d2e] border-b border-[#1e2d44] flex items-center justify-between">
            <span className="font-mono text-[12px] font-bold text-slate-200 tracking-wider">NOTIFICATIONS</span>
            <span className="font-mono text-[10px] text-slate-500">{pendingCount} pending</span>
          </div>

          {queue.length === 0 ? (
            <div className="p-6 text-center text-[12px] text-slate-600">No pending notifications</div>
          ) : (
            <div className="max-h-[400px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
              {queue.map(item => (
                <div key={item.filename} className="border-b border-[#1a2740] p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-amber-500/15 text-amber-400">APPROVAL</span>
                    <span className="font-mono text-[10px] text-slate-500">r/{item.subreddit}</span>
                    <span className="font-mono text-[10px] text-slate-600">{item.type}</span>
                  </div>
                  <div className="text-[12px] text-slate-300 leading-relaxed mb-2" style={{
                    display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}>
                    {item.content}
                  </div>
                  {item.context && (
                    <div className="text-[10px] text-slate-500 mb-2 italic">{item.context}</div>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAction(item.filename, 'approve')}
                      disabled={loading}
                      className="flex-1 py-1.5 rounded-lg bg-green-500/15 text-green-400 text-[11px] font-bold hover:bg-green-500/25 transition-colors disabled:opacity-50"
                    >
                      {'\u2713'} APPROVE
                    </button>
                    <button
                      onClick={() => handleAction(item.filename, 'reject')}
                      disabled={loading}
                      className="flex-1 py-1.5 rounded-lg bg-red-500/15 text-red-400 text-[11px] font-bold hover:bg-red-500/25 transition-colors disabled:opacity-50"
                    >
                      {'\u2717'} REJECT
                    </button>
                  </div>
                  <div className="font-mono text-[9px] text-slate-700 mt-1">
                    {formatAESTShort(item.submittedAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
