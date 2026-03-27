'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  getNomadStatus,
  searchIntel,
  getCollections,
  type NomadStatus,
  type SearchResult,
  type CollectionInfo,
} from '../../lib/nomad-client';

// ===================== CONFIG =====================

const CYBERCHEF_URL = 'https://ops.jr8ch.com:8082'; // CyberChef container
const FLATNOTES_URL = 'https://ops.jr8ch.com:8083'; // FlatNotes container
const KIWIX_URL = 'https://ops.jr8ch.com:8084';     // Kiwix container
const MAPS_URL = 'https://ops.jr8ch.com:8085';       // ProtoMaps container

// ===================== MODULE DEFINITIONS =====================

interface OracleModule {
  id: string;
  name: string;
  icon: string;
  subtitle: string;
  description: string;
  status: 'online' | 'offline' | 'coming-soon';
  accent: string;
}

const MODULES: OracleModule[] = [
  {
    id: 'search',
    name: 'ORACLE Search',
    icon: '\u{1F52E}',
    subtitle: 'Powered by Qdrant',
    description: 'Semantic search across all VIGIL intel archives — dead-drops, MERIDIAN briefings, threat registers, and operation documents',
    status: 'online',
    accent: '#8b5cf6',
  },
  {
    id: 'knowledge',
    name: 'Knowledge Base',
    icon: '\u{1F4DA}',
    subtitle: 'RAG Document Store',
    description: 'Upload documents to your intelligence knowledge base for AI-powered retrieval and cross-referencing',
    status: 'online',
    accent: '#06b6d4',
  },
  {
    id: 'ai-assistant',
    name: 'AI Assistant',
    icon: '\u{1F916}',
    subtitle: 'Powered by Ollama',
    description: 'Local AI chat that runs entirely on VIGIL infrastructure — no internet required. Query intel, analyse patterns, generate reports',
    status: 'coming-soon',
    accent: '#10b981',
  },
  {
    id: 'library',
    name: 'Information Library',
    icon: '\u{1F4D6}',
    subtitle: 'Powered by Kiwix',
    description: 'Offline access to Wikipedia, medical references, how-to guides, and encyclopedias — the knowledge bunker',
    status: 'online',
    accent: '#f59e0b',
  },
  {
    id: 'cyberchef',
    name: 'CyberChef',
    icon: '\u{1F6E1}\uFE0F',
    subtitle: 'Data Analysis Toolkit',
    description: 'Encryption, encoding, hashing, data extraction and analysis. The Swiss Army knife for OSINT document processing',
    status: 'online',
    accent: '#ef4444',
  },
  {
    id: 'maps',
    name: 'Offline Maps',
    icon: '\u{1F5FA}\uFE0F',
    subtitle: 'Powered by ProtoMaps',
    description: 'Offline regional maps with search and navigation — operational planning when networks go dark',
    status: 'online',
    accent: '#3b82f6',
  },
  {
    id: 'notes',
    name: 'Field Notes',
    icon: '\u{1F4DD}',
    subtitle: 'Powered by FlatNotes',
    description: 'Markdown-based operational notes. Secure local storage, no cloud sync, no telemetry',
    status: 'online',
    accent: '#64748b',
  },
  {
    id: 'status',
    name: 'System Status',
    icon: '\u{2699}\uFE0F',
    subtitle: 'NOMAD Health',
    description: 'Monitor all NOMAD containers, Qdrant collection health, ingestion pipeline, and VPS resource usage',
    status: 'online',
    accent: '#06b6d4',
  },
];

// ===================== SCORE HELPERS =====================

function scoreColor(score: number): string {
  if (score >= 0.8) return '#ef4444';
  if (score >= 0.6) return '#f59e0b';
  if (score >= 0.4) return '#3b82f6';
  return '#64748b';
}

function scoreLabel(score: number): string {
  if (score >= 0.8) return 'CRITICAL';
  if (score >= 0.6) return 'HIGH';
  if (score >= 0.4) return 'MEDIUM';
  return 'LOW';
}

