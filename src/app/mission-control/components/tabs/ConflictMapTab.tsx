'use client';

import React, { useState } from 'react';
import { Dot } from '../ui';

const PRESETS: Record<string, { label: string; lat: number; lon: number; zoom: number; layers: string; priority: string }> = {
  global: { label: 'Global Overview', lat: 20, lon: 0, zoom: 1, layers: 'conflicts,bases,hotspots,nuclear,sanctions,weather,economic,waterways,outages,military,natural,iranAttacks', priority: 'ALL' },
  hormuz: { label: 'Strait of Hormuz', lat: 26.5, lon: 56.3, zoom: 6, layers: 'conflicts,bases,military,waterways,iranAttacks', priority: 'CRITICAL' },
  middleeast: { label: 'Middle East Theatre', lat: 29, lon: 47, zoom: 4, layers: 'conflicts,bases,hotspots,nuclear,military,iranAttacks', priority: 'CRITICAL' },
  babelmandeb: { label: 'Bab el-Mandeb / Red Sea', lat: 13, lon: 43, zoom: 5, layers: 'conflicts,bases,military,waterways', priority: 'CRITICAL' },
  persian_gulf: { label: 'Persian Gulf (5th Fleet)', lat: 27, lon: 51, zoom: 5, layers: 'conflicts,bases,military,waterways', priority: 'HIGH' },
  iran_nuclear: { label: 'Iran Nuclear Sites', lat: 32, lon: 53, zoom: 5, layers: 'nuclear,bases,military,sanctions', priority: 'HIGH' },
  suez: { label: 'Suez Canal', lat: 30.5, lon: 32.4, zoom: 7, layers: 'waterways,military,economic', priority: 'HIGH' },
  east_med: { label: 'Eastern Mediterranean', lat: 34, lon: 35, zoom: 5, layers: 'conflicts,bases,hotspots,military', priority: 'ELEVATED' },
  ukraine: { label: 'Ukraine / Black Sea', lat: 48, lon: 35, zoom: 5, layers: 'conflicts,bases,hotspots,military', priority: 'MONITORING' },
  indopacific: { label: 'Indo-Pacific / South China Sea', lat: 15, lon: 115, zoom: 4, layers: 'conflicts,bases,military,waterways', priority: 'MONITORING' },
  europe_nato: { label: 'NATO Europe', lat: 50, lon: 15, zoom: 4, layers: 'bases,military,nuclear', priority: 'MONITORING' },
  australia: { label: 'Australia / AUKUS', lat: -25, lon: 135, zoom: 4, layers: 'bases,military,waterways', priority: 'MONITORING' },
};

const PRIORITY_COLORS: Record<string, string> = {
  ALL: '#06b6d4',
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  ELEVATED: '#f59e0b',
  MONITORING: '#64748b',
};

export default function ConflictMapTab() {
  const [activePreset, setActivePreset] = useState('global');
  const [customLayers, setCustomLayers] = useState('');
  const [fullscreen, setFullscreen] = useState(false);

  const preset = PRESETS[activePreset];
  const layers = customLayers || preset.layers;
  const iframeUrl = `https://www.worldmonitor.app/?lat=${preset.lat.toFixed(4)}&lon=${preset.lon.toFixed(4)}&zoom=${preset.zoom.toFixed(2)}&view=global&timeRange=7d&layers=${encodeURIComponent(layers)}`;

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Dot color="#10b981" pulse />
          <span className="font-mono text-[10px] tracking-wider text-emerald-400">
            WORLD MONITOR: LIVE — 45 LAYERS · 435+ SOURCES
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setFullscreen(!fullscreen)}
            className="text-[10px] font-mono text-cyan-400 px-2 py-1 border border-cyan-500/20 rounded hover:bg-cyan-500/10">
            {fullscreen ? 'EXIT FULLSCREEN' : 'FULLSCREEN'}
          </button>
        </div>
      </div>

      {/* Preset Selector */}
      <div className="flex items-center gap-2 flex-wrap">
        {Object.entries(PRESETS).map(([key, p]) => {
          const pc = PRIORITY_COLORS[p.priority] || '#64748b';
          return (
            <button key={key} onClick={() => { setActivePreset(key); setCustomLayers(''); }}
              className={`text-[10px] font-mono px-2.5 py-1 rounded border transition-all flex items-center gap-1.5 ${activePreset === key ? 'bg-white/[.05]' : 'border-[#2a3550] text-slate-500 hover:text-slate-300'}`}
              style={activePreset === key ? { borderColor: `${pc}50`, color: pc } : undefined}>
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: pc }} />
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Map Container */}
      <div className={`rounded-xl border border-[#2a3550] overflow-hidden bg-[#060a12] ${fullscreen ? 'fixed inset-0 z-[300] rounded-none' : ''}`}
        style={{ height: fullscreen ? '100vh' : '700px' }}>

        {/* Fullscreen close button */}
        {fullscreen && (
          <button onClick={() => setFullscreen(false)}
            className="absolute top-4 right-4 z-[301] bg-black/80 text-white px-3 py-1.5 rounded-lg text-[11px] font-mono hover:bg-black/90 border border-white/20">
            EXIT FULLSCREEN (ESC)
          </button>
        )}

        {/* Info bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#111827] border-b border-[#1e2d44]">
          <div className="flex items-center gap-3">
            <span className="text-[12px] font-bold text-slate-200" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              {'\uD83C\uDF0D'} {preset.label}
            </span>
            <span className="font-mono text-[9px] px-1.5 py-0.5 rounded" style={{ background: `${PRIORITY_COLORS[preset.priority]}15`, color: PRIORITY_COLORS[preset.priority] }}>
              {preset.priority}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[9px] text-slate-500 font-mono">
            <span>LAT: {preset.lat}</span>
            <span>LON: {preset.lon}</span>
            <span>ZOOM: {preset.zoom}</span>
            <span>{'\u2022'}</span>
            <span>Powered by World Monitor / Elie Habib</span>
          </div>
        </div>

        {/* Iframe */}
        <iframe
          src={iframeUrl}
          className="w-full border-0"
          style={{ height: fullscreen ? 'calc(100vh - 40px)' : '660px' }}
          allow="fullscreen; geolocation"
          loading="lazy"
          title={`World Monitor: ${preset.label}`}
        />
      </div>

      {/* Layer Legend */}
      <div className="bg-[#111b2a] border border-[#1e2d44] rounded-xl p-4">
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">ACTIVE LAYERS</div>
        <div className="flex flex-wrap gap-2">
          {layers.split(',').map(layer => (
            <span key={layer} className="text-[9px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              {layer}
            </span>
          ))}
        </div>
        <div className="mt-3 text-[10px] text-slate-600">
          Features: Military ADS-B flight tracking, maritime AIS vessel tracking, dark vessel detection, real-time conflict data (ACLED/UCDP), country instability index, stock/commodity/crypto markets, infrastructure monitoring, power outages, earthquakes, protests, AI-powered daily briefs.
        </div>
      </div>
    </div>
  );
}
