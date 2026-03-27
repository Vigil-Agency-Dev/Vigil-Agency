'use client';

import React, { useState, useEffect, useRef } from 'react';

interface FeedItem {
  id: string;
  title: string;
  description: string;
  link: string;
  source: string;
  sourceTier: number;
  sourceIcon: string;
  pubDate: string;
  timestamp: number;
  relevance: {
    score: number;
    operations: string[];
    matchedKeywords: string[];
  };
  breaking: boolean;
}

const OP_LABELS: Record<string, { label: string; color: string }> = {
  'OP-001-lumen': { label: 'LUMEN', color: '#3b82f6' },
  'OP-002-epstein-uncovered': { label: 'EPSTEIN', color: '#f59e0b' },
  'OP-003-southern-cross': { label: 'STH CROSS', color: '#10b981' },
  'GLOBAL': { label: 'GLOBAL', color: '#64748b' },
};

function timeAgo(dateStr: string): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'NOW';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function stripHtml(str: string): string {
  return str.replace(/<[^>]+>/g, '').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();
}

export default function LiveIntelFeed() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lastFetch, setLastFetch] = useState<string>('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const tickerRef = useRef<HTMLDivElement>(null);

  const fetchFeed = async () => {
    try {
      const res = await fetch('/api/intel-feed?limit=30');
      if (!res.ok) throw new Error('Feed fetch failed');
      const data = await res.json();
      setItems(data.items || []);
      setLastFetch(data.meta?.fetchedAt || new Date().toISOString());
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
    const interval = setInterval(fetchFeed, 5 * 60 * 1000); // Refresh every 5 minutes
    return () => clearInterval(interval);
  }, []);

  const breakingItems = items.filter(i => i.breaking);
  const regularItems = items.filter(i => !i.breaking);

  return (
    <div className="animate-fadeIn bg-[#0d1520] border border-[#1e2d44] rounded-lg overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-[#111d2e] border-b border-[#1e2d44]">
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center w-5 h-5">
            <span className="absolute w-2 h-2 rounded-full bg-red-500 animate-ping opacity-75" />
            <span className="relative w-2 h-2 rounded-full bg-red-500" />
          </div>
          <span className="font-mono text-[13px] font-bold text-slate-200 tracking-wider">LIVE INTEL FEED</span>
          <span className="font-mono text-[11px] text-slate-500">
            {items.length} ITEMS • {new Set(items.map(i => i.source)).size} SOURCES
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[9px] text-slate-600">
            {lastFetch ? `UPD ${new Date(lastFetch).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}` : ''}
          </span>
          <button
            onClick={() => { setLoading(true); fetchFeed(); }}
            className="font-mono text-[9px] text-cyan-500 hover:text-cyan-400 transition-colors"
          >
            ↻ REFRESH
          </button>
        </div>
      </div>

      {/* Breaking news ticker */}
      {breakingItems.length > 0 && (
        <div
          className="relative overflow-hidden bg-red-950/30 border-b border-red-900/30 py-1.5 px-3"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div className="flex items-center gap-2">
            <span className="shrink-0 font-mono text-[9px] font-bold text-red-400 bg-red-500/20 px-1.5 py-0.5 rounded animate-pulse">
              ⚡ BREAKING
            </span>
            <div className="overflow-hidden flex-1">
              <div
                ref={tickerRef}
                className="whitespace-nowrap"
                style={{
                  animation: paused ? 'none' : `ticker ${Math.max(breakingItems.length * 12, 20)}s linear infinite`,
                }}
              >
                {breakingItems.map((item, i) => (
                  <a
                    key={item.id}
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mr-12 text-[11px] text-red-200 hover:text-white transition-colors"
                  >
                    <span className="text-red-400 font-semibold">{item.source}</span>
                    {' — '}
                    {item.title}
                    <span className="text-red-500/60 ml-2">{timeAgo(item.pubDate)}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading / Error states */}
      {loading && items.length === 0 && (
        <div className="flex items-center justify-center py-8">
          <div className="font-mono text-[11px] text-slate-500 animate-pulse">SCANNING INTEL SOURCES...</div>
        </div>
      )}

      {error && items.length === 0 && (
        <div className="flex items-center justify-center py-6">
          <div className="font-mono text-[11px] text-red-400">⚠ FEED OFFLINE — CHECK CONNECTION</div>
        </div>
      )}

      {/* Main feed - scrollable vertical list */}
      {regularItems.length > 0 && (
        <div className="max-h-[320px] overflow-y-auto custom-scrollbar">
          {regularItems.map((item) => (
            <div
              key={item.id}
              className={`border-b border-[#1a2740]/60 transition-colors ${
                expanded === item.id ? 'bg-[#131f30]' : 'hover:bg-[#111a28]'
              }`}
            >
              {/* Item row */}
              <div
                className="flex items-start gap-2.5 px-3.5 py-2 cursor-pointer"
                onClick={() => setExpanded(expanded === item.id ? null : item.id)}
              >
                {/* Relevance indicator */}
                <div className="shrink-0 mt-1 flex flex-col items-center gap-0.5">
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      backgroundColor: item.relevance.score >= 8 ? '#ef4444' : item.relevance.score >= 5 ? '#f59e0b' : '#3b82f6',
                      boxShadow: item.relevance.score >= 8 ? '0 0 6px rgba(239,68,68,0.5)' : 'none',
                    }}
                  />
                  <span className="font-mono text-[10px] text-slate-600">{item.relevance.score}</span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="font-mono text-[11px] text-slate-500">{item.sourceIcon} {item.source}</span>
                    <span className="font-mono text-[11px] text-slate-600">•</span>
                    <span className="font-mono text-[11px] text-slate-600">{timeAgo(item.pubDate)}</span>
                    {/* Operation tags */}
                    {item.relevance.operations.map(op => {
                      const opInfo = OP_LABELS[op];
                      if (!opInfo) return null;
                      return (
                        <span
                          key={op}
                          className="font-mono text-[10px] px-1.5 py-0.5 rounded"
                          style={{
                            color: opInfo.color,
                            backgroundColor: `${opInfo.color}15`,
                            border: `1px solid ${opInfo.color}30`,
                          }}
                        >
                          {opInfo.label}
                        </span>
                      );
                    })}
                  </div>
                  <div className="text-[14px] text-slate-200 leading-snug line-clamp-2">{stripHtml(item.title)}</div>
                </div>

                {/* Expand indicator */}
                <span className="shrink-0 text-[10px] text-slate-600 mt-1">
                  {expanded === item.id ? '▾' : '▸'}
                </span>
              </div>

              {/* Expanded detail */}
              {expanded === item.id && (
                <div className="px-3.5 pb-2.5 pl-8">
                  <p className="text-[13px] text-slate-400 leading-relaxed mb-2">{stripHtml(item.description)}</p>
                  <div className="flex items-center gap-3">
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[11px] text-cyan-500 hover:text-cyan-400"
                    >
                      OPEN SOURCE ↗
                    </a>
                    {item.relevance.matchedKeywords.length > 0 && (
                      <span className="font-mono text-[11px] text-slate-600">
                        MATCHED: {item.relevance.matchedKeywords.slice(0, 5).join(', ')}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Ticker animation + scrollbar styles */}
      <style jsx>{`
        @keyframes ticker {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1e2d44;
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #2a3f5f;
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}
