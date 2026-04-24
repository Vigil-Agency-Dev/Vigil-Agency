'use client';

import React, { useState, useEffect } from 'react';
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
  ring: number;
}

interface GraphEdge { source: string; target: string; label?: string; }

const TYPE_COLORS: Record<string, string> = {
  threat: '#ef4444', 'geo-threat': '#f97316', hypothesis: '#8b5cf6',
  pattern: '#10b981', entity: '#f59e0b', ally: '#3b82f6',
};
const TYPE_LABELS: Record<string, string> = {
  threat: 'Digital Threats', 'geo-threat': 'Geopolitical Threats', hypothesis: 'Hypotheses',
  pattern: 'Patterns', entity: 'Shared Entities', ally: 'Allies',
};
const TYPE_ICONS: Record<string, string> = {
  threat: '\u26A0\uFE0F', 'geo-threat': '\uD83C\uDF0D', hypothesis: '\uD83E\uDD14',
  pattern: '\uD83D\uDD17', entity: '\uD83C\uDFAD', ally: '\uD83E\uDD1D',
};

// Ring assignments: inner = most critical, outer = supporting
const RING_MAP: Record<string, number> = {
  hypothesis: 0,  // Center — the core theses
  threat: 1,      // Inner ring — digital threats
  'geo-threat': 1, // Inner ring — geopolitical threats
  pattern: 2,     // Middle ring — pattern evidence
  entity: 3,      // Outer ring — shared entities
  ally: 3,        // Outer ring — allies
};

function layoutNodes(rawNodes: Omit<GraphNode, 'x' | 'y' | 'ring'>[], cx: number, cy: number): GraphNode[] {
  const rings = [140, 240, 340, 420]; // radius per ring

  // Group by ring
  const grouped: Record<number, Omit<GraphNode, 'x' | 'y' | 'ring'>[]> = {};
  rawNodes.forEach(n => {
    const ring = RING_MAP[n.type] ?? 2;
    if (!grouped[ring]) grouped[ring] = [];
    grouped[ring].push(n);
  });

  const result: GraphNode[] = [];

  Object.entries(grouped).forEach(([ringStr, items]) => {
    const ring = parseInt(ringStr);
    const r = rings[ring] || 300;
    const angleStep = (Math.PI * 2) / Math.max(items.length, 1);
    // Offset each ring so they don't align
    const offset = ring * 0.4;

    items.forEach((node, i) => {
      const angle = offset + i * angleStep - Math.PI / 2;
      result.push({
        ...node,
        ring,
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
      });
    });
  });

  return result;
}

function renderMarkdown(raw: string) {
  return raw.split('\n').slice(0, 30).map((line, i) => {
    const t = line.trim();
    if (!t) return <div key={i} className="h-1" />;
    if (t.startsWith('# ')) return <h2 key={i} className="text-sm font-bold text-cyan-400 mt-2 mb-1">{t.slice(2)}</h2>;
    if (t.startsWith('## ')) return <h3 key={i} className="text-[12px] font-bold text-slate-200 mt-1.5 mb-0.5">{t.slice(3)}</h3>;
    if (t.startsWith('### ')) return <h4 key={i} className="text-[11px] font-semibold text-purple-400 mt-1">{t.slice(4)}</h4>;
    if (t.startsWith('- ')) return <div key={i} className="flex items-start gap-1.5 text-[10px] text-slate-400 pl-1"><span className="text-slate-600">{'\u25B8'}</span><span>{t.slice(2)}</span></div>;
    if (t.startsWith('---')) return <hr key={i} className="border-[#2a3550] my-1" />;
    const rendered = t.replace(/\*\*([^*]+)\*\*/g, '<b class="text-slate-200">$1</b>');
    return <div key={i} className="text-[10px] text-slate-400 leading-relaxed" dangerouslySetInnerHTML={{ __html: rendered }} />;
  });
}