function categoryIcon(category: string): string {
  const map: Record<string, string> = {
    'intel-report': '\u{1F4E1}',
    'strategy': '\u{1F3AF}',
    'threat-assessment': '\u{26A0}\uFE0F',
    'dead-drop': '\u{1F4E6}',
    'briefing': '\u{1F4CB}',
    'pattern-match': '\u{1F517}',
    'cyber-threat': '\u{1F6E1}\uFE0F',
    'osint': '\u{1F50D}',
  };
  return map[category] || '\u{1F4C4}';
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'NOW';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ===================== MODULE TILE =====================

function ModuleTile({
  module,
  active,
  onClick,
}: {
  module: OracleModule;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="text-left p-4 rounded-xl border transition-all group relative overflow-hidden"
      style={{
        background: active ? `${module.accent}10` : '#111b2a',
        borderColor: active ? `${module.accent}50` : '#1e2d44',
        borderTop: `2px solid ${active ? module.accent : '#1e2d44'}`,
      }}
    >
      {/* Status dot */}
      <div className="absolute top-3 right-3">
        <span
          className="block w-2 h-2 rounded-full"
          style={{
            backgroundColor:
              module.status === 'online'
                ? '#10b981'
                : module.status === 'coming-soon'
                ? '#f59e0b'
                : '#ef4444',
            boxShadow:
              module.status === 'online' ? '0 0 6px rgba(16,185,129,.4)' : 'none',
          }}
        />
      </div>

      {/* Icon */}
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center text-xl mb-3"
        style={{ background: `${module.accent}15` }}
      >
        {module.icon}
      </div>

      {/* Title */}
      <div className="text-[13px] font-semibold text-slate-200 mb-0.5">{module.name}</div>
      <div
        className="font-mono text-[9px] mb-2"
        style={{ color: module.accent }}
      >
        {module.subtitle}
      </div>

      {/* Description */}
      <div className="text-[11px] text-slate-500 leading-relaxed">{module.description}</div>

      {/* Coming soon overlay */}
      {module.status === 'coming-soon' && (
        <div className="absolute inset-0 bg-[#060a12]/60 flex items-center justify-center rounded-xl">
          <span
            className="font-mono text-[10px] font-bold tracking-wider py-1 px-3 rounded"
            style={{ background: 'rgba(245,158,11,.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,.3)' }}
          >
            PHASE 2
          </span>
        </div>
      )}
    </button>
  );
}

// ===================== SEARCH PANEL =====================

function SearchPanel() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastQuery, setLastQuery] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSearch = async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    setLastQuery(q);
    try {
      const res = await searchIntel(q, 20, 0.3);
      setResults(res.results);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Search input */}
      <form
        onSubmit={(e) => { e.preventDefault(); handleSearch(query); }}
        className="mb-4"
      >
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none">
              {'\u{1F50D}'}
            </div>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder='Query the VIGIL intel archive... (e.g. "Epstein flight logs", "narrative control patterns")'
              className="w-full bg-[#0d1520] border border-[#2a3550] rounded-lg py-3 pl-10 pr-4 text-[13px] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            />
            {loading && (
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-5 rounded-lg font-mono text-[11px] font-bold tracking-wider transition-all disabled:opacity-30 text-white"
            style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}
          >
            {loading ? 'SCANNING...' : 'QUERY'}
          </button>
        </div>

        {/* Quick queries */}
        <div className="flex gap-2 mt-2.5 flex-wrap">
          {[
            'Epstein network connections',
            'narrative control tactics',
            'institutional cover-up patterns',
            'dead-drop latest intel',
            'SCOUT cluster threat',
            'sentiment engineering',
          ].map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => { setQuery(q); handleSearch(q); }}
              className="py-1 px-2.5 rounded text-[10px] text-slate-500 hover:text-purple-400 transition-colors"
              style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)' }}
            >
              {q}
            </button>
          ))}
        </div>
      </form>

      {/* Error */}
      {error && (
        <div
          className="py-2.5 px-3.5 rounded-lg mb-4 text-[11px]"
          style={{ background: 'rgba(239,68,68,.06)', border: '1px solid rgba(239,68,68,.2)' }}
        >
          <span className="font-mono text-red-400">QUERY FAILED:</span>{' '}
          <span className="text-slate-400">{error}</span>
        </div>
      )}

      {/* Results header */}
      {lastQuery && !loading && (
        <div className="flex items-center gap-2 mb-3">
          <span className="font-mono text-[11px] text-slate-500">
            RESULTS FOR: <span className="text-purple-400">&quot;{lastQuery}&quot;</span>
          </span>
          <span
            className="font-mono text-[10px] py-0.5 px-2 rounded"
            style={{ background: 'rgba(139,92,246,.1)', border: '1px solid rgba(139,92,246,.2)', color: '#8b5cf6' }}
          >
            {results.length} MATCHES
          </span>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="max-h-[500px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
          {results.map((r, i) => {
            const color = scoreColor(r.score);
            const isExpanded = expanded === r.id;
            return (
              <div
                key={r.id}
                className="bg-[#0d1520] border border-[#1e2d44] rounded-lg overflow-hidden mb-2.5 cursor-pointer transition-all hover:border-[#2a3f5f]"
                onClick={() => setExpanded(isExpanded ? null : r.id)}
                style={{ borderLeft: `3px solid ${color}` }}
              >
                <div className="flex items-start gap-3 p-3.5">
                  <div className="shrink-0 flex flex-col items-center gap-1 min-w-[36px]">
                    <span className="font-mono text-[10px] text-slate-600">#{i + 1}</span>
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center font-mono text-[11px] font-bold"
                      style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}
                    >
                      {(r.score * 100).toFixed(0)}
                    </div>
                    <span className="font-mono text-[8px]" style={{ color }}>{scoreLabel(r.score)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm">{categoryIcon(r.category)}</span>
                      <span className="font-mono text-[10px] text-cyan-400 uppercase">{r.source}</span>
                      <span className="text-[10px] text-slate-600">{'\u2022'}</span>
                      <span className="font-mono text-[10px] text-slate-500">{r.category}</span>
                      <span className="text-[10px] text-slate-600">{'\u2022'}</span>
                      <span className="font-mono text-[10px] text-slate-600">{timeAgo(r.timestamp)}</span>
                    </div>
                    <div className="text-[13px] text-slate-200 leading-snug font-medium mb-1.5">{r.title}</div>
                    <div className={`text-[11px] text-slate-400 leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}>
                      {r.content}
                    </div>
                    {r.tags?.length > 0 && (
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        {r.tags.map((tag) => (
                          <span
                            key={tag}
                            className="font-mono text-[9px] py-0.5 px-1.5 rounded"
                            style={{ background: 'rgba(139,92,246,.08)', border: '1px solid rgba(139,92,246,.15)', color: '#c4b5fd' }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    {isExpanded && r.confidence != null && (
                      <div className="mt-3 flex items-center gap-2">
                        <span className="font-mono text-[9px] text-slate-500">CONFIDENCE:</span>
                        <div className="flex-1 max-w-[200px] h-1.5 bg-[#060a12] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${r.confidence * 100}%`, background: `linear-gradient(90deg, ${color}, ${color}88)` }}
                          />
                        </div>
                        <span className="font-mono text-[9px]" style={{ color }}>{(r.confidence * 100).toFixed(0)}%</span>
                      </div>
                    )}
                  </div>
                  <span className="shrink-0 text-[10px] text-slate-600 mt-1">{isExpanded ? '\u25BE' : '\u25B8'}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty / initial states */}
      {lastQuery && !loading && results.length === 0 && !error && (
        <div className="text-center py-12">
          <div className="text-3xl mb-3">{'\u{1F50D}'}</div>
          <div className="font-mono text-[12px] text-slate-400 mb-1">NO MATCHES FOUND</div>
          <div className="text-[11px] text-slate-600">Try broader terms or check that intel has been ingested.</div>
        </div>
      )}
      {!lastQuery && !loading && (
        <div className="text-center py-10">
          <div className="text-3xl mb-3">{'\u{1F52E}'}</div>
          <div className="font-mono text-[12px] text-slate-400 mb-1">ORACLE SEARCH READY</div>
          <div className="text-[11px] text-slate-600">Enter a query to search across all VIGIL intelligence archives.</div>
        </div>
      )}

      <style jsx>{`
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

// ===================== KNOWLEDGE BASE PANEL =====================

function KnowledgeBasePanel({ collections }: { collections: CollectionInfo[] }) {
  return (
    <div>
      <div className="text-[11px] text-slate-500 mb-4 leading-relaxed">
        Browse and manage documents indexed in the VIGIL intelligence knowledge base.
        Documents are vectorized and available for semantic search via ORACLE Search.
      </div>

      {/* Collection cards */}
      <div className="grid grid-cols-1 gap-3 mb-4">
        {collections.length > 0 ? collections.map((c) => (
          <div
            key={c.name}
            className="p-4 rounded-lg border border-[#1e2d44]"
            style={{ background: '#0d1520' }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm">{'\u{1F4C1}'}</span>
                <span className="font-mono text-[12px] text-slate-200 font-semibold">{c.name}</span>
              </div>
              <span
                className="font-mono text-[9px] py-0.5 px-2 rounded"
                style={{
                  background: c.status === 'green' ? 'rgba(16,185,129,.1)' : 'rgba(245,158,11,.1)',
                  color: c.status === 'green' ? '#10b981' : '#f59e0b',
                  border: `1px solid ${c.status === 'green' ? 'rgba(16,185,129,.25)' : 'rgba(245,158,11,.25)'}`,
                }}
              >
                {c.status?.toUpperCase() || 'UNKNOWN'}
              </span>
            </div>
            <div className="flex gap-4">
              <div className="text-[11px]">
                <span className="text-slate-500">Vectors: </span>
                <span className="font-mono text-cyan-400">{c.vectors_count}</span>
              </div>
              <div className="text-[11px]">
                <span className="text-slate-500">Points: </span>
                <span className="font-mono text-purple-400">{c.points_count}</span>
              </div>
            </div>
          </div>
        )) : (
          <div className="text-center py-8 text-[11px] text-slate-600 font-mono">
            NO COLLECTIONS FOUND — Check Qdrant connection
          </div>
        )}
      </div>

      {/* Ingestion status */}
      <div className="p-3 rounded-lg border border-[#1e2d44] bg-[#0d1520]">
        <div className="font-mono text-[10px] text-slate-500 uppercase mb-1">Auto-Ingestion Pipeline</div>
        <div className="text-[11px] text-slate-400">
          Dead-drop files are automatically scanned and ingested every 15 minutes via cron.
          Manual ingestion available via <span className="font-mono text-cyan-400">POST /api/nomad/ingest</span>
        </div>
      </div>
    </div>
  );
}

// ===================== EXTERNAL SERVICE PANEL =====================

function ExternalServicePanel({
  name,
  description,
  url,
  icon,
}: {
  name: string;
  description: string;
  url: string;
  icon: string;
}) {
  return (
    <div className="text-center py-10">
      <div className="text-4xl mb-4">{icon}</div>
      <div className="font-mono text-[14px] text-slate-200 mb-2 font-semibold">{name}</div>
      <div className="text-[12px] text-slate-500 mb-6 max-w-md mx-auto leading-relaxed">{description}</div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block py-2.5 px-6 rounded-lg font-mono text-[11px] font-bold tracking-wider text-white transition-all hover:opacity-90"
        style={{ background: 'linear-gradient(135deg, #3b82f6, #06b6d4)' }}
      >
        OPEN {name.toUpperCase()} {'\u2197'}
      </a>
      <div className="mt-4 text-[10px] text-slate-600 font-mono">
        Running on vigil-ops-01 — SSH tunnel required for external access
      </div>
    </div>
  );
}

// ===================== SYSTEM STATUS PANEL =====================

function SystemStatusPanel({ status, collections }: { status: NomadStatus | null; collections: CollectionInfo[] }) {
  const isHealthy = status?.status === 'healthy';

  return (
    <div>
      {/* Overall health */}
      <div
        className="p-4 rounded-lg border mb-4"
        style={{
          background: isHealthy ? 'rgba(16,185,129,.04)' : 'rgba(239,68,68,.04)',
          borderColor: isHealthy ? 'rgba(16,185,129,.2)' : 'rgba(239,68,68,.2)',
        }}
      >
        <div className="flex items-center gap-3 mb-3">
          <span
            className="w-3 h-3 rounded-full"
            style={{
              backgroundColor: isHealthy ? '#10b981' : '#ef4444',
              boxShadow: `0 0 8px ${isHealthy ? 'rgba(16,185,129,.5)' : 'rgba(239,68,68,.5)'}`,
            }}
          />
          <span className="font-mono text-[14px] font-bold" style={{ color: isHealthy ? '#10b981' : '#ef4444' }}>
            NOMAD {isHealthy ? 'OPERATIONAL' : 'DEGRADED'}
          </span>
        </div>
        {status && (
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="font-mono text-[10px] text-slate-500 mb-0.5">COLLECTIONS</div>
              <div className="font-mono text-[18px] text-cyan-400">{status.qdrant.collections}</div>
            </div>
            <div>
              <div className="font-mono text-[10px] text-slate-500 mb-0.5">INDEXED DOCS</div>
              <div className="font-mono text-[18px] text-purple-400">{status.qdrant.vigil_intel_docs}</div>
            </div>
            <div>
              <div className="font-mono text-[10px] text-slate-500 mb-0.5">STORAGE</div>
              <div className="font-mono text-[18px] text-blue-400">{status.qdrant.storage_gb} GB</div>
            </div>
          </div>
        )}
      </div>

      {/* Service list */}
      <div className="font-mono text-[10px] text-slate-500 uppercase mb-2">Container Status</div>
      <div className="space-y-2">
        {[
          { name: 'Qdrant Vector DB', port: '6333', status: 'online' },
          { name: 'CyberChef', port: '8082', status: 'online' },
          { name: 'FlatNotes', port: '8083', status: 'online' },
          { name: 'Kiwix Library', port: '8084', status: 'online' },
          { name: 'ProtoMaps', port: '8085', status: 'coming-soon' },
          { name: 'Ollama AI', port: '11434', status: 'coming-soon' },
        ].map((svc) => (
          <div
            key={svc.name}
            className="flex items-center justify-between p-2.5 rounded-lg border border-[#1e2d44] bg-[#0d1520]"
          >
            <div className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor: svc.status === 'online' ? '#10b981' : svc.status === 'coming-soon' ? '#f59e0b' : '#ef4444',
                }}
              />
              <span className="text-[11px] text-slate-300">{svc.name}</span>
            </div>
            <span className="font-mono text-[10px] text-slate-600">:{svc.port}</span>
          </div>
        ))}
      </div>

      {/* Collection details */}
      {collections.length > 0 && (
        <div className="mt-4">
          <div className="font-mono text-[10px] text-slate-500 uppercase mb-2">Collections</div>
          {collections.map((c) => (
            <div key={c.name} className="p-2.5 rounded-lg border border-[#1e2d44] bg-[#0d1520] mb-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] text-slate-300">{c.name}</span>
                <span
                  className="font-mono text-[9px] py-0.5 px-2 rounded"
                  style={{
                    background: c.status === 'green' ? 'rgba(16,185,129,.1)' : 'rgba(245,158,11,.1)',
                    color: c.status === 'green' ? '#10b981' : '#f59e0b',
                  }}
                >
                  {c.status?.toUpperCase()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ===================== AI ASSISTANT PANEL (Phase 2) =====================

function AIAssistantPanel() {
  return (
    <div className="text-center py-12">
      <div className="text-4xl mb-4">{'\u{1F916}'}</div>
      <div className="font-mono text-[14px] text-slate-200 mb-2 font-semibold">AI ASSISTANT</div>
      <div className="text-[12px] text-slate-500 mb-4 max-w-md mx-auto leading-relaxed">
        Local LLM powered by Ollama — chat with your intelligence archive, generate analysis reports,
        and ask natural language questions about cross-operation patterns. Zero cloud dependency.
      </div>
      <span
        className="inline-block font-mono text-[11px] font-bold tracking-wider py-2 px-4 rounded-lg"
        style={{ background: 'rgba(245,158,11,.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,.25)' }}
      >
        COMING IN PHASE 2
      </span>
      <div className="mt-4 text-[10px] text-slate-600">
        Requires VPS upgrade to 16GB RAM or local Ollama tunnel
      </div>
    </div>
  );
}

// ===================== MAIN COMPONENT =====================

export default function OracleTab() {
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [status, setStatus] = useState<NomadStatus | null>(null);
  const [collections, setCollections] = useState<CollectionInfo[]>([]);
  const [statusError, setStatusError] = useState(false);

  // Fetch NOMAD status on mount
  useEffect(() => {
    async function fetchStatus() {
      try {
        const [s, c] = await Promise.all([getNomadStatus(), getCollections()]);
        setStatus(s);
        setCollections(c.collections || []);
        setStatusError(false);
      } catch {
        setStatusError(true);
      }
    }
    fetchStatus();
    const interval = setInterval(fetchStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  // Render active module panel
  const renderPanel = () => {
    switch (activeModule) {
      case 'search':
        return <SearchPanel />;
      case 'knowledge':
        return <KnowledgeBasePanel collections={collections} />;
      case 'ai-assistant':
        return <AIAssistantPanel />;
      case 'library':
        return (
          <ExternalServicePanel
            name="Information Library"
            description="Offline access to Wikipedia, medical references, survival guides, and encyclopedias. Powered by Kiwix — the knowledge bunker for when networks go dark."
            url={KIWIX_URL}
            icon={'\u{1F4D6}'}
          />
        );
      case 'cyberchef':
        return (
          <ExternalServicePanel
            name="CyberChef"
            description="Encryption, encoding, hashing, data extraction and format conversion. The Swiss Army knife for OSINT document processing and signal intelligence analysis."
            url={CYBERCHEF_URL}
            icon={'\u{1F6E1}\uFE0F'}
          />
        );
      case 'maps':
        return (
          <ExternalServicePanel
            name="Offline Maps"
            description="Regional maps with search and navigation capabilities. Operational planning when networks are compromised or unavailable."
            url={MAPS_URL}
            icon={'\u{1F5FA}\uFE0F'}
          />
        );
      case 'notes':
        return (
          <ExternalServicePanel
            name="Field Notes"
            description="Markdown-based operational notes with local-only storage. No cloud sync, no telemetry, no data leakage. Your field notes stay on VIGIL infrastructure."
            url={FLATNOTES_URL}
            icon={'\u{1F4DD}'}
          />
        );
      case 'status':
        return <SystemStatusPanel status={status} collections={collections} />;
      default:
        return null;
    }
  };

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-gradient-to-br from-purple-600 to-indigo-600">
            {'\u{1F52E}'}
          </div>
          <div>
            <h2
              className="text-[16px] font-bold tracking-[.12em] text-purple-400"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              O.R.A.C.L.E.
            </h2>
            <div className="text-[10px] text-slate-500">
              Operational Research &amp; Cross-Linked Evidence — Powered by NOMAD
            </div>
          </div>
          {/* Status indicator */}
          <div className="ml-auto flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{
                backgroundColor: statusError ? '#ef4444' : '#10b981',
                boxShadow: statusError ? '0 0 6px rgba(239,68,68,.4)' : '0 0 6px rgba(16,185,129,.4)',
              }}
            />
            <span className="font-mono text-[10px]" style={{ color: statusError ? '#ef4444' : '#10b981' }}>
              {statusError ? 'OFFLINE' : 'CONNECTED'}
            </span>
            {status?.qdrant && (
              <span className="font-mono text-[10px] text-slate-600">
                {'\u2022'} {status.qdrant.vigil_intel_docs} docs indexed
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Module Grid — NOMAD Command Center style */}
      {activeModule === null && (
        <div className="grid grid-cols-4 gap-3 mb-5">
          {MODULES.map((mod) => (
            <ModuleTile
              key={mod.id}
              module={mod}
              active={false}
              onClick={() => {
                if (mod.status !== 'coming-soon') setActiveModule(mod.id);
              }}
            />
          ))}
        </div>
      )}

      {/* Active module panel */}
      {activeModule !== null && (
        <div>
          {/* Back button + module header */}
          <button
            onClick={() => setActiveModule(null)}
            className="flex items-center gap-2 mb-4 text-[11px] text-slate-500 hover:text-purple-400 transition-colors font-mono"
          >
            {'\u2190'} BACK TO COMMAND CENTER
          </button>

          <div
            className="bg-[#111b2a] border border-[#1e2d44] rounded-xl p-5"
            style={{ borderTop: `2px solid ${MODULES.find(m => m.id === activeModule)?.accent || '#8b5cf6'}` }}
          >
            {/* Module title bar */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">{MODULES.find(m => m.id === activeModule)?.icon}</span>
              <h3 className="text-[13px] font-semibold text-slate-200 uppercase tracking-wider">
                {MODULES.find(m => m.id === activeModule)?.name}
              </h3>
              <span
                className="font-mono text-[9px] ml-auto"
                style={{ color: MODULES.find(m => m.id === activeModule)?.accent }}
              >
                {MODULES.find(m => m.id === activeModule)?.subtitle}
              </span>
            </div>

            {renderPanel()}
          </div>
        </div>
      )}
    </div>
  );
}
