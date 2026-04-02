'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Dot } from '../ui';

const VPS_API = process.env.NEXT_PUBLIC_VPS_ENDPOINT || 'https://ops.jr8ch.com';
const API_KEY = process.env.NEXT_PUBLIC_VIGIL_API_KEY || '';

interface GraphNode {
  id: string;
  label: string;
  type: 'threat' | 'hypothesis' | 'pattern' | 'ally' | 'agent' | 'entity';
  detail?: string;
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
  hypothesis: '#8b5cf6',
  pattern: '#10b981',
  ally: '#3b82f6',
  agent: '#06b6d4',
  entity: '#f59e0b',
};

const TYPE_ICONS: Record<string, string> = {
  threat: '\u26A0\uFE0F',
  hypothesis: '\uD83E\uDD14',
  pattern: '\uD83D\uDD17',
  ally: '\uD83E\uDD1D',
  agent: '\uD83E\uDD16',
  entity: '\uD83C\uDFAD',
};

export default function CorrelationMapTab() {
  const [isLive, setIsLive] = useState(false);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [filter, setFilter] = useState<string | null>(null);

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

        const allNodes: GraphNode[] = [];
        const allEdges: GraphEdge[] = [];
        const nodeIds = new Set<string>();

        // Layout: arrange in a circle by type
        let threatIdx = 0, hypoIdx = 0, patIdx = 0, entIdx = 0;

        if (threatsRes.ok) {
          const data = await threatsRes.json();
          for (const t of (data.threats || []).slice(0, 12)) {
            const id = `threat-${t.id || threatIdx}`;
            const angle = (threatIdx / Math.max((data.threats || []).length, 1)) * Math.PI * 0.5;
            allNodes.push({ id, label: t.name || t.id, type: 'threat', detail: t.detail, x: 150 + Math.cos(angle) * 280, y: 150 + Math.sin(angle) * 250 });
            nodeIds.add(id);
            threatIdx++;
          }
        }

        if (hyposRes.ok) {
          const data = await hyposRes.json();
          for (const h of (data.hypotheses || []).slice(0, 10)) {
            const id = `hypothesis-${h.id || hypoIdx}`;
            const angle = Math.PI * 0.5 + (hypoIdx / Math.max((data.hypotheses || []).length, 1)) * Math.PI * 0.5;
            allNodes.push({ id, label: h.id ? `${h.id}: ${(h.title || '').slice(0, 40)}` : h.title?.slice(0, 50) || 'Hypothesis', type: 'hypothesis', detail: h.title, x: 700 + Math.cos(angle) * 280, y: 150 + Math.sin(angle) * 250 });
            nodeIds.add(id);

            // Link hypotheses to threats via cross-references
            if (Array.isArray(h.crossRef)) {
              for (const ref of h.crossRef) {
                const threatNode = allNodes.find(n => n.type === 'threat' && (n.label.includes(ref) || n.id.includes(ref)));
                if (threatNode) allEdges.push({ source: id, target: threatNode.id, label: 'cross-ref' });
              }
            }
            hypoIdx++;
          }
        }

        if (patternsRes.ok) {
          const data = await patternsRes.json();
          for (const p of (data.patterns || []).slice(0, 8)) {
            const id = `pattern-${p.id || p.pattern_id || patIdx}`;
            const angle = Math.PI + (patIdx / Math.max((data.patterns || []).length, 1)) * Math.PI * 0.5;
            const label = p.pattern_class || p.title || p.id || `PM-${patIdx}`;
            allNodes.push({ id, label: label.slice(0, 40), type: 'pattern', detail: p.lumen_instance || p.detail || '', x: 420 + Math.cos(angle) * 320, y: 400 + Math.sin(angle) * 200 });
            nodeIds.add(id);

            // Link patterns to hypotheses
            if (p.linked_hypothesis || p.hypothesis_link) {
              const hId = p.linked_hypothesis || p.hypothesis_link;
              const hypoNode = allNodes.find(n => n.type === 'hypothesis' && n.id.includes(hId));
              if (hypoNode) allEdges.push({ source: id, target: hypoNode.id, label: 'supports' });
            }

            // Link patterns to threats
            if (p.linked_threats && Array.isArray(p.linked_threats)) {
              for (const tRef of p.linked_threats) {
                const threatNode = allNodes.find(n => n.type === 'threat' && n.id.includes(tRef));
                if (threatNode) allEdges.push({ source: id, target: threatNode.id, label: 'relates' });
              }
            }
            patIdx++;
          }
        }

        if (entitiesRes?.ok) {
          const data = await entitiesRes.json();
          for (const e of (data.entities || []).slice(0, 8)) {
            const id = `entity-${e.id || e.name || entIdx}`;
            const angle = Math.PI * 1.5 + (entIdx / Math.max((data.entities || []).length, 1)) * Math.PI * 0.5;
            allNodes.push({ id, label: e.name || e.id || `Entity ${entIdx}`, type: 'entity', detail: e.type || '', x: 420 + Math.cos(angle) * 300, y: 100 + Math.sin(angle) * 200 });
            nodeIds.add(id);
            entIdx++;
          }
        }

        setNodes(allNodes);
        setEdges(allEdges);
        setIsLive(true);
        setLastUpdated(new Date().toISOString());
      } catch { setIsLive(false); }
    }

    load();
    const interval = setInterval(load, 120000);
    return () => clearInterval(interval);
  }, []);

  const filteredNodes = filter ? nodes.filter(n => n.type === filter) : nodes;
  const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
  const filteredEdges = edges.filter(e => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target));

  // Get edges connected to selected node
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
          onClick={() => setFilter(null)}
          className={`text-[10px] font-mono px-2.5 py-1 rounded border transition-all ${!filter ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400' : 'border-[#2a3550] text-slate-500 hover:text-slate-300'}`}
        >
          ALL
        </button>
        {Object.entries(TYPE_COLORS).map(([type, color]) => (
          <button
            key={type}
            onClick={() => setFilter(filter === type ? null : type)}
            className={`text-[10px] font-mono px-2.5 py-1 rounded border transition-all flex items-center gap-1 ${filter === type ? 'bg-white/[.05]' : 'border-[#2a3550] text-slate-500 hover:text-slate-300'}`}
            style={filter === type ? { borderColor: `${color}50`, color } : undefined}
          >
            <span>{TYPE_ICONS[type]}</span>
            {type.toUpperCase()} ({nodes.filter(n => n.type === type).length})
          </button>
        ))}
      </div>

      <div className="flex gap-4" style={{ minHeight: '550px' }}>
        {/* SVG Map */}
        <div className="flex-1 rounded-xl border border-[#2a3550] overflow-hidden bg-[#060a12]">
          <svg width="100%" height="550" viewBox="0 0 900 550">
            {/* Edges */}
            {(filter ? filteredEdges : edges).map((edge, i) => {
              const src = nodes.find(n => n.id === edge.source);
              const tgt = nodes.find(n => n.id === edge.target);
              if (!src || !tgt) return null;
              const isHighlighted = selected && (edge.source === selected.id || edge.target === selected.id);
              return (
                <line
                  key={i}
                  x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y}
                  stroke={isHighlighted ? '#06b6d4' : '#2a3550'}
                  strokeWidth={isHighlighted ? 2 : 1}
                  strokeDasharray={isHighlighted ? undefined : '4 4'}
                  opacity={selected && !isHighlighted ? 0.15 : 0.6}
                />
              );
            })}

            {/* Nodes */}
            {filteredNodes.map(node => {
              const color = TYPE_COLORS[node.type] || '#64748b';
              const isSelected = selected?.id === node.id;
              const isConnected = connectedIds.has(node.id);
              const dimmed = selected && !isSelected && !isConnected;

              return (
                <g key={node.id} onClick={() => setSelected(isSelected ? null : node)} style={{ cursor: 'pointer' }}>
                  <circle
                    cx={node.x} cy={node.y} r={isSelected ? 18 : 14}
                    fill={`${color}20`}
                    stroke={color}
                    strokeWidth={isSelected ? 3 : 1.5}
                    opacity={dimmed ? 0.2 : 1}
                  />
                  <text
                    x={node.x} y={node.y + 28}
                    textAnchor="middle"
                    fill={dimmed ? '#334155' : '#94a3b8'}
                    fontSize="9"
                    fontFamily="'JetBrains Mono', monospace"
                  >
                    {node.label.length > 25 ? node.label.slice(0, 25) + '...' : node.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Detail Panel */}
        <div className="w-72 flex-shrink-0 rounded-xl border border-[#2a3550] bg-[#0a0e17] p-4 overflow-y-auto">
          {selected ? (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">{TYPE_ICONS[selected.type]}</span>
                <span className="font-mono text-[10px] uppercase tracking-wider" style={{ color: TYPE_COLORS[selected.type] }}>
                  {selected.type}
                </span>
              </div>
              <div className="text-[14px] font-bold text-slate-200 mb-2">{selected.label}</div>
              {selected.detail && (
                <div className="text-[12px] text-slate-400 leading-relaxed mb-4">{selected.detail}</div>
              )}
              {selectedEdges.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">CONNECTIONS ({selectedEdges.length})</div>
                  {selectedEdges.map((edge, i) => {
                    const otherId = edge.source === selected.id ? edge.target : edge.source;
                    const other = nodes.find(n => n.id === otherId);
                    if (!other) return null;
                    return (
                      <div
                        key={i}
                        className="flex items-center gap-2 py-1.5 px-2 -mx-2 rounded hover:bg-white/[.03] cursor-pointer"
                        onClick={() => setSelected(other)}
                      >
                        <span className="text-xs">{TYPE_ICONS[other.type]}</span>
                        <span className="text-[11px] text-slate-300 flex-1 truncate">{other.label}</span>
                        {edge.label && <span className="text-[8px] text-slate-600">{edge.label}</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-10">
              <div className="text-2xl mb-3 opacity-20">{'\uD83D\uDD17'}</div>
              <div className="text-[12px] text-slate-600 mb-2">Click a node to see connections</div>
              <div className="text-[10px] text-slate-700">Cross-domain pattern correlations between threats, hypotheses, patterns, and shared entities</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
