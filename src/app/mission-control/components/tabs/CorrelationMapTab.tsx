'use client';

import React, { useState, useEffect } from 'react';
import { Badge, Dot } from '../ui';
import { formatAESTShort } from '../../lib/date-utils';

const VPS_API = process.env.NEXT_PUBLIC_VPS_ENDPOINT || 'https://ops.jr8ch.com';
const API_KEY = process.env.NEXT_PUBLIC_VIGIL_API_KEY || '';

interface CorrelationNode {
  id: string;
  label: string;
  type: 'threat' | 'hypothesis' | 'pattern' | 'entity';
  severity?: string;
  status?: string;
  detail?: string;
  raw?: string;
  crossRefs: string[];
  filename?: string;
}

const TYPE_COLORS: Record<string, string> = {
  threat: '#ef4444',
  hypothesis: '#8b5cf6',
  pattern: '#10b981',
  entity: '#f59e0b',
};

const TYPE_ICONS: Record<string, string> = {
  threat: '\u26A0\uFE0F',
  hypothesis: '\uD83E\uDD14',
  pattern: '\uD83D\uDD17',
  entity: '\uD83C\uDFAD',
};

function renderMarkdown(raw: string) {
  return raw.split('\n').map((line, i) => {
    const t = line.trim();
    if (!t) return <div key={i} className="h-1.5" />;
    if (t.startsWith('# ')) return <h2 key={i} className="text-sm font-bold text-cyan-400 mt-3 mb-1.5">{t.slice(2)}</h2>;
    if (t.startsWith('## ')) return <h3 key={i} className="text-[13px] font-bold text-slate-200 mt-2 mb-1 border-b border-[#2a3550] pb-1">{t.slice(3)}</h3>;
    if (t.startsWith('### ')) return <h4 key={i} className="text-[12px] font-semibold text-purple-400 mt-2 mb-1">{t.slice(4)}</h4>;
    if (t.startsWith('- ') || t.startsWith('* ')) {
      return <div key={i} className="flex items-start gap-2 text-[11px] text-slate-400 pl-2 py-0.5"><span className="text-slate-600 mt-0.5">{'\u25B8'}</span><span>{t.slice(2)}</span></div>;
    }
    if (t.startsWith('---')) return <hr key={i} className="border-[#2a3550] my-2" />;
    const rendered = t.replace(/\*\*([^*]+)\*\*/g, '<b class="text-slate-200 font-semibold">$1</b>');
    return <div key={i} className="text-[11px] text-slate-400 leading-relaxed py-0.5" dangerouslySetInnerHTML={{ __html: rendered }} />;
  });
}

