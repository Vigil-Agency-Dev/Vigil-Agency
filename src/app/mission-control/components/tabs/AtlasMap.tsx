'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';

// Dynamic import for SSR safety (Three.js needs browser)
const Globe = dynamic(() => import('react-globe.gl'), { ssr: false });

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface InfraFeature {
  id: string;
  name: string;
  type: string;
  priority: string;
  note?: string;
  country?: string;
  coordinates: [number, number]; // [lon, lat]
}

interface Vessel {
  mmsi: string;
  name: string;
  flag: string;
  lat: number;
  lon: number;
  zone: string;
  lastSeen: string;
}

interface ThermalDetection {
  area: string;
  lat: number;
  lon: number;
  frp: number;
  confidence: string;
}

interface ConflictEvent {
  id: string;
  lat: number;
  lng: number;
  type: string;
  country: string;
  location: string;
  fatalities: number;
  date: string;
}

interface DarkAlert {
  mmsi: string;
  name: string;
  lastKnown: { lat: number; lon: number; zone: string };
  reappeared: { lat: number; lon: number; zone: string };
  gapMinutes: number;
}

interface AtlasMapProps {
  infrastructure: InfraFeature[];
  vessels: Vessel[];
  thermal: ThermalDetection[];
  events: ConflictEvent[];
  darkAlerts: DarkAlert[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const MAP_PRESETS = [
  { id: 'global', label: 'Global', lat: 25, lng: 45, alt: 2.5 },
  { id: 'hormuz', label: 'Hormuz', lat: 26.5, lng: 56.3, alt: 0.15 },
  { id: 'gulf', label: 'Persian Gulf', lat: 27, lng: 51, alt: 0.4 },
  { id: 'bab', label: 'Bab el-Mandeb', lat: 12.8, lng: 43.2, alt: 0.2 },
  { id: 'redsea', label: 'Red Sea', lat: 22, lng: 38, alt: 0.6 },
  { id: 'mideast', label: 'Middle East', lat: 30, lng: 48, alt: 0.8 },
  { id: 'iran', label: 'Iran', lat: 33, lng: 53, alt: 0.5 },
  { id: 'med', label: 'E. Med', lat: 34, lng: 33, alt: 0.3 },
];

const INFRA_COLORS: Record<string, string> = {
  military: '#ef4444',
  nuclear: '#f59e0b',
  refinery: '#f97316',
  pipeline: '#8b5cf6',
  port: '#06b6d4',
  desalination: '#3b82f6',
  chokepoint: '#ec4899',
};

const PRIORITY_RADIUS: Record<string, number> = {
  CRITICAL: 0.35,
  HIGH: 0.25,
  ELEVATED: 0.18,
  MONITORING: 0.12,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function AtlasMap({ infrastructure, vessels, thermal, events, darkAlerts }: AtlasMapProps) {
  const globeRef = useRef<any>(null);
  const [is3D, setIs3D] = useState(true);
  const [layers, setLayers] = useState({
    infra: true,
    vessels: true,
    thermal: true,
    events: false,
    dark: true,
  });

  const toggleLayer = (key: string) => setLayers(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }));

  // Navigate to preset
  const goTo = useCallback((preset: typeof MAP_PRESETS[0]) => {
    if (globeRef.current) {
      globeRef.current.pointOfView({ lat: preset.lat, lng: preset.lng, altitude: preset.alt }, 1000);
    }
  }, []);

  // Initial view
  useEffect(() => {
    if (globeRef.current) {
      globeRef.current.pointOfView({ lat: 25, lng: 45, altitude: 2.5 }, 0);
      // Dark styling
      globeRef.current.controls().autoRotate = false;
    }
  }, []);

  // Build point data arrays for the globe
  const infraPoints = useMemo(() => {
    if (!layers.infra) return [];
    return infrastructure.map(f => ({
      lat: f.coordinates[1],
      lng: f.coordinates[0],
      size: PRIORITY_RADIUS[f.priority] || 0.15,
      color: INFRA_COLORS[f.type] || '#64748b',
      label: `${f.name}\n${f.type.toUpperCase()} | ${f.priority}${f.note ? '\n' + f.note : ''}`,
      type: f.type,
      priority: f.priority,
    }));
  }, [infrastructure, layers.infra]);

  const vesselPoints = useMemo(() => {
    if (!layers.vessels) return [];
    return vessels.map(v => ({
      lat: v.lat,
      lng: v.lon,
      size: 0.12,
      color: '#06b6d4',
      label: `${v.name.trim() === 'UNKNOWN' ? 'Vessel ' + v.mmsi : v.name.trim()}\nMMSI: ${v.mmsi} | ${v.zone}`,
    }));
  }, [vessels, layers.vessels]);

  const thermalPoints = useMemo(() => {
    if (!layers.thermal) return [];
    return thermal.map(t => ({
      lat: t.lat,
      lng: t.lon,
      size: Math.max(0.2, Math.min(0.6, t.frp / 100)),
      color: '#ef4444',
      label: `THERMAL: ${t.area}\nFRP ${t.frp}MW | ${t.confidence}`,
    }));
  }, [thermal, layers.thermal]);

  const eventPoints = useMemo(() => {
    if (!layers.events) return [];
    return events.map(e => ({
      lat: e.lat,
      lng: e.lng,
      size: Math.max(0.08, Math.min(0.4, e.fatalities * 0.04)),
      color: '#f59e0b',
      label: `${e.type}: ${e.location}, ${e.country}\n${e.date} | ${e.fatalities} fatalities`,
    }));
  }, [events, layers.events]);

  // Dark vessel arcs
  const darkArcs = useMemo(() => {
    if (!layers.dark) return [];
    return darkAlerts.map(d => ({
      startLat: d.lastKnown.lat,
      startLng: d.lastKnown.lon,
      endLat: d.reappeared.lat,
      endLng: d.reappeared.lon,
      color: ['#ec4899', '#ef4444'],
      label: `DARK TRANSIT: ${d.name}\n${d.lastKnown.zone} → ${d.reappeared.zone} | ${d.gapMinutes}min dark`,
    }));
  }, [darkAlerts, layers.dark]);

  // Combine all points
  const allPoints = useMemo(() => [
    ...infraPoints,
    ...vesselPoints,
    ...thermalPoints,
    ...eventPoints,
  ], [infraPoints, vesselPoints, thermalPoints, eventPoints]);

  // Ring data for thermal (pulsing effect)
  const thermalRings = useMemo(() => {
    if (!layers.thermal) return [];
    return thermal.map(t => ({
      lat: t.lat,
      lng: t.lon,
      maxR: 1.5,
      propagationSpeed: 2,
      repeatPeriod: 1500,
      color: () => '#ef4444',
    }));
  }, [thermal, layers.thermal]);

  return (
    <div className="relative">
      {/* Controls */}
      <div className="flex items-center gap-2 flex-wrap mb-2">
        {/* 3D/2D toggle */}
        <button
          onClick={() => setIs3D(!is3D)}
          className="text-[9px] font-mono px-2.5 py-1 rounded border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-all"
        >
          {is3D ? '3D GLOBE' : '2D FLAT'} {'\u21C4'}
        </button>

        <div className="w-px h-4 bg-[#2a3550]" />

        {/* Preset navigation */}
        {MAP_PRESETS.map(p => (
          <button
            key={p.id}
            onClick={() => goTo(p)}
            className="text-[9px] font-mono px-2 py-1 rounded border border-[#2a3550] text-slate-500 hover:text-cyan-400 hover:border-cyan-500/30 transition-all"
          >
            {p.label}
          </button>
        ))}

        <div className="w-px h-4 bg-[#2a3550]" />

        {/* Layer toggles */}
        {[
          { key: 'infra', label: 'Infrastructure', color: '#f97316' },
          { key: 'vessels', label: 'Vessels', color: '#06b6d4' },
          { key: 'thermal', label: 'Thermal', color: '#ef4444' },
          { key: 'events', label: 'Conflicts', color: '#f59e0b' },
          { key: 'dark', label: 'Dark Ships', color: '#ec4899' },
        ].map(l => (
          <button
            key={l.key}
            onClick={() => toggleLayer(l.key)}
            className="text-[9px] font-mono px-2 py-1 rounded border transition-all flex items-center gap-1"
            style={{
              borderColor: layers[l.key as keyof typeof layers] ? `${l.color}60` : '#2a3550',
              color: layers[l.key as keyof typeof layers] ? l.color : '#64748b',
              background: layers[l.key as keyof typeof layers] ? `${l.color}10` : 'transparent',
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: layers[l.key as keyof typeof layers] ? l.color : '#64748b' }} />
            {l.label}
          </button>
        ))}
      </div>

      {/* Globe / Map container */}
      <div className="rounded-xl overflow-hidden border border-[#1e2d44] bg-[#050a12]" style={{ height: 560 }}>
        {typeof window !== 'undefined' && (
          <Globe
            ref={globeRef}
            globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
            backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
            bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
            showAtmosphere={is3D}
            atmosphereColor="#1e4d8c"
            atmosphereAltitude={0.25}
            width={typeof window !== 'undefined' ? Math.min(window.innerWidth - 40, 1400) : 900}
            height={560}

            // Points layer
            pointsData={allPoints}
            pointLat="lat"
            pointLng="lng"
            pointColor="color"
            pointAltitude={0.01}
            pointRadius="size"
            pointLabel="label"
            pointsMerge={false}

            // Arcs layer (dark vessel transits)
            arcsData={darkArcs}
            arcStartLat="startLat"
            arcStartLng="startLng"
            arcEndLat="endLat"
            arcEndLng="endLng"
            arcColor="color"
            arcDashLength={0.4}
            arcDashGap={0.2}
            arcDashAnimateTime={2000}
            arcStroke={0.8}
            arcLabel="label"

            // Rings layer (thermal pulsing)
            ringsData={thermalRings}
            ringLat="lat"
            ringLng="lng"
            ringMaxRadius="maxR"
            ringPropagationSpeed="propagationSpeed"
            ringRepeatPeriod="repeatPeriod"
            ringColor="color"
          />
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 flex-wrap mt-2 px-1">
        {Object.entries(INFRA_COLORS).filter(([k]) => k !== 'pipeline').map(([type, color]) => (
          <div key={type} className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ background: color }} />
            <span className="text-[8px] font-mono text-slate-500 uppercase">{type}</span>
          </div>
        ))}
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          <span className="text-[8px] font-mono text-slate-500">VESSEL</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-pink-500" />
          <span className="text-[8px] font-mono text-slate-500">DARK TRANSIT</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-yellow-400" />
          <span className="text-[8px] font-mono text-slate-500">CONFLICT</span>
        </div>
      </div>
    </div>
  );
}
