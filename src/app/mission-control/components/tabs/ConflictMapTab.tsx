'use client';

import React, { useState } from 'react';
import { Dot } from '../ui';

interface Preset {
  label: string;
  lat: number;
  lon: number;
  zoom: number;
  layers: string;
  priority: string;
  description: string;
  features: string[];
}

const PRESETS: Record<string, Preset> = {
  global: { label: 'Global Overview', lat: 20, lon: 0, zoom: 1, layers: 'conflicts,bases,hotspots,nuclear,sanctions,weather,economic,waterways,outages,military,natural,iranAttacks', priority: 'ALL', description: 'Full global picture. All layers active.', features: ['Conflicts', 'Military Bases', 'Hotspots', 'Nuclear Sites', 'Sanctions', 'Weather', 'Economic', 'Waterways', 'Outages', 'Military', 'Natural Disasters', 'Iran Attacks'] },
  hormuz: { label: 'Strait of Hormuz', lat: 26.5, lon: 56.3, zoom: 6, layers: 'conflicts,bases,military,waterways,iranAttacks', priority: 'CRITICAL', description: '21% of global oil flow. IRGC fast-boats, tanker movements, mine-laying indicators.', features: ['Conflicts', 'Bases', 'Military', 'Waterways', 'Iran Attacks'] },
  middleeast: { label: 'Middle East Theatre', lat: 29, lon: 47, zoom: 4, layers: 'conflicts,bases,hotspots,nuclear,military,iranAttacks', priority: 'CRITICAL', description: 'Full theatre view. Iran, Iraq, Gulf states, Israel, Yemen.', features: ['Conflicts', 'Bases', 'Hotspots', 'Nuclear', 'Military', 'Iran Attacks'] },
  babelmandeb: { label: 'Bab el-Mandeb / Red Sea', lat: 13, lon: 43, zoom: 5, layers: 'conflicts,bases,military,waterways', priority: 'CRITICAL', description: 'Houthi targeting zone. Combined with Hormuz covers 32% of global oil flow.', features: ['Conflicts', 'Bases', 'Military', 'Waterways'] },
  persian_gulf: { label: 'Persian Gulf (5th Fleet)', lat: 27, lon: 51, zoom: 5, layers: 'conflicts,bases,military,waterways', priority: 'HIGH', description: 'US 5th Fleet AOR. Bahrain (NSA), Qatar (Al Udeid), UAE.', features: ['Conflicts', 'Bases', 'Military', 'Waterways'] },
  iran_nuclear: { label: 'Iran Nuclear Sites', lat: 32, lon: 53, zoom: 5, layers: 'nuclear,bases,military,sanctions', priority: 'HIGH', description: 'Bushehr, Natanz, Isfahan. Enrichment and power facilities.', features: ['Nuclear', 'Bases', 'Military', 'Sanctions'] },
  suez: { label: 'Suez Canal', lat: 30.5, lon: 32.4, zoom: 7, layers: 'waterways,military,economic', priority: 'HIGH', description: 'Global shipping chokepoint. Rerouting alternative if Hormuz closed.', features: ['Waterways', 'Military', 'Economic'] },
  east_med: { label: 'Eastern Mediterranean', lat: 34, lon: 35, zoom: 5, layers: 'conflicts,bases,hotspots,military', priority: 'ELEVATED', description: 'Israel-Hezbollah border. Potential escalation if Iran conflict widens.', features: ['Conflicts', 'Bases', 'Hotspots', 'Military'] },
  ukraine: { label: 'Ukraine / Black Sea', lat: 48, lon: 35, zoom: 5, layers: 'conflicts,bases,hotspots,military', priority: 'MONITORING', description: 'Active conflict zone. NATO eastern flank. Black Sea naval activity.', features: ['Conflicts', 'Bases', 'Hotspots', 'Military'] },
  indopacific: { label: 'Indo-Pacific / SCS', lat: 15, lon: 115, zoom: 4, layers: 'conflicts,bases,military,waterways', priority: 'MONITORING', description: 'South China Sea. Taiwan Strait. AUKUS theatre.', features: ['Conflicts', 'Bases', 'Military', 'Waterways'] },
  europe_nato: { label: 'NATO Europe', lat: 50, lon: 15, zoom: 4, layers: 'bases,military,nuclear', priority: 'MONITORING', description: 'Alliance military infrastructure. Incirlik, Sigonella, Ramstein.', features: ['Bases', 'Military', 'Nuclear'] },
  australia: { label: 'Australia / AUKUS', lat: -25, lon: 135, zoom: 4, layers: 'bases,military,waterways', priority: 'MONITORING', description: 'Home theatre. Pine Gap, HMAS Stirling, Northern bases.', features: ['Bases', 'Military', 'Waterways'] },
};

const PRIORITY_COLORS: Record<string, string> = {
  ALL: '#06b6d4',
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  ELEVATED: '#f59e0b',
  MONITORING: '#64748b',
};

function buildUrl(preset: Preset) {
  return `https://www.worldmonitor.app/?lat=${preset.lat.toFixed(4)}&lon=${preset.lon.toFixed(4)}&zoom=${preset.zoom.toFixed(2)}&view=global&timeRange=7d&layers=${encodeURIComponent(preset.layers)}`;
}

