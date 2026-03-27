'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
} from 'react-simple-maps';

// ===================== TYPES =====================

interface ConflictEvent {
  id: string;
  title: string;
  type: 'armed-conflict' | 'civil-unrest' | 'cybersecurity' | 'terrorism' | 'political-crisis' | 'humanitarian';
  lat: number;
  lng: number;
  country: string;
  region: string;
  intensity: number; // 1-10
  source: string;
  sourceUrl: string;
  timestamp: string;
  actors: string[];
  description: string;
}

interface VIGILOperation {
  code: string;
  name: string;
  lat: number;
  lng: number;
  status: string;
  color: string;
}

// ===================== CONFIG =====================

const GDELT_API = '/api/gdelt-proxy';

// VIGIL operation locations for map overlay
const VIGIL_OPS: VIGILOperation[] = [
  { code: 'OP-001', name: 'PROJECT LUMEN', lat: 37.7749, lng: -122.4194, status: 'ACTIVE', color: '#3b82f6' },
  { code: 'OP-002', name: 'EPSTEIN UNCOVERED', lat: 40.7128, lng: -74.0060, status: 'ACTIVE', color: '#f59e0b' },
  { code: 'OP-003', name: 'SOUTHERN CROSS', lat: -37.8136, lng: 144.9631, status: 'ACTIVE', color: '#10b981' },
];

// Event type config
const EVENT_TYPES: Record<string, { label: string; color: string; icon: string }> = {
  'armed-conflict': { label: 'Armed Conflict', color: '#ef4444', icon: '\u{1F4A5}' },
  'civil-unrest': { label: 'Civil Unrest', color: '#f59e0b', icon: '\u{1F525}' },
  'cybersecurity': { label: 'Cybersecurity', color: '#8b5cf6', icon: '\u{1F6E1}\uFE0F' },
  'terrorism': { label: 'Terrorism', color: '#dc2626', icon: '\u{26A0}\uFE0F' },
  'political-crisis': { label: 'Political Crisis', color: '#3b82f6', icon: '\u{1F3DB}\uFE0F' },
  'humanitarian': { label: 'Humanitarian', color: '#06b6d4', icon: '\u{1F6D1}' },
};

// ===================== GDELT DATA FETCHING =====================

function parseGDELTResponse(articles: Array<Record<string, string>>): ConflictEvent[] {
  return articles
    .filter((a) => a.url && a.title)
    .map((a, i) => {
      let type: ConflictEvent['type'] = 'political-crisis';
      const titleLower = (a.title || '').toLowerCase();
      if (/war|military|strike|bomb|attack|troops|missile|drone|shell|airstrike/.test(titleLower)) type = 'armed-conflict';
      else if (/protest|riot|demonstrat|unrest|uprising|march/.test(titleLower)) type = 'civil-unrest';
      else if (/cyber|hack|breach|ransomware|malware/.test(titleLower)) type = 'cybersecurity';
      else if (/terror|isis|al.?qaeda|extremis|suicide.?bomb/.test(titleLower)) type = 'terrorism';
      else if (/refugee|famine|humanitarian|displaced|aid|crisis/.test(titleLower)) type = 'humanitarian';

      const tone = parseFloat(a.tone || '0');
      const intensity = Math.min(10, Math.max(1, Math.round(Math.abs(tone) + 3)));

      return {
        id: `gdelt-${i}-${Date.now()}`,
        title: a.title || 'Unknown event',
        type,
        lat: 0,
        lng: 0,
        country: a.sourcecountry || 'Unknown',
        region: '',
        intensity,
        source: a.domain || 'GDELT',
        sourceUrl: a.url || '',
        timestamp: a.seendate || new Date().toISOString(),
        actors: [],
        description: a.title || '',
      };
    })
    .slice(0, 50);
}