export default function CorrelationMapTab() {
  const [isLive, setIsLive] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [nodes, setNodes] = useState<CorrelationNode[]>([]);
  const [filter, setFilter] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showDoc, setShowDoc] = useState<string | null>(null);
  const [docContent, setDocContent] = useState<string | null>(null);
  const [loadingDoc, setLoadingDoc] = useState(false);

  useEffect(() => {
    if (!API_KEY) return;

    async function load() {
      try {
        const [threatsRes, hyposRes, patternsRes, entitiesRes] = await Promise.all([
          fetch(`${VPS_API}/api/mission/threats`, { headers: { 'x-api-key': API_KEY } }),
          fetch(`${VPS_API}/api/mission/hypotheses`, { headers: { 'x-api-key': API_KEY } }),
          fetch(`${VPS_API}/api/mission/patterns`, { headers: { 'x-api-key': API_KEY } }),
          fetch(`${VPS_API}/api/mission/shared-entities`, { headers: { 'x-api-key': API_KEY } }).catch(() => null),
        ]);

        const allNodes: CorrelationNode[] = [];

        if (threatsRes.ok) {
          const data = await threatsRes.json();
          for (const t of (data.threats || [])) {
            allNodes.push({
              id: t.id || `T-${allNodes.length}`,
              label: t.name || t.id,
              type: 'threat',
              severity: t.severity,
              status: t.status,
              detail: t.detail || '',
              crossRefs: [],
              filename: t.source,
            });
          }
        }

        if (hyposRes.ok) {
          const data = await hyposRes.json();
          for (const h of (data.hypotheses || [])) {
            allNodes.push({
              id: h.id || `H-${allNodes.length}`,
              label: h.title || h.id || 'Hypothesis',
              type: 'hypothesis',
              status: h.status,
              detail: h.classification || '',
              raw: h.raw || '',
              crossRefs: Array.isArray(h.crossRef) ? h.crossRef : [],
              filename: h.filename,
            });
          }
        }

        if (patternsRes.ok) {
          const data = await patternsRes.json();
          for (const p of (data.patterns || [])) {
            const crossRefs: string[] = [];
            if (p.linked_hypothesis) crossRefs.push(p.linked_hypothesis);
            if (p.linked_threats && Array.isArray(p.linked_threats)) crossRefs.push(...p.linked_threats);
            if (p.cross_references && Array.isArray(p.cross_references)) crossRefs.push(...p.cross_references);

            allNodes.push({
              id: p.id || p.pattern_id || `PM-${allNodes.length}`,
              label: p.pattern_class || p.title || p.id || 'Pattern',
              type: 'pattern',
              detail: [p.lumen_instance, p.epstein_instance, p.detail].filter(Boolean).join(' | '),
              crossRefs,
              filename: p.filename,
            });
          }
        }

        if (entitiesRes?.ok) {
          const data = await entitiesRes.json();
          for (const e of (data.entities || [])) {
            allNodes.push({
              id: e.id || e.name || `SE-${allNodes.length}`,
              label: e.name || e.id || 'Entity',
              type: 'entity',
              detail: e.type || '',
              crossRefs: [],
              filename: e.filename,
            });
          }
        }

        // Build cross-references bidirectionally
        for (const node of allNodes) {
          for (const ref of node.crossRefs) {
            const target = allNodes.find(n => n.id === ref || n.label.includes(ref) || n.id.includes(ref));
            if (target && !target.crossRefs.includes(node.id)) {
              target.crossRefs.push(node.id);
            }
          }
        }

        setNodes(allNodes);
        setIsLive(true);
        setLastUpdated(new Date().toISOString());
      } catch { setIsLive(false); }
    }

    load();
    const interval = setInterval(load, 120000);
    return () => clearInterval(interval);
  }, []);

  // Load full document from dead-drop
  async function loadDocument(filename: string) {
    setShowDoc(filename);
    setDocContent(null);
    setLoadingDoc(true);
    try {
      // Try multiple paths
      const paths = [filename, `${filename}`];
      for (const p of paths) {
        try {
          const res = await fetch(`${VPS_API}/api/dead-drop/file?path=${encodeURIComponent(p)}`, {
            headers: { 'x-api-key': API_KEY },
          });
          if (res.ok) {
            setDocContent(await res.text());
            setLoadingDoc(false);
            return;
          }
        } catch { /* try next */ }
      }
      setDocContent('Document not found in dead-drop.');
    } catch {
      setDocContent('Error loading document.');
    }
    setLoadingDoc(false);
  }

  const filteredNodes = filter ? nodes.filter(n => n.type === filter) : nodes;

  // Find connections for a node
  function getConnections(node: CorrelationNode) {
    const connected: CorrelationNode[] = [];
    // Nodes this one references
    for (const ref of node.crossRefs) {
      const target = nodes.find(n => n.id === ref || n.label.includes(ref) || n.id.includes(ref));
      if (target) connected.push(target);
    }
    // Nodes that reference this one
    for (const other of nodes) {
      if (other.id === node.id) continue;
      if (other.crossRefs.some(r => node.id.includes(r) || node.label.includes(r) || r.includes(node.id))) {
        if (!connected.find(c => c.id === other.id)) connected.push(other);
      }
    }
    return connected;
  }

  const timeAgo = (iso: string) => {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  // Stats
  const threatCount = nodes.filter(n => n.type === 'threat').length;
  const hypoCount = nodes.filter(n => n.type === 'hypothesis').length;
  const patternCount = nodes.filter(n => n.type === 'pattern').length;
  const entityCount = nodes.filter(n => n.type === 'entity').length;
  const totalConnections = nodes.reduce((sum, n) => sum + n.crossRefs.length, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 px-1">
        <Dot color={isLive ? '#10b981' : '#f59e0b'} pulse={isLive} />
        <span className="font-mono text-[10px] tracking-wider" style={{ color: isLive ? '#10b981' : '#f59e0b' }}>
          {isLive ? `LIVE — ${nodes.length} ITEMS · ${totalConnections} CROSS-REFERENCES` : 'CONNECTING...'}
        </span>
        {lastUpdated && <span className="font-mono text-[9px] text-slate-600 ml-2">Updated {timeAgo(lastUpdated)}</span>}
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {[
          { label: 'Threats', value: threatCount, color: TYPE_COLORS.threat },
          { label: 'Hypotheses', value: hypoCount, color: TYPE_COLORS.hypothesis },
          { label: 'Patterns', value: patternCount, color: TYPE_COLORS.pattern },
          { label: 'Entities', value: entityCount, color: TYPE_COLORS.entity },
          { label: 'Cross-Refs', value: totalConnections, color: '#06b6d4' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-[#111b2a] border border-[#1e2d44] rounded-lg p-3" style={{ borderLeft: `3px solid ${kpi.color}` }}>
            <div className="text-[9px] text-slate-500 uppercase tracking-wider">{kpi.label}</div>
            <div className="font-mono text-lg font-bold" style={{ color: kpi.color }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Type Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setFilter(null)}
          className={`text-[10px] font-mono px-2.5 py-1 rounded border transition-all ${!filter ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400' : 'border-[#2a3550] text-slate-500 hover:text-slate-300'}`}
        >
          ALL ({nodes.length})
        </button>
        {Object.entries(TYPE_COLORS).map(([type, color]) => {
          const count = nodes.filter(n => n.type === type).length;
          if (count === 0) return null;
          return (
            <button
              key={type}
              onClick={() => setFilter(filter === type ? null : type)}
              className={`text-[10px] font-mono px-2.5 py-1 rounded border transition-all flex items-center gap-1.5 ${filter === type ? 'bg-white/[.05]' : 'border-[#2a3550] text-slate-500 hover:text-slate-300'}`}
              style={filter === type ? { borderColor: `${color}50`, color } : undefined}
            >
              <span>{TYPE_ICONS[type]}</span>
              {type.toUpperCase()} ({count})
            </button>
          );
        })}
      </div>

      {/* Document Viewer Modal */}
      {showDoc && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowDoc(null)}>
          <div className="w-full max-w-3xl max-h-[80vh] bg-[#0d1520] border border-[#2a3550] rounded-xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 bg-[#111827] border-b border-[#1e2d44]">
              <span className="font-mono text-[12px] text-slate-200">{showDoc}</span>
              <button onClick={() => setShowDoc(null)} className="text-[10px] font-mono text-slate-500 hover:text-slate-300">CLOSE</button>
            </div>
            <div className="p-5 overflow-y-auto max-h-[70vh]" style={{ scrollbarWidth: 'thin' }}>
              {loadingDoc ? (
                <div className="text-center py-10 text-slate-500 animate-pulse">Loading document...</div>
              ) : docContent ? (
                <div>{renderMarkdown(docContent)}</div>
              ) : (
                <div className="text-center py-10 text-slate-600">No content</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Correlation Items */}
      <div className="space-y-2">
        {filteredNodes.map(node => {
          const color = TYPE_COLORS[node.type] || '#64748b';
          const icon = TYPE_ICONS[node.type] || '\u2022';
          const connections = getConnections(node);
          const isExpanded = expanded === node.id;

          return (
            <div key={node.id} className="bg-[#111b2a] border border-[#1e2d44] rounded-xl overflow-hidden" style={{ borderLeft: `3px solid ${color}` }}>
              {/* Header */}
              <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[#131f30] transition-colors"
                onClick={() => setExpanded(isExpanded ? null : node.id)}
              >
                <span className="text-base flex-shrink-0">{icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[10px] text-slate-500">{node.id}</span>
                    <span className="text-[13px] font-semibold text-slate-200 truncate">{node.label}</span>
                    {node.severity && <Badge level={node.severity as any} small />}
                    {node.status && (
                      <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-white/[.03] text-slate-400">{node.status}</span>
                    )}
                  </div>
                  {node.detail && <div className="text-[11px] text-slate-500 mt-0.5 truncate">{node.detail}</div>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {connections.length > 0 && (
                    <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400">
                      {connections.length} link{connections.length > 1 ? 's' : ''}
                    </span>
                  )}
                  <span className="text-slate-500 text-xs">{isExpanded ? '\u25BE' : '\u25B8'}</span>
                </div>
              </div>

              {/* Expanded Detail */}
              {isExpanded && (
                <div className="border-t border-[#1e2d44] px-4 py-3 bg-[#0a0f18]">
                  {/* Full detail text */}
                  {node.detail && (
                    <div className="text-[12px] text-slate-300 leading-relaxed mb-3">{node.detail}</div>
                  )}

                  {/* Raw content preview for hypotheses */}
                  {node.raw && (
                    <div className="mb-3">
                      <div className="text-[12px] text-slate-400 leading-relaxed p-3 rounded-lg bg-[#111b2a] border border-[#1e2d44] max-h-[200px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                        {renderMarkdown(node.raw.slice(0, 2000))}
                      </div>
                    </div>
                  )}

                  {/* View full document button */}
                  {node.filename && (
                    <button
                      onClick={() => loadDocument(node.filename!)}
                      className="mb-3 w-full py-2 rounded-lg bg-cyan-500/10 text-cyan-400 text-[11px] font-bold hover:bg-cyan-500/20 transition-colors border border-cyan-500/20 font-mono"
                    >
                      VIEW FULL DOCUMENT — {node.filename}
                    </button>
                  )}

                  {/* Connections */}
                  {connections.length > 0 && (
                    <div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                        CROSS-REFERENCES ({connections.length})
                      </div>
                      <div className="space-y-1">
                        {connections.map((conn, i) => {
                          const connColor = TYPE_COLORS[conn.type] || '#64748b';
                          return (
                            <div
                              key={i}
                              className="flex items-center gap-2.5 py-2 px-3 rounded-lg bg-[#111b2a] border border-[#1e2d44] cursor-pointer hover:bg-[#131f30] transition-colors"
                              onClick={() => { setExpanded(conn.id); setFilter(null); }}
                            >
                              <span className="text-sm">{TYPE_ICONS[conn.type]}</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-[9px]" style={{ color: connColor }}>{conn.id}</span>
                                  <span className="text-[12px] text-slate-300 truncate">{conn.label}</span>
                                </div>
                                {conn.detail && <div className="text-[10px] text-slate-600 truncate">{conn.detail}</div>}
                              </div>
                              {conn.severity && <Badge level={conn.severity as any} small />}
                              {conn.filename && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); loadDocument(conn.filename!); }}
                                  className="text-[9px] font-mono text-cyan-500 hover:text-cyan-400 px-2 py-0.5 border border-cyan-500/20 rounded hover:bg-cyan-500/10"
                                >
                                  DOC
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {connections.length === 0 && (
                    <div className="text-[11px] text-slate-600 italic">No cross-references found for this item.</div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filteredNodes.length === 0 && (
          <div className="text-center py-10 text-[12px] text-slate-600">
            {filter ? `No ${filter} items found.` : 'No correlation data available.'}
          </div>
        )}
      </div>
    </div>
  );
}
