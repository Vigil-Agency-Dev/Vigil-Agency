'use client';

import React, { useState, useRef, useEffect } from 'react';

const VPS_API = process.env.NEXT_PUBLIC_VPS_ENDPOINT || 'https://ops.jr8ch.com';
const API_KEY = process.env.NEXT_PUBLIC_VIGIL_API_KEY || '';

interface SearchResult {
  score: number;
  payload?: {
    content?: string;
    source?: string;
    filename?: string;
    type?: string;
    timestamp?: string;
  };
}

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut: Ctrl+K to open
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  async function search() {
    if (!query.trim() || !API_KEY) return;
    setSearching(true);
    setResults([]);
    try {
      const res = await fetch(`${VPS_API}/api/nomad/search?q=${encodeURIComponent(query)}&limit=10`, {
        headers: { 'x-api-key': API_KEY },
      });
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
      }
    } catch { /* silent */ }
    setSearching(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#2a3550] bg-[#0a0f1a] hover:border-cyan-500/30 hover:bg-[#0d1520] transition-all text-[11px] text-slate-500 font-mono"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-500">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        Search intel...
        <span className="text-[9px] text-slate-600 border border-[#2a3550] rounded px-1 py-0.5">Ctrl+K</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[10vh] bg-black/60 backdrop-blur-sm">
      <div ref={containerRef} className="w-full max-w-2xl bg-[#0d1520] border border-[#2a3550] rounded-xl shadow-2xl overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1e2d44]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-cyan-400 flex-shrink-0">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') search(); }}
            placeholder="Semantic search across all VIGIL intel..."
            className="flex-1 bg-transparent text-sm text-slate-200 placeholder:text-slate-600 outline-none font-mono"
            autoFocus
          />
          {searching && <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />}
          <button onClick={() => setOpen(false)} className="text-[10px] text-slate-500 font-mono hover:text-slate-300">ESC</button>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {results.length === 0 && !searching && query && (
            <div className="p-6 text-center text-[12px] text-slate-600">
              {query ? 'No results. Try a different search term.' : 'Type a query and press Enter to search.'}
            </div>
          )}
          {results.length === 0 && !searching && !query && (
            <div className="p-6 text-center text-[12px] text-slate-600">
              Search across all ingested intelligence using NOMAD semantic search.
              <div className="mt-2 text-[10px] text-slate-700">Powered by Qdrant vector search</div>
            </div>
          )}
          {results.map((r, i) => {
            const content = r.payload?.content || '';
            const preview = content.slice(0, 200);
            const score = Math.round((r.score || 0) * 100);
            const isExpanded = expanded === i;

            return (
              <div
                key={i}
                className="border-b border-[#1a2740] px-4 py-3 hover:bg-white/[.02] cursor-pointer transition-colors"
                onClick={() => setExpanded(isExpanded ? null : i)}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded" style={{
                    background: score >= 70 ? 'rgba(16,185,129,0.1)' : score >= 50 ? 'rgba(245,158,11,0.1)' : 'rgba(100,116,139,0.1)',
                    color: score >= 70 ? '#10b981' : score >= 50 ? '#f59e0b' : '#64748b',
                  }}>
                    {score}% match
                  </span>
                  {r.payload?.source && <span className="font-mono text-[9px] text-slate-500">{r.payload.source}</span>}
                  {r.payload?.filename && <span className="font-mono text-[9px] text-slate-600">{r.payload.filename}</span>}
                  {r.payload?.type && <span className="font-mono text-[9px] text-cyan-500/50">{r.payload.type}</span>}
                </div>
                <div className="text-[12px] text-slate-300 leading-relaxed">
                  {isExpanded ? content : preview}{!isExpanded && content.length > 200 ? '...' : ''}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-[#1e2d44] flex items-center justify-between">
          <span className="text-[9px] text-slate-600 font-mono">NOMAD Semantic Search · Qdrant</span>
          <div className="flex gap-2">
            <span className="text-[9px] text-slate-600 font-mono">Enter to search</span>
            <span className="text-[9px] text-slate-600 font-mono">Esc to close</span>
          </div>
        </div>
      </div>
    </div>
  );
}