export default function CorrelationMapTab() {
  const [isLive, setIsLive] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [filter, setFilter] = useState<string | null>(null);
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const [hovered, setHovered] = useState<GraphNode | null>(null);
  const [showDoc, setShowDoc] = useState<string | null>(null);
  const [docContent, setDocContent] = useState<string | null>(null);
  const [loadingDoc, setLoadingDoc] = useState(false);

  const CX = 480;
  const CY = 450;
  const SVG_W = 960;
  const SVG_H = 900;

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

        const raw: Omit<GraphNode, 'x' | 'y' | 'ring'>[] = [];
        const allEdges: GraphEdge[] = [];
        const ids = new Set<string>();

        if (threatsRes.ok) {
          const d = await threatsRes.json();
          for (const t of (d.threats || [])) { const id = t.id || `DV-${raw.length}`; if (!ids.has(id)) { ids.add(id); raw.push({ id, label: t.name || id, type: 'threat', severity: t.severity, status: t.status, detail: t.detail, crossRefs: [], filename: t.source }); } }
        }
        if (regRes?.ok) {
          const d = await regRes.json();
          for (const t of (Array.isArray(d.threats) ? d.threats : []).slice(0, 14)) { const id = t.id || `T-${raw.length}`; if (!ids.has(id)) { ids.add(id); raw.push({ id, label: t.name || t.title || id, type: 'geo-threat', severity: t.severity, status: t.status, detail: t.detail || t.description || '', crossRefs: [], filename: t.filename }); } }
        }
        if (hyposRes.ok) {
          const d = await hyposRes.json();
          for (const h of (d.hypotheses || [])) {
            const id = h.id || `H-${raw.length}`; if (ids.has(id)) continue; ids.add(id);
            const cr: string[] = Array.isArray(h.crossRef) ? h.crossRef : [];
            raw.push({ id, label: h.title || id, type: 'hypothesis', status: h.status, detail: h.classification, raw: h.raw, crossRefs: cr, filename: h.filename });
            cr.forEach((ref: string) => allEdges.push({ source: id, target: ref, label: 'cross-ref' }));
          }
        }
        if (patternsRes.ok) {
          const d = await patternsRes.json();
          for (const p of (d.patterns || [])) {
            const id = p.id || p.pattern_id || `PM-${raw.length}`; if (ids.has(id)) continue; ids.add(id);
            const cr: string[] = [];
            if (p.linked_hypothesis) cr.push(p.linked_hypothesis);
            if (Array.isArray(p.linked_threats)) cr.push(...p.linked_threats);
            if (Array.isArray(p.cross_references)) cr.push(...p.cross_references);
            raw.push({ id, label: p.pattern_class || p.title || id, type: 'pattern', detail: [p.lumen_instance, p.epstein_instance].filter(Boolean).join(' | '), crossRefs: cr, filename: p.filename });
            cr.forEach(ref => allEdges.push({ source: id, target: ref, label: 'linked' }));
          }
        }
        if (entitiesRes?.ok) {
          const d = await entitiesRes.json();
          for (const e of (d.entities || [])) { const id = e.id || e.name || `SE-${raw.length}`; if (!ids.has(id)) { ids.add(id); raw.push({ id, label: e.name || id, type: 'entity', detail: e.type, crossRefs: [], filename: e.filename }); } }
        }
        if (alliesRes?.ok) {
          const d = await alliesRes.json();
          for (const a of (d.allies || []).slice(0, 8)) { const id = a.handle || a.name || `A-${raw.length}`; if (!ids.has(id)) { ids.add(id); raw.push({ id, label: a.handle || a.name || id, type: 'ally', detail: a.alignment || a.notes, crossRefs: [] }); } }
        }

        // Resolve edges
        const resolved = allEdges.map(e => {
          const tgt = raw.find(n => n.id === e.target || e.target.includes(n.id) || n.id.includes(e.target) || n.label.toLowerCase().includes(e.target.toLowerCase()));
          return tgt ? { ...e, target: tgt.id } : null;
        }).filter(Boolean) as GraphEdge[];

        setNodes(layoutNodes(raw, CX, CY));
        setEdges(resolved);
        setIsLive(true);
        setLastUpdated(new Date().toISOString());
      } catch { setIsLive(false); }
    }
    load();
    const interval = setInterval(load, 120000);
    return () => clearInterval(interval);
  }, []);

  async function loadDocument(filename: string) {
    setShowDoc(filename); setDocContent(null); setLoadingDoc(true);
    try {
      const res = await fetch(`${VPS_API}/api/dead-drop/file?path=${encodeURIComponent(filename)}`, { headers: { 'x-api-key': API_KEY } });
      setDocContent(res.ok ? await res.text() : 'Not found.');
    } catch { setDocContent('Error.'); }
    setLoadingDoc(false);
  }

  const filteredNodes = filter ? nodes.filter(n => n.type === filter) : nodes;
  const filteredIds = new Set(filteredNodes.map(n => n.id));
  const visibleEdges = filter ? edges.filter(e => filteredIds.has(e.source) && filteredIds.has(e.target)) : edges;
  const selEdges = selected ? edges.filter(e => e.source === selected.id || e.target === selected.id) : [];
  const connIds = new Set(selEdges.flatMap(e => [e.source, e.target]));
  const tooltip = hovered || selected;

  const timeAgo = (iso: string) => { const d = Math.floor((Date.now() - new Date(iso).getTime()) / 1000); return d < 60 ? `${d}s ago` : d < 3600 ? `${Math.floor(d/60)}m ago` : `${Math.floor(d/3600)}h ago`; };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 px-1">
        <Dot color={isLive ? '#10b981' : '#f59e0b'} pulse={isLive} />
        <span className="font-mono text-[10px] tracking-wider" style={{ color: isLive ? '#10b981' : '#f59e0b' }}>
          {isLive ? `LIVE — ${nodes.length} NODES · ${edges.length} CONNECTIONS` : 'CONNECTING...'}
        </span>
        {lastUpdated && <span className="font-mono text-[9px] text-slate-600 ml-2">Updated {timeAgo(lastUpdated)}</span>}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => { setFilter(null); setSelected(null); }} className={`text-[10px] font-mono px-2.5 py-1 rounded border transition-all ${!filter ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400' : 'border-[#2a3550] text-slate-500 hover:text-slate-300'}`}>ALL ({nodes.length})</button>
        {Object.entries(TYPE_COLORS).map(([type, color]) => {
          const c = nodes.filter(n => n.type === type).length;
          return c === 0 ? null : (
            <button key={type} onClick={() => { setFilter(filter === type ? null : type); setSelected(null); }}
              className={`text-[10px] font-mono px-2.5 py-1 rounded border transition-all flex items-center gap-1.5 ${filter === type ? 'bg-white/[.05]' : 'border-[#2a3550] text-slate-500 hover:text-slate-300'}`}
              style={filter === type ? { borderColor: `${color}50`, color } : undefined}>
              <span>{TYPE_ICONS[type]}</span>{TYPE_LABELS[type]} ({c})
            </button>
          );
        })}
      </div>

      {/* Doc Modal */}
      {showDoc && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowDoc(null)}>
          <div className="w-full max-w-3xl max-h-[80vh] bg-[#0d1520] border border-[#2a3550] rounded-xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 bg-[#111827] border-b border-[#1e2d44]">
              <span className="font-mono text-[12px] text-slate-200">{showDoc}</span>
              <button onClick={() => setShowDoc(null)} className="text-[10px] font-mono text-slate-500 hover:text-slate-300">CLOSE</button>
            </div>
            <div className="p-5 overflow-y-auto max-h-[70vh]" style={{ scrollbarWidth: 'thin' }}>
              {loadingDoc ? <div className="text-center py-10 text-slate-500 animate-pulse">Loading...</div>
                : docContent ? <div>{renderMarkdown(docContent)}</div>
                : <div className="text-center py-10 text-slate-600">No content</div>}
            </div>
          </div>
        </div>
      )}

      {/* Main Layout: Map + Panel */}
      <div className="flex gap-4">
        {/* SVG Map */}
        <div className="flex-1 rounded-xl border border-[#2a3550] overflow-hidden bg-[#040810] relative" style={{ minHeight: '700px' }}>
          <svg width="100%" height="700" viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="select-none">
            {/* Orbital rings */}
            {[140, 240, 340, 420].map((r, i) => (
              <circle key={i} cx={CX} cy={CY} r={r} fill="none" stroke="#1e2d44" strokeWidth="0.5" opacity="0.3" strokeDasharray="4 8" />
            ))}

            {/* Center label */}
            <text x={CX} y={CY - 5} textAnchor="middle" fill="#1e2d44" fontSize="11" fontWeight="bold" fontFamily="'JetBrains Mono', monospace">VIGIL</text>
            <text x={CX} y={CY + 10} textAnchor="middle" fill="#1e2d44" fontSize="8" fontFamily="'JetBrains Mono', monospace">CORRELATION MAP</text>

            {/* Ring labels */}
            {[
              { r: 140, label: 'HYPOTHESES', color: TYPE_COLORS.hypothesis },
              { r: 240, label: 'THREATS', color: TYPE_COLORS.threat },
              { r: 340, label: 'PATTERNS', color: TYPE_COLORS.pattern },
              { r: 420, label: 'ENTITIES & ALLIES', color: TYPE_COLORS.entity },
            ].map((ring, i) => (
              <text key={i} x={CX + ring.r - 10} y={CY - ring.r + 15} fill={ring.color} fontSize="8" fontWeight="bold" opacity="0.3" fontFamily="'JetBrains Mono', monospace">
                {ring.label}
              </text>
            ))}

            {/* Edges */}
            {visibleEdges.map((e, i) => {
              const src = nodes.find(n => n.id === e.source);
              const tgt = nodes.find(n => n.id === e.target);
              if (!src || !tgt) return null;
              const hl = selected && (e.source === selected.id || e.target === selected.id);
              const dim = selected && !hl;
              return <line key={i} x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y}
                stroke={hl ? '#06b6d4' : '#2a3550'} strokeWidth={hl ? 2.5 : 0.8}
                strokeDasharray={hl ? '8 4' : '3 6'} opacity={dim ? 0.05 : hl ? 1 : 0.3}>
                {hl && <animate attributeName="stroke-dashoffset" from="0" to="24" dur="1s" repeatCount="indefinite" />}
              </line>;
            })}

            {/* Nodes */}
            {filteredNodes.map(node => {
              const color = TYPE_COLORS[node.type] || '#64748b';
              const isSel = selected?.id === node.id;
              const isConn = connIds.has(node.id);
              const dim = selected && !isSel && !isConn;
              const isHov = hovered?.id === node.id;
              const r = isSel ? 22 : isHov ? 18 : 15;

              return (
                <g key={node.id}
                  onClick={() => setSelected(isSel ? null : node)}
                  onMouseEnter={() => setHovered(node)}
                  onMouseLeave={() => setHovered(null)}
                  style={{ cursor: 'pointer' }}>
                  {isSel && <circle cx={node.x} cy={node.y} r={r + 12} fill={`${color}08`} />}
                  {isSel && <circle cx={node.x} cy={node.y} r={r + 6} fill="none" stroke={color} strokeWidth="0.5" opacity="0.5" strokeDasharray="2 4" />}
                  <circle cx={node.x} cy={node.y} r={r}
                    fill={isSel ? `${color}30` : `${color}18`}
                    stroke={color} strokeWidth={isSel ? 3 : isHov ? 2.5 : 1.5}
                    opacity={dim ? 0.12 : 1} />
                  <text x={node.x} y={node.y + 4} textAnchor="middle"
                    fill={dim ? '#1e293b' : color} fontSize={isSel ? '10' : '8'} fontWeight="bold"
                    fontFamily="'JetBrains Mono', monospace">
                    {node.id}
                  </text>
                  {/* Label below — only show if selected, hovered, or few nodes */}
                  {(isSel || isHov || filteredNodes.length < 15) && (
                    <text x={node.x} y={node.y + r + 13} textAnchor="middle"
                      fill={dim ? '#0f172a' : '#64748b'} fontSize="7.5"
                      fontFamily="'JetBrains Mono', monospace">
                      {node.label.length > 35 ? node.label.slice(0, 35) + '...' : node.label}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Hover tooltip */}
            {hovered && !selected && (
              <g>
                <rect x={hovered.x + 25} y={hovered.y - 20} width={Math.min(hovered.label.length * 6 + 40, 280)} height="32" rx="6" fill="#0d1520" stroke="#2a3550" strokeWidth="1" />
                <text x={hovered.x + 35} y={hovered.y - 4} fill={TYPE_COLORS[hovered.type]} fontSize="9" fontWeight="bold" fontFamily="'JetBrains Mono', monospace">{hovered.id}</text>
                <text x={hovered.x + 35} y={hovered.y + 8} fill="#94a3b8" fontSize="8" fontFamily="'JetBrains Mono', monospace">
                  {hovered.label.length > 40 ? hovered.label.slice(0, 40) + '...' : hovered.label}
                </text>
              </g>
            )}
          </svg>
        </div>

        {/* Detail Panel */}
        <div className="w-80 flex-shrink-0 rounded-xl border border-[#2a3550] bg-[#0a0e17] overflow-y-auto" style={{ maxHeight: '700px', scrollbarWidth: 'thin' }}>
          {selected ? (() => {
            const color = TYPE_COLORS[selected.type] || '#64748b';
            const conns = selEdges.map(e => nodes.find(n => n.id === (e.source === selected.id ? e.target : e.source))).filter(Boolean) as GraphNode[];
            return (
              <div>
                <div className="px-4 py-3 border-b border-[#1e2d44]" style={{ borderTop: `3px solid ${color}` }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{TYPE_ICONS[selected.type]}</span>
                    <span className="font-mono text-[10px] uppercase tracking-wider" style={{ color }}>{TYPE_LABELS[selected.type]}</span>
                  </div>
                  <div className="text-[15px] font-bold text-slate-200">{selected.id}</div>
                  <div className="text-[12px] text-slate-300 mt-1 leading-relaxed">{selected.label}</div>
                  <div className="flex items-center gap-2 mt-2">
                    {selected.severity && <Badge level={selected.severity as any} small />}
                    {selected.status && <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-white/[.04] text-slate-400">{selected.status}</span>}
                  </div>
                </div>
                <div className="px-4 py-3 border-b border-[#1e2d44]">
                  {selected.detail && <div className="text-[11px] text-slate-400 leading-relaxed mb-2">{selected.detail}</div>}
                  {selected.raw && (
                    <div className="p-3 rounded-lg bg-[#111b2a] border border-[#1e2d44] max-h-[250px] overflow-y-auto mb-2" style={{ scrollbarWidth: 'thin' }}>
                      {renderMarkdown(selected.raw)}
                    </div>
                  )}
                  {selected.filename && (
                    <button onClick={() => loadDocument(selected.filename!)}
                      className="w-full py-2.5 rounded-lg bg-cyan-500/10 text-cyan-400 text-[11px] font-bold hover:bg-cyan-500/20 transition-colors border border-cyan-500/20 font-mono">
                      VIEW FULL DOCUMENT
                    </button>
                  )}
                </div>
                {conns.length > 0 && (
                  <div className="px-4 py-3">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">CONNECTIONS ({conns.length})</div>
                    {conns.map((c, i) => (
                      <div key={i} className="flex items-center gap-2 py-2 px-2.5 rounded-lg bg-[#111b2a] border border-[#1e2d44] cursor-pointer hover:bg-[#131f30] transition-colors mb-1.5"
                        onClick={() => setSelected(c)}>
                        <span>{TYPE_ICONS[c.type]}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-mono text-[9px]" style={{ color: TYPE_COLORS[c.type] }}>{c.id}</div>
                          <div className="text-[10px] text-slate-300 truncate">{c.label}</div>
                        </div>
                        {c.filename && (
                          <button onClick={e => { e.stopPropagation(); loadDocument(c.filename!); }}
                            className="text-[8px] font-mono text-cyan-500 px-1.5 py-0.5 border border-cyan-500/20 rounded hover:bg-cyan-500/10">DOC</button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {conns.length === 0 && <div className="px-4 py-6 text-center text-[11px] text-slate-600">No direct cross-references</div>}
              </div>
            );
          })() : (
            <div className="flex flex-col items-center justify-center h-full py-16 px-6">
              <div className="text-3xl mb-4 opacity-20">{'\uD83D\uDD17'}</div>
              <div className="text-[13px] text-slate-500 text-center mb-2">Click any node to explore</div>
              <div className="text-[10px] text-slate-600 text-center leading-relaxed mb-6">
                Orbital map showing cross-domain correlations. Inner rings = core theses. Outer rings = supporting evidence and entities.
              </div>
              <div className="space-y-2 w-full">
                {Object.entries(TYPE_COLORS).map(([type, color]) => {
                  const c = nodes.filter(n => n.type === type).length;
                  return c === 0 ? null : (
                    <div key={type} className="flex items-center gap-2 text-[10px]">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                      <span className="text-slate-400">{TYPE_LABELS[type]}</span>
                      <span className="font-mono text-slate-600 ml-auto">{c}</span>
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
