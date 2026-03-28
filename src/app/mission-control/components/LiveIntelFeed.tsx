'use client';

import React, { useState, useEffect } from 'react';

interface FeedItem {
  id: string;
  timestamp: string;
  source: string;
  content: string;
  priority: string;
  findings: string[];
  heartbeat: number | null;
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function priorityColor(p: string) {
  if (p === 'CRITICAL') return '#ef4444';
  if (p === 'ELEVATED') return '#f97316';
  if (p === 'HIGH') return '#f59e0b';
  return '#3b82f6';
}

const VPS_API = process.env.NEXT_PUBLIC_VPS_ENDPOINT || 'https://ops.jr8ch.com';
const API_KEY = process.env.NEXT_PUBLIC_VIGIL_API_KEY || '';

export default function LiveIntelFeed() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState('');

  const fetchFeed = async () => {
    try {
      const res = await fetch(`${VPS_API}/api/mission/intel?limit=20`, { headers: { 'x-api-key': API_KEY } });
      if (!res.ok) throw new Error('Feed fetch failed');
      const data = await res.json();
      const reports = data.reports || [];
      setItems(reports.filter((r: any) => !r.error).map((r: any) => ({
        id: r.filename || `report-${Math.random()}`,
        timestamp: r.timestamp || r.modified || '',
        source: r.heartbeat ? `ClarionAgent HB #${r.heartbeat}` : 'ClarionAgent',
        content: r.findings?.length > 0 ? r.findings[0] : `Intel report: ${r.filename}`,
        priority: r.priority || 'LOW',
        findings: r.findings || [],
        heartbeat: r.heartbeat || null,
      })));
      setLastFetch(new Date().toISOString());
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
    const interval = setInterval(fetchFeed, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="animate-fadeIn bg-[#0d1520] border border-[#1e2d44] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-[#111d2e] border-b border-[#1e2d44]">
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center w-5 h-5">
            <span className="absolute w-2 h-2 rounded-full bg-red-500 animate-ping opacity-75" />
            <span className="relative w-2 h-2 rounded-full bg-red-500" />
          </div>
          <span className="font-mono text-[13px] font-bold text-slate-200 tracking-wider">LIVE INTEL FEED</span>
          <span className="font-mono text-[11px] text-slate-500">{items.length} REPORTS</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[9px] text-slate-600">
            {lastFetch ? `UPD ${new Date(lastFetch).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}` : ''}
          </span>
          <button onClick={() => { setLoading(true); fetchFeed(); }} className="font-mono text-[9px] text-cyan-500 hover:text-cyan-400 transition-colors">
            {'\u21BB'} REFRESH
          </button>
        </div>
      </div>

      {/* Loading / Error */}
      {loading && items.length === 0 && (
        <div className="flex items-center justify-center py-8">
          <div className="font-mono text-[11px] text-slate-500 animate-pulse">SCANNING INTEL SOURCES...</div>
        </div>
      )}
      {error && items.length === 0 && (
        <div className="flex items-center justify-center py-6">
          <div className="font-mono text-[11px] text-red-400">{'\u26A0'} FEED OFFLINE</div>
        </div>
      )}

      {/* Feed items */}
      {items.length > 0 && (
        <div className="max-h-[320px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
          {items.map(item => (
            <div
              key={item.id}
              className={`border-b border-[#1a2740]/60 transition-colors ${expanded === item.id ? 'bg-[#131f30]' : 'hover:bg-[#111a28]'}`}
            >
              <div
                className="flex items-start gap-2.5 px-3.5 py-2 cursor-pointer"
                onClick={() => setExpanded(expanded === item.id ? null : item.id)}
              >
                <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: priorityColor(item.priority) }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="font-mono text-[11px] text-slate-400">{item.source}</span>
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded" style={{
                      color: priorityColor(item.priority),
                      background: `${priorityColor(item.priority)}15`,
                    }}>{item.priority}</span>
                    {item.timestamp && <span className="font-mono text-[10px] text-slate-600">{timeAgo(item.timestamp)}</span>}
                  </div>
                  <div className="text-[13px] text-slate-200 leading-snug" style={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>{item.content}</div>
                </div>
                <span className="shrink-0 text-[10px] text-slate-600 mt-1">{expanded === item.id ? '\u25BE' : '\u25B8'}</span>
              </div>

              {/* Expanded findings */}
              {expanded === item.id && item.findings.length > 0 && (
                <div className="px-3.5 pb-3 pl-8">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Findings ({item.findings.length})</div>
                  {item.findings.slice(0, 8).map((f, i) => (
                    <div key={i} className="text-[12px] text-slate-400 py-1 pl-2 border-l-2 border-[#2a3550] mb-0.5 leading-relaxed">{f}</div>
                  ))}
                  {item.findings.length > 8 && (
                    <div className="text-[11px] text-slate-600 mt-1">+{item.findings.length - 8} more findings</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