export default function ConflictMapTab() {
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);

  const filteredPresets = Object.entries(PRESETS).filter(([, p]) =>
    !priorityFilter || p.priority === priorityFilter
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-2 px-1">
        <Dot color="#10b981" pulse />
        <span className="font-mono text-[10px] tracking-wider text-emerald-400">
          WORLD MONITOR: 45 LAYERS · 435+ SOURCES · LIVE FEED
        </span>
      </div>

      {/* Banner */}
      <div className="p-5 bg-gradient-to-r from-emerald-500/[.08] to-blue-500/[.04] border border-emerald-500/20 rounded-xl">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xl">{'\uD83C\uDF0D'}</span>
          <h2 className="text-base font-bold text-emerald-400" style={{ fontFamily: "'JetBrains Mono', monospace" }}>WORLD MONITOR LAUNCHPAD</h2>
        </div>
        <p className="text-[12px] text-slate-400 leading-relaxed">
          Powered by World Monitor (Elie Habib). Military ADS-B flight tracking, maritime AIS vessel tracking, dark vessel detection, live CCTV, real-time conflict data (ACLED/UCDP), country instability index, sanctions, nuclear sites, weather, economic indicators, power outages, and live news feed. Each preset opens a focused view in a new tab.
        </p>
      </div>

      {/* Quick Launch: Global */}
      <button onClick={() => window.open(buildUrl(PRESETS.global), '_blank')}
        className="w-full p-4 rounded-xl bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 hover:border-cyan-500/40 transition-all text-left group">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{'\uD83C\uDF0D'}</span>
            <div>
              <div className="text-[15px] font-bold text-cyan-400 group-hover:text-cyan-300" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                LAUNCH GLOBAL MONITOR
              </div>
              <div className="text-[11px] text-slate-500">All layers active. Full global picture. Opens in new tab.</div>
            </div>
          </div>
          <span className="text-cyan-400 text-lg group-hover:translate-x-1 transition-transform">{'\u2192'}</span>
        </div>
      </button>

      {/* Priority Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => setPriorityFilter(null)}
          className={`text-[10px] font-mono px-2.5 py-1 rounded border transition-all ${!priorityFilter ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400' : 'border-[#2a3550] text-slate-500 hover:text-slate-300'}`}>
          ALL ({Object.keys(PRESETS).length})
        </button>
        {['CRITICAL', 'HIGH', 'ELEVATED', 'MONITORING'].map(p => {
          const count = Object.values(PRESETS).filter(pr => pr.priority === p).length;
          const color = PRIORITY_COLORS[p];
          return (
            <button key={p} onClick={() => setPriorityFilter(priorityFilter === p ? null : p)}
              className={`text-[10px] font-mono px-2.5 py-1 rounded border transition-all ${priorityFilter === p ? 'bg-white/[.05]' : 'border-[#2a3550] text-slate-500 hover:text-slate-300'}`}
              style={priorityFilter === p ? { borderColor: `${color}50`, color } : undefined}>
              {p} ({count})
            </button>
          );
        })}
      </div>

      {/* Preset Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredPresets.map(([key, preset]) => {
          const pc = PRIORITY_COLORS[preset.priority] || '#64748b';
          return (
            <button key={key} onClick={() => window.open(buildUrl(preset), '_blank')}
              className="text-left bg-[#111b2a] border border-[#1e2d44] rounded-xl overflow-hidden hover:border-cyan-500/30 transition-all group"
              style={{ borderTop: `3px solid ${pc}` }}>
              <div className="px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded" style={{ background: `${pc}15`, color: pc }}>
                    {preset.priority}
                  </span>
                  <span className="text-slate-600 text-sm group-hover:text-cyan-400 group-hover:translate-x-1 transition-all">{'\u2192'}</span>
                </div>
                <div className="text-[14px] font-bold text-slate-200 group-hover:text-cyan-400 transition-colors" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {preset.label}
                </div>
                <div className="text-[11px] text-slate-500 mt-1 leading-snug">{preset.description}</div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {preset.features.map(f => (
                    <span key={f} className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-white/[.03] text-slate-600">{f}</span>
                  ))}
                </div>
                <div className="text-[8px] text-slate-700 mt-2 font-mono">
                  {preset.lat.toFixed(1)}N, {preset.lon.toFixed(1)}E | Zoom {preset.zoom}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="bg-[#111b2a] border border-[#1e2d44] rounded-xl p-4">
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">WORLD MONITOR CAPABILITIES</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {[
            { icon: '\u2708\uFE0F', label: 'Military ADS-B', desc: 'Live military aircraft tracking' },
            { icon: '\uD83D\uDEA2', label: 'Maritime AIS', desc: 'Live vessel tracking' },
            { icon: '\uD83D\uDC7B', label: 'Dark Vessels', desc: 'Ships with AIS transponder off' },
            { icon: '\uD83D\uDCF9', label: 'Live CCTV', desc: 'Global camera feeds' },
            { icon: '\u26A0\uFE0F', label: 'Conflicts (ACLED)', desc: 'Real-time conflict events' },
            { icon: '\u2622\uFE0F', label: 'Nuclear Sites', desc: 'Global nuclear facilities' },
            { icon: '\uD83D\uDCCA', label: 'Markets', desc: 'Stocks, commodities, crypto' },
            { icon: '\uD83C\uDF29\uFE0F', label: 'Weather', desc: 'Global weather systems' },
            { icon: '\uD83D\uDCA1', label: 'Power Outages', desc: 'Infrastructure monitoring' },
            { icon: '\uD83D\uDCF0', label: 'Live News', desc: '21-language news feed' },
            { icon: '\uD83D\uDEA8', label: 'Instability Index', desc: 'Country risk scoring' },
            { icon: '\uD83C\uDFDB\uFE0F', label: 'Sanctions', desc: 'Global sanctions tracker' },
          ].map(cap => (
            <div key={cap.label} className="flex items-start gap-2 p-2 rounded-lg bg-white/[.02]">
              <span className="text-sm">{cap.icon}</span>
              <div>
                <div className="text-[10px] font-semibold text-slate-300">{cap.label}</div>
                <div className="text-[9px] text-slate-600">{cap.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
