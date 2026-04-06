'use client';

import React, { useState, useEffect } from 'react';
import { Dot } from '../ui';
import { formatAESTShort } from '../../lib/date-utils';

const VPS_API = process.env.NEXT_PUBLIC_VPS_ENDPOINT || 'https://ops.jr8ch.com';
const API_KEY = process.env.NEXT_PUBLIC_VIGIL_API_KEY || '';

interface Region {
  id: string;
  name: string;
  bbox: number[];
  priority: string;
  lat: number;
  lng: number;
  description: string;
}

interface ImageryResult {
  id: string;
  datetime: string;
  cloudCover: number;
  collection: string;
}

interface IntelReport {
  filename: string;
  content: string;
  modified: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  ELEVATED: '#f59e0b',
  MONITORING: '#64748b',
};

const COLLECTION_LABELS: Record<string, string> = {
  'sentinel-1-grd': 'S1 SAR (Radar)',
  'sentinel-2-l2a': 'S2 Optical',
};

export default function SatIntTab() {
  const [regions, setRegions] = useState<Region[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [imagery, setImagery] = useState<ImageryResult[]>([]);
  const [loadingImagery, setLoadingImagery] = useState(false);
  const [collection, setCollection] = useState('sentinel-2-l2a');
  const [days, setDays] = useState(7);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [loadingThumb, setLoadingThumb] = useState(false);
  const [intelReports, setIntelReports] = useState<IntelReport[]>([]);
  const [expandedReport, setExpandedReport] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);

  // Fetch regions
  useEffect(() => {
    if (!API_KEY) return;
    async function load() {
      try {
        const res = await fetch(`${VPS_API}/api/satint/regions`, { headers: { 'x-api-key': API_KEY } });
        if (res.ok) {
          const data = await res.json();
          setRegions(data.regions || []);
          setIsLive(true);
          setLastUpdated(new Date().toISOString());
        }
      } catch { setIsLive(false); }
    }
    load();
  }, []);

  // Fetch intel reports
  useEffect(() => {
    if (!API_KEY) return;
    async function loadIntel() {
      try {
        const res = await fetch(`${VPS_API}/api/satint/intel?limit=5`, { headers: { 'x-api-key': API_KEY } });
        if (res.ok) {
          const data = await res.json();
          setIntelReports(data.reports || []);
        }
      } catch {}
    }
    loadIntel();
  }, []);

  // Search imagery when region or collection changes
  async function searchImagery(regionId: string) {
    setLoadingImagery(true);
    setImagery([]);
    try {
      const res = await fetch(`${VPS_API}/api/satint/search/${regionId}?collection=${collection}&days=${days}&limit=20`, {
        headers: { 'x-api-key': API_KEY },
      });
      if (res.ok) {
        const data = await res.json();
        setImagery(data.results || []);
      }
    } catch {}
    setLoadingImagery(false);
  }

  // Load thumbnail
  async function loadThumbnail(regionId: string) {
    setLoadingThumb(true);
    setThumbnailUrl(null);
    try {
      const res = await fetch(`${VPS_API}/api/satint/thumbnail/${regionId}?days=${days}&width=640&height=640`, {
        headers: { 'x-api-key': API_KEY },
      });
      if (res.ok) {
        const blob = await res.blob();
        setThumbnailUrl(URL.createObjectURL(blob));
      }
    } catch {}
    setLoadingThumb(false);
  }

  function selectRegion(id: string) {
    setSelectedRegion(id);
    searchImagery(id);
    loadThumbnail(id);
  }

  const filteredRegions = priorityFilter ? regions.filter(r => r.priority === priorityFilter) : regions;
  const selectedRegionData = regions.find(r => r.id === selectedRegion);

  const timeAgo = (iso: string) => {
    const d = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    return d < 60 ? `${d}s ago` : d < 3600 ? `${Math.floor(d/60)}m ago` : d < 86400 ? `${Math.floor(d/3600)}h ago` : `${Math.floor(d/86400)}d ago`;
  };

  // Simple markdown renderer for intel reports
  function renderMd(raw: string) {
    return raw.split('\n').map((line, i) => {
      const t = line.trim();
      if (!t) return <div key={i} className="h-1" />;
      if (t.startsWith('# ')) return <h2 key={i} className="text-sm font-bold text-cyan-400 mt-2 mb-1">{t.slice(2)}</h2>;
      if (t.startsWith('## ')) return <h3 key={i} className="text-[12px] font-bold text-slate-200 mt-1.5 mb-0.5">{t.slice(3)}</h3>;
      if (t.startsWith('### ')) return <h4 key={i} className="text-[11px] font-semibold text-purple-400 mt-1">{t.slice(4)}</h4>;
      if (t.startsWith('- ')) return <div key={i} className="flex items-start gap-1.5 text-[10px] text-slate-400 pl-1"><span className="text-slate-600">{'\u25B8'}</span><span>{t.slice(2)}</span></div>;
      if (t.startsWith('---')) return <hr key={i} className="border-[#2a3550] my-1" />;
      return <div key={i} className="text-[10px] text-slate-400 leading-relaxed">{t}</div>;
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-2 px-1">
        <Dot color={isLive ? '#10b981' : '#f59e0b'} pulse={isLive} />
        <span className="font-mono text-[10px] tracking-wider" style={{ color: isLive ? '#10b981' : '#f59e0b' }}>
          {isLive ? `SATINT LIVE: ${regions.length} REGIONS MONITORED` : 'CONNECTING...'}
        </span>
        {lastUpdated && <span className="font-mono text-[9px] text-slate-600 ml-2">Updated {timeAgo(lastUpdated)}</span>}
      </div>

      {/* Title Banner */}
      <div className="p-5 bg-gradient-to-r from-blue-500/[.08] to-cyan-500/[.04] border border-blue-500/20 rounded-xl">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xl">{'\uD83D\uDEF0\uFE0F'}</span>
          <h2 className="text-base font-bold text-blue-400" style={{ fontFamily: "'JetBrains Mono', monospace" }}>SATELLITE INTELLIGENCE</h2>
          <span className="font-mono text-[9px] text-slate-500">Copernicus Sentinel-1 SAR + Sentinel-2 Optical</span>
        </div>
        <p className="text-[12px] text-slate-400">
          Real-time satellite imagery monitoring across {regions.length} areas of interest. SAR radar penetrates cloud cover and darkness for maritime detection. Optical imagery provides visual confirmation. Data refreshed every 6 hours.
        </p>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: 'CRITICAL', count: regions.filter(r => r.priority === 'CRITICAL').length, color: '#ef4444' },
          { label: 'HIGH', count: regions.filter(r => r.priority === 'HIGH').length, color: '#f97316' },
          { label: 'ELEVATED', count: regions.filter(r => r.priority === 'ELEVATED').length, color: '#f59e0b' },
          { label: 'MONITORING', count: regions.filter(r => r.priority === 'MONITORING').length, color: '#64748b' },
        ].map(kpi => (
          <button key={kpi.label} onClick={() => setPriorityFilter(priorityFilter === kpi.label ? null : kpi.label)}
            className={`bg-[#111b2a] border rounded-lg p-3 transition-all ${priorityFilter === kpi.label ? 'border-white/20' : 'border-[#1e2d44]'}`}
            style={{ borderLeft: `3px solid ${kpi.color}` }}>
            <div className="text-[9px] text-slate-500 uppercase tracking-wider">{kpi.label}</div>
            <div className="font-mono text-xl font-bold" style={{ color: kpi.color }}>{kpi.count}</div>
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <select value={collection} onChange={e => { setCollection(e.target.value); if (selectedRegion) searchImagery(selectedRegion); }}
          className="bg-[#111827] border border-[#2a3550] rounded-md py-1.5 px-3 text-[11px] text-slate-200 outline-none font-mono">
          <option value="sentinel-2-l2a">Sentinel-2 Optical</option>
          <option value="sentinel-1-grd">Sentinel-1 SAR (Radar)</option>
        </select>
        <select value={days} onChange={e => { setDays(parseInt(e.target.value)); if (selectedRegion) searchImagery(selectedRegion); }}
          className="bg-[#111827] border border-[#2a3550] rounded-md py-1.5 px-3 text-[11px] text-slate-200 outline-none font-mono">
          <option value="3">Last 3 days</option>
          <option value="7">Last 7 days</option>
          <option value="14">Last 14 days</option>
          <option value="30">Last 30 days</option>
        </select>
        {selectedRegion && (
          <button onClick={() => { searchImagery(selectedRegion); loadThumbnail(selectedRegion); }}
            className="text-[10px] font-mono text-cyan-400 px-3 py-1.5 border border-cyan-500/20 rounded hover:bg-cyan-500/10">
            REFRESH IMAGERY
          </button>
        )}
      </div>

      <div className="flex gap-4" style={{ minHeight: '700px' }}>
        {/* Region List */}
        <div className="w-72 flex-shrink-0 rounded-xl border border-[#2a3550] overflow-hidden flex flex-col">
          <div className="px-4 py-2.5 bg-[#111827] border-b border-[#1e2d44]">
            <span className="text-[12px] font-bold tracking-wider text-cyan-400" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              REGIONS ({filteredRegions.length})
            </span>
          </div>
          <div className="flex-1 overflow-y-auto bg-[#0a0e17]" style={{ scrollbarWidth: 'thin' }}>
            {filteredRegions.map(region => {
              const isActive = selectedRegion === region.id;
              const pc = PRIORITY_COLORS[region.priority] || '#64748b';
              return (
                <button key={region.id} onClick={() => selectRegion(region.id)}
                  className={`w-full text-left px-3 py-2.5 border-b border-white/[.02] transition-all ${isActive ? 'bg-cyan-500/10' : 'hover:bg-white/[.02]'}`}
                  style={{ borderLeft: `3px solid ${pc}` }}>
                  <div className="flex items-center gap-2">
                    <Dot color={pc} pulse={region.priority === 'CRITICAL'} />
                    <span className={`text-[11px] font-mono ${isActive ? 'text-cyan-400' : 'text-slate-300'}`}>{region.name}</span>
                  </div>
                  <div className="text-[9px] text-slate-600 mt-0.5 pl-4">{region.description}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col gap-4">
          {selectedRegionData ? (
            <>
              {/* Region Header */}
              <div className="bg-[#111b2a] border border-[#1e2d44] rounded-xl p-4" style={{ borderTop: `3px solid ${PRIORITY_COLORS[selectedRegionData.priority]}` }}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[16px] font-bold text-slate-100" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      {selectedRegionData.name}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">{selectedRegionData.description}</div>
                    <div className="flex items-center gap-3 mt-2 text-[9px] text-slate-500 font-mono">
                      <span>BBOX: [{selectedRegionData.bbox.join(', ')}]</span>
                      <span>LAT: {selectedRegionData.lat}</span>
                      <span>LNG: {selectedRegionData.lng}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-[11px] px-2 py-1 rounded" style={{ background: `${PRIORITY_COLORS[selectedRegionData.priority]}15`, color: PRIORITY_COLORS[selectedRegionData.priority] }}>
                      {selectedRegionData.priority}
                    </span>
                  </div>
                </div>
              </div>

              {/* Satellite Image */}
              <div className="bg-[#060a12] border border-[#2a3550] rounded-xl overflow-hidden" style={{ minHeight: '400px' }}>
                <div className="px-4 py-2 bg-[#111827] border-b border-[#1e2d44] flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-300 font-mono">
                    {'\uD83D\uDEF0\uFE0F'} SATELLITE VIEW: {COLLECTION_LABELS[collection] || collection}
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono">Last {days} days, max cloud 40%</span>
                </div>
                <div className="flex items-center justify-center p-4" style={{ minHeight: '380px' }}>
                  {loadingThumb ? (
                    <div className="text-center">
                      <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                      <div className="text-[11px] text-slate-500">Rendering satellite imagery...</div>
                    </div>
                  ) : thumbnailUrl ? (
                    <div className="relative">
                      <img src={thumbnailUrl} alt={`Satellite view of ${selectedRegionData.name}`}
                        className="max-w-full rounded-lg border border-[#2a3550]"
                        style={{ imageRendering: 'auto' }} />
                      <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-1 rounded text-[9px] text-slate-300 font-mono">
                        {selectedRegionData.name} | {COLLECTION_LABELS[collection]} | {days}d window
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-[12px] text-slate-600">
                      {collection === 'sentinel-1-grd' ? 'SAR imagery requires Process API v2 (coming soon). Use Optical for visual preview.' : 'No imagery available for this region and time window.'}
                    </div>
                  )}
                </div>
              </div>

              {/* Imagery Passes Table */}
              <div className="bg-[#111b2a] border border-[#1e2d44] rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-[#0d1520] border-b border-[#1e2d44] flex items-center justify-between">
                  <span className="text-[12px] font-bold text-slate-300">IMAGERY PASSES ({imagery.length})</span>
                  {loadingImagery && <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />}
                </div>
                <div className="max-h-[300px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                  {imagery.length === 0 && !loadingImagery ? (
                    <div className="p-6 text-center text-[11px] text-slate-600">No imagery found. Try expanding the time window.</div>
                  ) : (
                    <table className="w-full text-[11px]">
                      <thead>
                        <tr className="border-b border-[#2a3550] text-[9px] text-slate-500 uppercase">
                          <th className="px-4 py-2 text-left">Date/Time</th>
                          <th className="px-4 py-2 text-left">Age</th>
                          <th className="px-4 py-2 text-left">Cloud %</th>
                          <th className="px-4 py-2 text-left">ID</th>
                        </tr>
                      </thead>
                      <tbody>
                        {imagery.map((img, i) => {
                          const cloud = img.cloudCover ?? null;
                          const cloudColor = cloud === null ? '#64748b' : cloud < 20 ? '#10b981' : cloud < 40 ? '#f59e0b' : '#ef4444';
                          return (
                            <tr key={i} className="border-b border-white/[.02] hover:bg-white/[.02]">
                              <td className="px-4 py-2 font-mono text-slate-300">{formatAESTShort(img.datetime)}</td>
                              <td className="px-4 py-2 font-mono text-slate-500">{timeAgo(img.datetime)}</td>
                              <td className="px-4 py-2 font-mono" style={{ color: cloudColor }}>
                                {cloud !== null ? `${cloud.toFixed(1)}%` : 'N/A (SAR)'}
                              </td>
                              <td className="px-4 py-2 font-mono text-slate-600 text-[9px]">{img.id.slice(0, 40)}...</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl mb-4 opacity-20">{'\uD83D\uDEF0\uFE0F'}</div>
                <div className="text-[14px] text-slate-500 mb-2">Select a region to view satellite imagery</div>
                <div className="text-[11px] text-slate-600">
                  {regions.filter(r => r.priority === 'CRITICAL').length} critical zones, {regions.length} total areas monitored
                </div>
              </div>
            </div>
          )}

          {/* Intel Reports */}
          {intelReports.length > 0 && (
            <div className="bg-[#111b2a] border border-[#1e2d44] rounded-xl overflow-hidden" style={{ borderTop: '2px solid #06b6d4' }}>
              <div className="px-4 py-2.5 bg-[#0d1520] border-b border-[#1e2d44] flex items-center justify-between">
                <span className="text-[12px] font-bold text-cyan-400">SATINT SCAN REPORTS</span>
                <span className="font-mono text-[10px] text-slate-500">{intelReports.length} reports</span>
              </div>
              <div className="divide-y divide-[#1a2740]">
                {intelReports.map((report, i) => (
                  <div key={i}>
                    <div className="px-4 py-2.5 cursor-pointer hover:bg-[#131f30] transition-colors flex items-center justify-between"
                      onClick={() => setExpandedReport(expandedReport === report.filename ? null : report.filename)}>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono text-slate-300">{report.filename}</span>
                        <span className="text-[9px] text-slate-500">{formatAESTShort(report.modified)}</span>
                      </div>
                      <span className="text-slate-500 text-xs">{expandedReport === report.filename ? '\u25BE' : '\u25B8'}</span>
                    </div>
                    {expandedReport === report.filename && (
                      <div className="px-4 pb-3 max-h-[300px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                        {renderMd(report.content)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