async function fetchGDELTEvents(query: string): Promise<ConflictEvent[]> {
  try {
    const res = await fetch(`${GDELT_API}?query=${encodeURIComponent(query + ' sourcelang:english')}`);
    const data = await res.json();
    return parseGDELTResponse(data.articles || []);
  } catch (err) {
    console.error('[ATLAS] GDELT fetch failed:', err);
    return [];
  }
}

// ===================== HELPERS =====================

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

// ===================== EVENT FEED =====================

function EventFeed({
  events,
  selectedType,
  onTypeFilter,
}: {
  events: ConflictEvent[];
  selectedType: string | null;
  onTypeFilter: (type: string | null) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const filtered = selectedType ? events.filter((e) => e.type === selectedType) : events;

  return (
    <div>
      {/* Type filters */}
      <div className="flex gap-1.5 mb-3 flex-wrap">
        <button
          onClick={() => onTypeFilter(null)}
          className="py-1 px-2.5 rounded text-[10px] font-mono transition-colors"
          style={{
            background: !selectedType ? 'rgba(139,92,246,.15)' : 'rgba(255,255,255,.03)',
            color: !selectedType ? '#c4b5fd' : '#64748b',
            border: `1px solid ${!selectedType ? 'rgba(139,92,246,.3)' : 'rgba(255,255,255,.06)'}`,
          }}
        >
          ALL ({events.length})
        </button>
        {Object.entries(EVENT_TYPES).map(([key, cfg]) => {
          const count = events.filter((e) => e.type === key).length;
          if (count === 0) return null;
          return (
            <button
              key={key}
              onClick={() => onTypeFilter(selectedType === key ? null : key)}
              className="py-1 px-2.5 rounded text-[10px] font-mono transition-colors"
              style={{
                background: selectedType === key ? `${cfg.color}15` : 'rgba(255,255,255,.03)',
                color: selectedType === key ? cfg.color : '#64748b',
                border: `1px solid ${selectedType === key ? `${cfg.color}30` : 'rgba(255,255,255,.06)'}`,
              }}
            >
              {cfg.icon} {cfg.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Event list */}
      <div className="max-h-[600px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
        {filtered.map((event) => {
          const cfg = EVENT_TYPES[event.type] || EVENT_TYPES['political-crisis'];
          const isExpanded = expanded === event.id;

          return (
            <div
              key={event.id}
              className="border-b border-[#1a2740]/60 transition-colors cursor-pointer hover:bg-[#111a28]"
              onClick={() => setExpanded(isExpanded ? null : event.id)}
              style={{ background: isExpanded ? '#0d1520' : 'transparent' }}
            >
              <div className="flex items-start gap-2.5 px-3 py-2.5">
                {/* Intensity indicator */}
                <div className="shrink-0 mt-0.5 flex flex-col items-center gap-0.5">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{
                      backgroundColor: cfg.color,
                      boxShadow: event.intensity >= 7 ? `0 0 6px ${cfg.color}80` : 'none',
                    }}
                  />
                  <span className="font-mono text-[8px] text-slate-600">{event.intensity}</span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10px]">{cfg.icon}</span>
                    <span className="font-mono text-[9px]" style={{ color: cfg.color }}>{cfg.label}</span>
                    <span className="font-mono text-[9px] text-slate-600">{'\u2022'} {event.source}</span>
                    <span className="font-mono text-[9px] text-slate-600">{'\u2022'} {timeAgo(event.timestamp)}</span>
                  </div>
                  <div className="text-[12px] text-slate-200 leading-snug line-clamp-2">{event.title}</div>

                  {isExpanded && (
                    <div className="mt-2 pt-2 border-t border-[#1e2d44]">
                      <div className="text-[11px] text-slate-400 mb-2">{event.description}</div>
                      <div className="flex items-center gap-3">
                        <a
                          href={event.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-[9px] text-cyan-500 hover:text-cyan-400"
                          onClick={(e) => e.stopPropagation()}
                        >
                          OPEN SOURCE {'\u2197'}
                        </a>
                        {event.country !== 'Unknown' && (
                          <span className="font-mono text-[9px] text-slate-600">
                            COUNTRY: {event.country}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <span className="shrink-0 text-[10px] text-slate-600">{isExpanded ? '\u25BE' : '\u25B8'}</span>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-8 text-[11px] text-slate-600 font-mono">
            NO EVENTS MATCHING FILTER
          </div>
        )}
      </div>

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

// ===================== STATS BAR =====================

function StatsBar({ events }: { events: ConflictEvent[] }) {
  const highIntensity = events.filter((e) => e.intensity >= 7).length;
  const uniqueCountries = new Set(events.map((e) => e.country).filter(Boolean)).size;

  return (
    <div className="flex flex-wrap gap-3 mb-4">
      <div
        className="flex items-center gap-2 py-1.5 px-3 rounded-lg text-[11px]"
        style={{ background: 'rgba(239,68,68,.06)', border: '1px solid rgba(239,68,68,.2)' }}
      >
        <span className="font-mono text-red-400">{highIntensity}</span>
        <span className="text-slate-500">HIGH INTENSITY</span>
      </div>
      <div
        className="flex items-center gap-2 py-1.5 px-3 rounded-lg text-[11px]"
        style={{ background: 'rgba(6,182,212,.06)', border: '1px solid rgba(6,182,212,.2)' }}
      >
        <span className="font-mono text-cyan-400">{events.length}</span>
        <span className="text-slate-500">EVENTS (24H)</span>
      </div>
      <div
        className="flex items-center gap-2 py-1.5 px-3 rounded-lg text-[11px]"
        style={{ background: 'rgba(139,92,246,.06)', border: '1px solid rgba(139,92,246,.2)' }}
      >
        <span className="font-mono text-purple-400">{uniqueCountries}</span>
        <span className="text-slate-500">COUNTRIES</span>
      </div>
      {Object.entries(EVENT_TYPES).map(([key, cfg]) => {
        const count = events.filter((e) => e.type === key).length;
        if (count === 0) return null;
        return (
          <div
            key={key}
            className="flex items-center gap-2 py-1.5 px-3 rounded-lg text-[11px]"
            style={{ background: `${cfg.color}08`, border: `1px solid ${cfg.color}20` }}
          >
            <span className="text-[10px]">{cfg.icon}</span>
            <span className="font-mono" style={{ color: cfg.color }}>{count}</span>
            <span className="text-slate-600 text-[10px]">{cfg.label.toUpperCase()}</span>
          </div>
        );
      })}
    </div>
  );
}

// ===================== VIGIL OVERLAY =====================

function VIGILOverlay() {
  return (
    <div className="mb-4">
      <div className="font-mono text-[10px] text-slate-500 uppercase mb-2">VIGIL Operations</div>
      <div className="flex gap-3 flex-wrap">
        {VIGIL_OPS.map((op) => (
          <div
            key={op.code}
            className="flex items-center gap-2 py-1.5 px-3 rounded-lg text-[11px]"
            style={{ background: `${op.color}08`, border: `1px solid ${op.color}25` }}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: op.color, boxShadow: `0 0 6px ${op.color}60` }}
            />
            <span className="font-mono font-bold" style={{ color: op.color }}>{op.code}</span>
            <span className="text-slate-400">{op.name}</span>
            <span
              className="font-mono text-[9px] py-0.5 px-1.5 rounded"
              style={{ background: 'rgba(16,185,129,.1)', color: '#10b981' }}
            >
              {op.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===================== WORLD MAP =====================

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

// Country centroids for plotting events by country name
const COUNTRY_COORDS: Record<string, [number, number]> = {
  'united states': [-98.5, 39.8], 'united kingdom': [-1.2, 52.3], 'russia': [105, 61],
  'china': [104, 35], 'ukraine': [32, 48.3], 'israel': [34.8, 31.5], 'iran': [53, 32.4],
  'syria': [38, 35], 'iraq': [44, 33], 'afghanistan': [67, 33], 'pakistan': [69, 30],
  'india': [79, 21], 'australia': [134, -25], 'france': [2.2, 46.2], 'germany': [10.4, 51.2],
  'turkey': [35.2, 39], 'saudi arabia': [45, 24], 'egypt': [30, 27], 'nigeria': [8, 10],
  'south africa': [25, -29], 'brazil': [-51, -14], 'mexico': [-102, 23.6], 'japan': [138, 36],
  'south korea': [128, 36], 'north korea': [127, 40], 'taiwan': [121, 23.5],
  'yemen': [48, 15.5], 'libya': [17, 27], 'sudan': [30, 15], 'somalia': [46, 6],
  'ethiopia': [40, 9], 'congo': [25, -3], 'myanmar': [96, 19], 'thailand': [101, 15],
  'philippines': [122, 12], 'indonesia': [113, -2], 'canada': [-106, 56],
  'poland': [20, 52], 'romania': [25, 46], 'lebanon': [35.8, 33.8], 'jordan': [36.2, 31.2],
  'palestine': [35.2, 31.9], 'gaza': [34.4, 31.4], 'mali': [-2, 17], 'niger': [8, 17],
  'chad': [19, 15], 'mozambique': [35, -18], 'burkina faso': [-1.5, 12.3],
};

function getEventCoords(event: ConflictEvent): [number, number] | null {
  if (event.lat && event.lng) return [event.lng, event.lat];
  const country = (event.country || '').toLowerCase();
  if (COUNTRY_COORDS[country]) return COUNTRY_COORDS[country];
  // Try matching partial country name from title
  const titleLower = event.title.toLowerCase();
  for (const [name, coords] of Object.entries(COUNTRY_COORDS)) {
    if (titleLower.includes(name)) return coords;
  }
  return null;
}

function WorldMap({ events, selectedType, vigilOps }: {
  events: ConflictEvent[];
  selectedType: string | null;
  vigilOps: VIGILOperation[];
}) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);

  const plottableEvents = useMemo(() => {
    const filtered = selectedType ? events.filter(e => e.type === selectedType) : events;
    return filtered
      .map(e => ({ ...e, coords: getEventCoords(e) }))
      .filter(e => e.coords !== null) as (ConflictEvent & { coords: [number, number] })[];
  }, [events, selectedType]);

  // Build country heat map — count events per country for fill color
  const countryHeat = useMemo(() => {
    const counts: Record<string, number> = {};
    plottableEvents.forEach(e => {
      const c = (e.country || '').toLowerCase();
      if (c && c !== 'unknown') counts[c] = (counts[c] || 0) + 1;
    });
    return counts;
  }, [plottableEvents]);

  function getCountryFill(geoName: string): string {
    const name = geoName.toLowerCase();
    const count = countryHeat[name] || 0;
    if (count === 0) return '#0d1520';
    if (count === 1) return '#1a1a2e';
    if (count <= 3) return '#2a1a1a';
    if (count <= 6) return '#3d1515';
    return '#4a1010';
  }

  return (
    <div className="relative bg-[#040810] border border-[#1e2d44] rounded-xl overflow-hidden mb-4" style={{ borderTop: '2px solid #ef4444' }}>
      {/* Map header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#0a1018] border-b border-[#1e2d44]">
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center w-4 h-4">
            <span className="absolute w-2 h-2 rounded-full bg-red-500 animate-ping opacity-50" />
            <span className="relative w-1.5 h-1.5 rounded-full bg-red-500" />
          </div>
          <span className="font-mono text-[12px] font-bold text-slate-200 tracking-wider">GLOBAL THREAT MAP</span>
        </div>
        <span className="font-mono text-[10px] text-slate-500">{plottableEvents.length} PLOTTED {'\u2022'} {Object.keys(countryHeat).length} COUNTRIES</span>
      </div>

      {/* Map */}
      <div className="relative" style={{ height: '520px', background: 'radial-gradient(ellipse at center, #0a1225 0%, #040810 70%)' }}>
        {/* Ocean grid effect */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(6,182,212,1) 1px, transparent 1px), linear-gradient(90deg, rgba(6,182,212,1) 1px, transparent 1px)',
          backgroundSize: '30px 30px',
        }} />

        <ComposableMap
          projection="geoNaturalEarth1"
          projectionConfig={{ scale: 160, center: [15, 15] }}
          style={{ width: '100%', height: '100%' }}
        >
          <ZoomableGroup minZoom={1} maxZoom={8}>
            {/* Subtle graticule effect via defs */}
            <defs>
              <radialGradient id="markerGlow">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
              </radialGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map((geo) => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={getCountryFill(geo.properties?.name || '')}
                    stroke="#1a2740"
                    strokeWidth={0.4}
                    style={{
                      default: { outline: 'none', transition: 'fill 0.3s' },
                      hover: { fill: '#1e3050', outline: 'none', cursor: 'pointer' },
                      pressed: { outline: 'none' },
                    }}
                  />
                ))
              }
            </Geographies>

            {/* Event markers — outer glow ring */}
            {plottableEvents.map((event, i) => {
              const cfg = EVENT_TYPES[event.type] || EVENT_TYPES['political-crisis'];
              const size = Math.max(5, Math.min(14, event.intensity * 1.3));
              return (
                <Marker
                  key={`${event.id}-${i}`}
                  coordinates={event.coords}
                  onMouseEnter={(e) => {
                    const rect = (e.target as HTMLElement).closest('svg')?.getBoundingClientRect();
                    if (rect) setTooltip({
                      x: e.clientX - rect.left,
                      y: e.clientY - rect.top,
                      content: `${cfg.icon} ${event.title}\n${cfg.label} \u2022 Intensity: ${event.intensity}/10 \u2022 ${event.source}`,
                    });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                >
                  {/* Outer glow */}
                  <circle r={size * 2} fill={cfg.color} fillOpacity={0.06} />
                  {/* Mid ring */}
                  <circle r={size} fill={cfg.color} fillOpacity={0.2} stroke={cfg.color} strokeWidth={0.8} strokeOpacity={0.4} />
                  {/* Core dot */}
                  <circle r={size * 0.35} fill={cfg.color} fillOpacity={1} filter="url(#glow)" />
                  {/* Pulse animation for high intensity */}
                  {event.intensity >= 6 && (
                    <>
                      <circle r={size} fill="none" stroke={cfg.color} strokeWidth={0.6} opacity={0.5}>
                        <animate attributeName="r" from={String(size * 0.8)} to={String(size * 2.5)} dur="3s" repeatCount="indefinite" />
                        <animate attributeName="opacity" from="0.5" to="0" dur="3s" repeatCount="indefinite" />
                      </circle>
                      {event.intensity >= 8 && (
                        <circle r={size} fill="none" stroke={cfg.color} strokeWidth={0.4} opacity={0.3}>
                          <animate attributeName="r" from={String(size)} to={String(size * 3)} dur="4s" repeatCount="indefinite" begin="1.5s" />
                          <animate attributeName="opacity" from="0.3" to="0" dur="4s" repeatCount="indefinite" begin="1.5s" />
                        </circle>
                      )}
                    </>
                  )}
                </Marker>
              );
            })}

            {/* VIGIL operation markers — diamond shape with glow */}
            {vigilOps.map((op) => (
              <Marker key={op.code} coordinates={[op.lng, op.lat]}>
                {/* Glow ring */}
                <circle r={16} fill={op.color} fillOpacity={0.05} />
                <circle r={10} fill="none" stroke={op.color} strokeWidth={0.5} strokeOpacity={0.3} strokeDasharray="3,3">
                  <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="20s" repeatCount="indefinite" />
                </circle>
                {/* Diamond */}
                <polygon points="0,-7 5,0 0,7 -5,0" fill={op.color} fillOpacity={0.9} stroke={op.color} strokeWidth={1.5} filter="url(#glow)" />
                {/* Label */}
                <text textAnchor="middle" y={-13} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '8px', fill: op.color, fontWeight: 700, letterSpacing: '0.05em' }}>
                  {op.code}
                </text>
                <text textAnchor="middle" y={18} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '5px', fill: op.color, fontWeight: 400, opacity: 0.7 }}>
                  {op.name}
                </text>
              </Marker>
            ))}
          </ZoomableGroup>
        </ComposableMap>

        {/* Enhanced tooltip */}
        {tooltip && (
          <div
            className="absolute pointer-events-none z-20 max-w-[280px]"
            style={{ left: Math.min(tooltip.x + 12, 600), top: Math.max(tooltip.y - 20, 10) }}
          >
            <div className="bg-[#0a1018]/95 backdrop-blur-sm border border-[#2a3f5f] rounded-lg px-3 py-2 shadow-xl shadow-black/50">
              {tooltip.content.split('\n').map((line, i) => (
                <div key={i} className={i === 0 ? 'text-[11px] text-slate-200 font-medium leading-snug' : 'text-[9px] text-slate-400 mt-1 font-mono'}>
                  {line}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-3 left-3 bg-[#0a0f1a]/95 backdrop-blur-sm border border-[#1e2d44] rounded-lg px-3 py-2.5">
          <div className="text-[8px] text-slate-500 font-mono font-bold mb-1.5 tracking-wider">EVENT TYPES</div>
          <div className="grid grid-cols-3 gap-x-4 gap-y-1">
            {Object.entries(EVENT_TYPES).map(([, cfg]) => (
              <div key={cfg.label} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.color, boxShadow: `0 0 4px ${cfg.color}60` }} />
                <span className="text-[9px] text-slate-400">{cfg.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-1.5 pt-1.5 border-t border-[#1e2d44] flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] text-cyan-500">{'\u25C6'}</span>
              <span className="text-[9px] text-slate-400">VIGIL OP</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-2 rounded-sm" style={{ background: 'linear-gradient(90deg, #0d1520, #4a1010)' }} />
              <span className="text-[9px] text-slate-400">Heat density</span>
            </div>
          </div>
        </div>

        {/* Zoom hint */}
        <div className="absolute top-3 right-3 text-[9px] text-slate-600 font-mono">
          SCROLL TO ZOOM {'\u2022'} DRAG TO PAN
        </div>
      </div>
    </div>
  );
}

// ===================== MAIN COMPONENT =====================

export default function ConflictMapTab() {
  const [events, setEvents] = useState<ConflictEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lastFetch, setLastFetch] = useState('');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('conflict OR war OR crisis OR military');
  const [activePreset, setActivePreset] = useState('ALL');

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchGDELTEvents(searchQuery);
      setEvents(data);
      setLastFetch(new Date().toISOString());
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchEvents();
    // Refresh every 10 minutes
    const interval = setInterval(fetchEvents, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchEvents]);

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-gradient-to-br from-red-600 to-orange-600">
              {'\u{1F30D}'}
            </div>
            <div>
              <h2
                className="text-[16px] font-bold tracking-[.12em] text-red-400"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                ATLAS
              </h2>
              <div className="text-[10px] text-slate-500">
                Live Global Conflict Monitor — Powered by GDELT
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {lastFetch && (
              <span className="font-mono text-[9px] text-slate-600">
                UPD {new Date(lastFetch).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <div className="flex items-center gap-1.5">
              <div className="relative flex items-center justify-center w-4 h-4">
                <span className="absolute w-2 h-2 rounded-full bg-red-500 animate-ping opacity-75" />
                <span className="relative w-1.5 h-1.5 rounded-full bg-red-500" />
              </div>
              <span className="font-mono text-[10px] text-red-400">LIVE</span>
            </div>
            <button
              onClick={fetchEvents}
              disabled={loading}
              className="font-mono text-[9px] text-cyan-500 hover:text-cyan-400 transition-colors disabled:opacity-50"
            >
              {'\u21BB'} REFRESH
            </button>
          </div>
        </div>
      </div>

      {/* VIGIL Operations overlay */}
      <VIGILOverlay />

      {/* Region presets */}
      <div className="flex gap-2 mb-4 flex-wrap items-center">
        {[
          { label: 'ALL', q: 'conflict OR war OR crisis OR military' },
          { label: 'Middle East', q: 'Israel OR Iran OR Syria OR Yemen OR Gaza conflict' },
          { label: 'Ukraine/Russia', q: 'Ukraine OR Russia military OR Crimea' },
          { label: 'Africa', q: 'Africa conflict OR Sudan OR Congo OR Sahel OR Ethiopia' },
          { label: 'Asia-Pacific', q: 'China OR Taiwan OR South China Sea OR North Korea OR Myanmar' },
          { label: 'Cyber Ops', q: 'cyberattack OR ransomware OR APT OR state-sponsored hack' },
          { label: 'Terrorism', q: 'terrorism OR ISIS OR al-Qaeda OR extremist attack' },
          { label: 'Five Eyes', q: 'Australia OR United States OR United Kingdom intelligence OR security' },
        ].map((preset) => (
          <button
            key={preset.label}
            onClick={() => { setSearchQuery(preset.q); setActivePreset(preset.label); }}
            className="py-1.5 px-2.5 rounded text-[10px] font-mono transition-colors"
            style={{
              background: activePreset === preset.label ? 'rgba(239,68,68,.15)' : 'rgba(255,255,255,.03)',
              color: activePreset === preset.label ? '#ef4444' : '#64748b',
              border: `1px solid ${activePreset === preset.label ? 'rgba(239,68,68,.3)' : 'rgba(255,255,255,.06)'}`,
            }}
          >
            {preset.label}
          </button>
        ))}

        <button
          onClick={fetchEvents}
          disabled={loading}
          className="ml-auto px-4 py-1.5 rounded-lg font-mono text-[10px] font-bold tracking-wider text-white transition-all disabled:opacity-30"
          style={{ background: 'linear-gradient(135deg, #ef4444, #f59e0b)' }}
        >
          {loading ? 'SCANNING...' : 'SCAN'}
        </button>
      </div>

      {/* Stats bar */}
      {events.length > 0 && <StatsBar events={events} />}

      {/* Interactive World Map */}
      {events.length > 0 && (
        <WorldMap events={events} selectedType={selectedType} vigilOps={VIGIL_OPS} />
      )}

      {/* Main content area */}
      <div className="bg-[#111b2a] border border-[#1e2d44] rounded-xl overflow-hidden" style={{ borderTop: '2px solid #ef4444' }}>
        {/* Feed header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#0d1520] border-b border-[#1e2d44]">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] font-bold text-slate-200 tracking-wider">CONFLICT FEED</span>
            <span className="font-mono text-[9px] text-slate-500">
              {events.length} EVENTS {'\u2022'} LAST 24H {'\u2022'} GDELT
            </span>
          </div>
        </div>

        {/* Loading state */}
        {loading && events.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-6 h-6 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin mx-auto mb-3" />
              <div className="font-mono text-[11px] text-slate-500">SCANNING GLOBAL CONFLICT DATA...</div>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && events.length === 0 && (
          <div className="flex items-center justify-center py-8">
            <div className="font-mono text-[11px] text-red-400">
              {'\u26A0\uFE0F'} GDELT FEED OFFLINE — Check internet connection
            </div>
          </div>
        )}

        {/* Event feed */}
        {events.length > 0 && (
          <EventFeed events={events} selectedType={selectedType} onTypeFilter={setSelectedType} />
        )}
      </div>

      {/* Footer note */}
      <div className="mt-3 text-center">
        <span className="font-mono text-[9px] text-slate-600">
          Data sourced from GDELT Project {'\u2022'} Cached 5 min {'\u2022'} Auto-refresh every 10 min
        </span>
      </div>

    </div>
  );
}
