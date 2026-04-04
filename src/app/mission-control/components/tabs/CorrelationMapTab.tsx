'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Badge, Dot } from '../ui';

const VPS_API = process.env.NEXT_PUBLIC_VPS_ENDPOINT || 'https://ops.jr8ch.com';
const API_KEY = process.env.NEXT_PUBLIC_VIGIL_API_KEY || '';

interface GraphNode {
  id: string;
  label: string;
  type: 'threat' | 'hypothesis' | 'pattern' | 'entity' | 'geo-threat' | 'ally';
  severity?: string;
  status?: string;
  detail?: string;
  raw?: string;
  crossRefs: string[];
  filename?: string;
  x: number;
  y: number;
}

interface GraphEdge {
  source: string;
  target: string;
  label?: string;
}

const TYPE_COLORS: Record<string, string> = {
  threat: '#ef4444',
  'geo-threat': '#f97316',
  hypothesis: '#8b5cf6',
  pattern: '#10b981',
  entity: '#f59e0b',
  ally: '#3b82f6',
};

const TYPE_LABELS: Record<string, string> = {
  threat: 'Digital Threats',
  'geo-threat': 'Geopolitical Threats',
  hypothesis: 'Hypotheses',
  pattern: 'Patterns',
  entity: 'Shared Entities',
  ally: 'Allies',
};

const TYPE_ICONS: Record<string, string> = {
  threat: '\u26A0\uFE0F',
  'geo-threat': '\uD83C\uDF0D',
  hypothesis: '\uD83E\uDD14',
  pattern: '\uD83D\uDD17',
  entity: '\uD83C\uDFAD',
  ally: '\uD83E\uDD1D',
};

function renderMarkdown(raw: string) {
  return raw.split('\n').map((line, i) => {
    const t = line.trim();
    if (!t) return <div key={i} className="h-1.5" />;
    if (t.startsWith('# ')) return <h2 key={i} className="text-sm font-bold text-cyan-400 mt-3 mb-1.5">{t.slice(2)}</h2>;
    if (t.startsWith('## ')) return <h3 key={i} className="text-[13px] font-bold text-slate-200 mt-2 mb-1 border-b border-[#2a3550] pb-1">{t.slice(3)}</h3>;
    if (t.startsWith('### ')) return <h4 key={i} className="text-[12px] font-semibold text-purple-400 mt-2 mb-1">{t.slice(4)}</h4>;
    if (t.startsWith('- ') || t.startsWith('* ')) return <div key={i} className="flex items-start gap-2 text-[11px] text-slate-400 pl-2 py-0.5"><span className="text-slate-600 mt-0.5">{'\u25B8'}</span><span>{t.slice(2)}</span></div>;
    if (t.startsWith('---')) return <hr key={i} className="border-[#2a3550] my-2" />;
    const rendered = t.replace(/\*\*([^*]+)\*\*/g, '<b class="text-slate-200 font-semibold">$1</b>');
    return <div key={i} className="text-[11px] text-slate-400 leading-relaxed py-0.5" dangerouslySetInnerHTML={{ __html: rendered }} />;
  });
}

// Layout nodes in grouped clusters around the center
function layoutNodes(nodes: Omit<GraphNode, 'x' | 'y'>[], width: number, height: number): GraphNode[] {
  const cx = width / 2;
  const cy = height / 2;
  const types = [...new Set(nodes.map(n => n.type))];
  const typePositions: Record<string, { angle: number; radius: number }> = {};

  // Assign each type a sector of the circle
  types.forEach((type, i) => {
    typePositions[type] = {
      angle: (i / types.length) * Math.PI * 2 - Math.PI / 2,
      radius: Math.min(width, height) * 0.32,
    };
  });

  return nodes.map((node, _) => {
    const typeInfo = typePositions[node.type];
    if (!typeInfo) return { ...node, x: cx, y: cy };

    const siblings = nodes.filter(n => n.type === node.type);
    const idx = siblings.indexOf(node);
    const count = siblings.length;

    // Spread nodes of same type in a small cluster around their sector position
    const spread = Math.min(count * 18, 120);
    const subAngle = count > 1 ? ((idx / (count - 1)) - 0.5) * (spread / typeInfo.radius) : 0;
    const jitter = count > 1 ? (idx % 2 === 0 ? 15 : -15) : 0;

    const x = cx + Math.cos(typeInfo.angle + subAngle) * (typeInfo.radius + jitter);
    const y = cy + Math.sin(typeInfo.angle + subAngle) * (typeInfo.radius + jitter);

    return { ...node, x: Math.max(60, Math.min(width - 60, x)), y: Math.max(40, Math.min(height - 40, y)) };
  });
}

export default function CorrelationMapTab() {
  const [isLive, setIsLive] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [filter, setFilter] = useState<string | null>(null);
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const [showDoc, setShowDoc] = useState<string | null>(null);
  const [docContent, setDocContent] = useState<string | null>(null);
  const [loadingDoc, setLoadingDoc] = useState(false);

  const SVG_WIDTH = 960;
  const SVG_HEIGHT = 600;

  useEffect(() => {
    if (!API_KEY) return;

    async function load() {
      try {
        const [threatsRes, hyposRes, patternsRes, entitiesRes, regRes, alliesRes] = await Promise.all([
          fetch(`${VPS_API}/api/mission/threats`, { headers: { 'x-api-key': API_KEY } }),
          fetch(`${VPS_API}/api/mission/hypotheses`, { headers: { 'x-api-key': API_KEY } }),
          fetch(`${VPS_API}/api/mission/patterns`, { headers: { 'x-api-key': API_KEY } }),
          fetch(`${VPS_API}/api/mission/shared-entities`, { headers: { 'x-api-key': API_KEY } }).catch(() => null),
          fetch(`${VPS_API}/api/mission/threat-register`, { headers: { 'x-api-key': API_KEY } }).catch(() => null),
          fetch(`${VPS_API}/api/mission/allies`, { headers: { 'x-api-key': API_KEY } }).catch(() => null),
        ]);

        const rawNodes: Omit<GraphNode, 'x' | 'y'>[] = [];
        const allEdges: GraphEdge[] = [];
        const nodeIds = new Set<string>();

        // Digital threats (DV-series)
        if (threatsRes.ok) {
          const data = await threatsRes.json();
          for (const t of (data.threats || [])) {
            const id = t.id || `DV-${rawNodes.length}`;
            if (nodeIds.has(id)) continue;
            nodeIds.add(id);
            rawNodes.push({ id, label: t.name || t.id, type: 'threat', severity: t.severity, status: t.status, detail: t.detail, crossRefs: [], filename: t.source });
          }
        }

        // Geopolitical threats (T-series from MERIDIAN threat register)
        if (regRes?.ok) {
          const data = await regRes.json();
          const threats = Array.isArray(data.threats) ? data.threats : [];
          for (const t of threats.slice(0, 14)) {
            const id = t.id || t.threat_id || `T-${rawNodes.length}`;
            if (nodeIds.has(id)) continue;
            nodeIds.add(id);
            rawNodes.push({ id, label: t.name || t.title || id, type: 'geo-threat', severity: t.severity, status: t.status, detail: t.detail || t.description || '', crossRefs: [], filename: t.filename });
          }
        }

        // Hypotheses
        if (hyposRes.ok) {
          const data = await hyposRes.json();
          for (const h of (data.hypotheses || [])) {
            const id = h.id || `H-${rawNodes.length}`;
            if (nodeIds.has(id)) continue;
            nodeIds.add(id);
            const crossRefs = Array.isArray(h.crossRef) ? h.crossRef : [];
            rawNodes.push({ id, label: h.title || id, type: 'hypothesis', status: h.status, detail: h.classification || '', raw: h.raw, crossRefs, filename: h.filename });

            // Build edges from cross-references
            for (const ref of crossRefs) {
              allEdges.push({ source: id, target: ref, label: 'cross-ref' });
            }
          }
        }

        // Pattern matches
        if (patternsRes.ok) {
          const data = await patternsRes.json();
          for (const p of (data.patterns || [])) {
            const id = p.id || p.pattern_id || `PM-${rawNodes.length}`;
            if (nodeIds.has(id)) continue;
            nodeIds.add(id);
            const crossRefs: string[] = [];
            if (p.linked_hypothesis) crossRefs.push(p.linked_hypothesis);
            if (Array.isArray(p.linked_threats)) crossRefs.push(...p.linked_threats);
            if (Array.isArray(p.cross_references)) crossRefs.push(...p.cross_references);
            rawNodes.push({ id, label: p.pattern_class || p.title || id, type: 'pattern', detail: [p.lumen_instance, p.epstein_instance].filter(Boolean).join(' | '), crossRefs, filename: p.filename });

            for (const ref of crossRefs) {
              allEdges.push({ source: id, target: ref, label: 'linked' });
            }
          }
        }

        // Shared entities
        if (entitiesRes?.ok) {
          const data = await entitiesRes.json();
          for (const e of (data.entities || [])) {
            const id = e.id || e.name || `SE-${rawNodes.length}`;
            if (nodeIds.has(id)) continue;
            nodeIds.add(id);
            rawNodes.push({ id, label: e.name || id, type: 'entity', detail: e.type || '', crossRefs: [], filename: e.filename });
          }
        }

        // Top allies
        if (alliesRes?.ok) {
          const data = await alliesRes.json();
          for (const a of (data.allies || []).slice(0, 6)) {
            const id = a.handle || a.name || `ALLY-${rawNodes.length}`;
            if (nodeIds.has(id)) continue;
            nodeIds.add(id);
            rawNodes.push({ id, label: a.handle || a.name || id, type: 'ally', detail: a.alignment || a.notes || '', crossRefs: [] });
          }
        }

        // Resolve edge targets — match by ID substring or label
        const resolvedEdges: GraphEdge[] = [];
        for (const edge of allEdges) {
          const target = rawNodes.find(n =>
            n.id === edge.target ||
            edge.target.includes(n.id) ||
            n.id.includes(edge.target) ||
            n.label.toLowerCase().includes(edge.target.toLowerCase())
          );
          if (target) {
            resolvedEdges.push({ source: edge.source, target: target.id, label: edge.label });
          }
        }

        const laidOut = layoutNodes(rawNodes, SVG_WIDTH, SVG_HEIGHT);
        setNodes(laidOut);
        setEdges(resolvedEdges);
        setIsLive(true);
        setLastUpdated(new Date().toISOString());
      } catch { setIsLive(false); }
    }

    load();
    const interval = setInterval(load, 120000);
    return () => clearInterval(interval);
  }, []);

  async function loadDocument(filename: string) {
    setShowDoc(filename);
    setDocContent(null);
    setLoadingDoc(true);
    try {
      const res = await fetch(`${VPS_API}/api/dead-drop/file?path=${encodeURIComponent(filename)}`, { headers: { 'x-api-key': API_KEY } });
      if (res.ok) { setDocContent(await res.text()); } else { setDocContent('Document not found.'); }
    } catch { setDocContent('Error loading document.'); }
    setLoadingDoc(false);
  }

  const filteredNodes = filter ? nodes.filter(n => n.type === filter) : nodes;
  const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
  const visibleEdges = edges.filter(e => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target));
  const selectedEdges = selected ? edges.filter(e => e.source === selected.id || e.target === selected.id) : [];
  const connectedIds = new Set(selectedEdges.flatMap(e => [e.source, e.target]));

  const timeAgo = (iso: string) => {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 px-1">
        <Dot color={isLive ? '#10b981' : '#f59e0b'} pulse={isLive} />
        <span className="font-mono text-[10px] tracking-wider" style={{ color: isLive ? '#10b981' : '#f59e0b' }}>
          {isLive ? `LIVE — ${nodes.length} NODES · ${edges.length} CONNECTIONS` : 'CONNECTING...'}
        </span>
        {lastUpdated && <span className="font-mono text-[9px] text-slate-600 ml-2">Updated {timeAgo(lastUpdated)}</span>}
      </div>

      {/* Type Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => { setFilter(null); setSelected(null); }}
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
              onClick={() => { setFilter(filter === type ? null : type); setSelected(null); }}
              className={`text-[10px] font-mono px-2.5 py-1 rounded border transition-all flex items-center gap-1.5 ${filter === type ? 'bg-white/[.05]' : 'border-[#2a3550] text-slate-500 hover:text-slate-300'}`}
              style={filter === type ? { borderColor: `${color}50`, color } : undefined}
            >
              <span>{TYPE_ICONS[type]}</span>
              {TYPE_LABELS[type] || type} ({count})
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
              <button onClick={() => setShowDoc(null)} className="text-[10px] font-mono text-slate-500 hover:text-slate-300">CLOSE (ESC)</button>
            </div>
            <div className="p-5 overflow-y-auto max-h-[70vh]" style={{ scrollbarWidth: 'thin' }}>
              {loadingDoc ? <div className="text-center py-10 text-slate-500 animate-pulse">Loading document...</div>
                : docContent ? <div>{renderMarkdown(docContent)}</div>
                : <div className="text-center py-10 text-slate-600">No content</div>}
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-4" style={{ minHeight: '620px' }}>
        {/* SVG Node Map */}
        <div className="flex-1 rounded-xl border border-[#2a3550] overflow-hidden bg-[#060a12] relative">
          {/* Type labels on the map */}
          <svg width="100%" height="620" viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} className="select-none">
            {/* Grid background */}
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e2d44" strokeWidth="0.3" opacity="0.3" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* Type cluster labels */}
            {!filter && (() => {
              const types = [...new Set(nodes.map(n => n.type))];
              return types.map((type, i) => {
                const typeNodes = nodes.filter(n => n.type === type);
                if (typeNodes.length === 0) return null;
                const avgX = typeNodes.reduce((s, n) => s + n.x, 0) / typeNodes.length;
                const avgY = typeNodes.reduce((s, n) => s + n.y, 0) / typeNodes.length;
                return (
                  <text key={type} x={avgX} y={Math.max(20, avgY - 45)} textAnchor="middle" fill={TYPE_COLORS[type]} fontSize="10" fontWeight="bold" opacity="0.4" fontFamily="'JetBrains Mono', monospace">
                    {(TYPE_LABELS[type] || type).toUpperCase()}
                  </text>
                );
              });
            })()}

            {/* Edges */}
            {(filter ? visibleEdges : edges).map((edge, i) => {
              const src = nodes.find(n => n.id === edge.source);
              const tgt = nodes.find(n => n.id === edge.target);
              if (!src || !tgt) return null;
              const isHighlighted = selected && (edge.source === selected.id || edge.target === selected.id);
              const dimmed = selected && !isHighlighted;
              return (
                <line key={i} x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y}
                  stroke={isHighlighted ? '#06b6d4' : '#2a3550'}
                  strokeWidth={isHighlighted ? 2.5 : 1}
                  strokeDasharray={isHighlighted ? undefined : '4 4'}
                  opacity={dimmed ? 0.08 : isHighlighted ? 0.9 : 0.4}
                />
              );
            })}

            {/* Nodes */}
            {filteredNodes.map(node => {
              const color = TYPE_COLORS[node.type] || '#64748b';
              const isSelected = selected?.id === node.id;
              const isConnected = connectedIds.has(node.id);
              const dimmed = selected && !isSelected && !isConnected;
              const r = isSelected ? 20 : 14;

              return (
                <g key={node.id} onClick={() => setSelected(isSelected ? null : node)} style={{ cursor: 'pointer' }}>
                  {/* Glow effect for selected */}
                  {isSelected && <circle cx={node.x} cy={node.y} r={r + 8} fill={`${color}10`} />}
                  <circle cx={node.x} cy={node.y} r={r}
                    fill={`${color}${isSelected ? '30' : '15'}`}
                    stroke={color}
                    strokeWidth={isSelected ? 3 : 1.5}
                    opacity={dimmed ? 0.15 : 1}
                  />
                  {/* ID label inside node */}
                  <text x={node.x} y={node.y + 3.5} textAnchor="middle" fill={dimmed ? '#334155' : color} fontSize="8" fontWeight="bold" fontFamily="'JetBrains Mono', monospace">
                    {node.id.length > 6 ? node.id.slice(0, 6) : node.id}
                  </text>
                  {/* Name label below */}
                  <text x={node.x} y={node.y + r + 14} textAnchor="middle" fill={dimmed ? '#1e293b' : '#94a3b8'} fontSize="8.5" fontFamily="'JetBrains Mono', monospace">
                    {node.label.length > 30 ? node.label.slice(0, 30) + '...' : node.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Detail Panel */}
        <div className="w-80 flex-shrink-0 rounded-xl border border-[#2a3550] bg-[#0a0e17] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
          {selected ? (() => {
            const color = TYPE_COLORS[selected.type] || '#64748b';
            const connections = selectedEdges.map(e => {
              const otherId = e.source === selected.id ? e.target : e.source;
              return nodes.find(n => n.id === otherId);
            }).filter(Boolean) as GraphNode[];

            return (
              <div>
                {/* Header */}
                <div className="px-4 py-3 border-b border-[#1e2d44]" style={{ borderTop: `3px solid ${color}` }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{TYPE_ICONS[selected.type]}</span>
                    <span className="font-mono text-[10px] uppercase tracking-wider" style={{ color }}>{TYPE_LABELS[selected.type] || selected.type}</span>
                  </div>
                  <div className="text-[14px] font-bold text-slate-200">{selected.id}</div>
                  <div className="text-[12px] text-slate-300 mt-1">{selected.label}</div>
                  {selected.severity && <Badge level={selected.severity as any} small />}
                  {selected.status && <span className="font-mono text-[9px] ml-2 px-1.5 py-0.5 rounded bg-white/[.03] text-slate-400">{selected.status}</span>}
                </div>

                {/* Detail */}
                <div className="px-4 py-3 border-b border-[#1e2d44]">
                  {selected.detail && <div className="text-[12px] text-slate-400 leading-relaxed mb-2">{selected.detail}</div>}
                  {selected.raw && (
                    <div className="text-[11px] text-slate-400 leading-relaxed p-3 rounded-lg bg-[#111b2a] border border-[#1e2d44] max-h-[200px] overflow-y-auto mb-2" style={{ scrollbarWidth: 'thin' }}>
                      {renderMarkdown(selected.raw.slice(0, 1500))}
                    </div>
                  )}
                  {selected.filename && (
                    <button onClick={() => loadDocument(selected.filename!)}
                      className="w-full py-2 rounded-lg bg-cyan-500/10 text-cyan-400 text-[11px] font-bold hover:bg-cyan-500/20 transition-colors border border-cyan-500/20 font-mono">
                      VIEW FULL DOCUMENT
                    </button>
                  )}
                </div>

                {/* Connections */}
                {connections.length > 0 && (
                  <div className="px-4 py-3">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">CONNECTIONS ({connections.length})</div>
                    <div className="space-y-1.5">
                      {connections.map((conn, i) => {
                        const connColor = TYPE_COLORS[conn.type] || '#64748b';
                        return (
                          <div key={i}
                            className="flex items-center gap-2 py-2 px-2.5 rounded-lg bg-[#111b2a] border border-[#1e2d44] cursor-pointer hover:bg-[#131f30] transition-colors"
                            onClick={() => setSelected(conn)}
                          >
                            <span className="text-sm">{TYPE_ICONS[conn.type]}</span>
                            <div className="flex-1 min-w-0">
                              <div className="font-mono text-[9px]" style={{ color: connColor }}>{conn.id}</div>
                              <div className="text-[11px] text-slate-300 truncate">{conn.label}</div>
                            </div>
                            {conn.filename && (
                              <button onClick={(e) => { e.stopPropagation(); loadDocument(conn.filename!); }}
                                className="text-[8px] font-mono text-cyan-500 hover:text-cyan-400 px-1.5 py-0.5 border border-cyan-500/20 rounded hover:bg-cyan-500/10">
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
                  <div className="px-4 py-6 text-center text-[11px] text-slate-600">No direct cross-references</div>
                )}
              </div>
            );
          })() : (
            <div className="flex flex-col items-center justify-center h-full py-16 px-6">
              <div className="text-3xl mb-4 opacity-20">{'\uD83D\uDD17'}</div>
              <div className="text-[13px] text-slate-500 text-center mb-2">Click any node to explore</div>
              <div className="text-[11px] text-slate-600 text-center leading-relaxed">
                Cross-domain correlations across digital threats, geopolitical threats, hypotheses, pattern matches, shared entities, and allies.
              </div>
              <div className="mt-6 space-y-2 w-full">
                {Object.entries(TYPE_COLORS).map(([type, color]) => {
                  const count = nodes.filter(n => n.type === type).length;
                  if (count === 0) return null;
                  return (
                    <div key={type} className="flex items-center gap-2 text-[10px]">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                      <span className="text-slate-400">{TYPE_LABELS[type] || type}</span>
                      <span className="font-mono text-slate-600 ml-auto">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
