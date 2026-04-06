'use client';

import React, { useState, useEffect } from 'react';
import { Dot } from '../ui';
import { formatAESTShort } from '../../lib/date-utils';

const VPS_API = process.env.NEXT_PUBLIC_VPS_ENDPOINT || 'https://ops.jr8ch.com';
const API_KEY = process.env.NEXT_PUBLIC_VIGIL_API_KEY || '';

interface ViewsPrediction {
  country: string;
  iso: string;
  priority: string;
  april: number;
  avg12m: number;
  peak12m: number;
  conflictProb: number;
}

interface Earthquake {
  magnitude: number;
  place: string;
  time: string;
  depth: number;
  lat: number;
  lon: number;
  tsunami: number;
}

export default function GeointFeedsTab() {
  const [isLive, setIsLive] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [predictions, setPredictions] = useState<ViewsPrediction[]>([]);
  const [earthquakes, setEarthquakes] = useState<Earthquake[]>([]);
  const [feedReports, setFeedReports] = useState<Array<{ filename: string; content: string; modified: string }>>([]);
  const [expandedReport, setExpandedReport] = useState<string | null>(null);
  const [loadingViews, setLoadingViews] = useState(false);
  const [loadingUsgs, setLoadingUsgs] = useState(false);

  // Load VIEWS predictions directly
  useEffect(() => {
    if (!API_KEY) return;
    setLoadingViews(true);
    const countries = ['IRN', 'IRQ', 'ISR', 'YEM', 'SYR', 'LBN', 'UKR', 'RUS', 'SAU', 'EGY', 'TUR', 'QAT', 'BHR', 'ARE', 'AUS'];

    async function loadViews() {
      const results: ViewsPrediction[] = [];
      for (const iso of countries) {
        try {
          const res = await fetch(`https://api.viewsforecasting.org/fatalities003_2026_02_t01/cm/sb?iso=${iso}&date_start=2026-04-01&date_end=2027-04-01&pagesize=12`);
          if (!res.ok) continue;
          const data = await res.json();
          const rows = data.data || [];
          if (rows.length > 0) {
            const avg = rows.reduce((s: number, r: any) => s + (r.main_mean || 0), 0) / rows.length;
            const peak = Math.max(...rows.map((r: any) => r.main_mean || 0));
            const prob = Math.max(...rows.map((r: any) => r.main_dich || 0));
            results.push({
              country: rows[0].name || iso,
              iso,
              priority: prob > 0.9 ? 'CRITICAL' : prob > 0.5 ? 'HIGH' : prob > 0.1 ? 'ELEVATED' : 'MONITORING',
              april: rows[0]?.main_mean || 0,
              avg12m: avg,
              peak12m: peak,
              conflictProb: prob,
            });
          }
        } catch {}
      }
      setPredictions(results.sort((a, b) => b.april - a.april));
      setLoadingViews(false);
      setIsLive(true);
      setLastUpdated(new Date().toISOString());
    }
    loadViews();
  }, []);

  // Load USGS earthquakes directly
  useEffect(() => {
    setLoadingUsgs(true);
    async function loadUsgs() {
      try {
        const from = new Date(Date.now() - 48 * 3600000).toISOString();
        const res = await fetch(`https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=${from}&minmagnitude=4&limit=30&orderby=time`);
        if (!res.ok) return;
        const data = await res.json();
        setEarthquakes((data.features || []).map((f: any) => ({
          magnitude: f.properties.mag,
          place: f.properties.place,
          time: new Date(f.properties.time).toISOString(),
          depth: f.geometry.coordinates[2],
          lat: f.geometry.coordinates[1],
          lon: f.geometry.coordinates[0],
          tsunami: f.properties.tsunami,
        })));
      } catch {}
      setLoadingUsgs(false);
    }
    loadUsgs();
  }, []);

  // Load feed reports from VPS
  useEffect(() => {
    if (!API_KEY) return;
    async function loadReports() {
      try {
        const res = await fetch(`${VPS_API}/api/dead-drop/listing`, { headers: { 'x-api-key': API_KEY } });
        if (!res.ok) return;
        const data = await res.json();
        const files = (data.folders?.['geoint-feeds'] || [])
          .filter((f: any) => f.name.startsWith('geoint-feed-'))
          .sort((a: any, b: any) => new Date(b.modified).getTime() - new Date(a.modified).getTime())
          .slice(0, 5);

        const reports = [];
        for (const f of files) {
          try {
            const fRes = await fetch(`${VPS_API}/api/dead-drop/file?path=${encodeURIComponent('geoint-feeds/' + f.name)}`, { headers: { 'x-api-key': API_KEY } });
            if (fRes.ok) reports.push({ filename: f.name, content: await fRes.text(), modified: f.modified });
          } catch {}
        }
        setFeedReports(reports);
      } catch {}
    }
    loadReports();
  }, []);

  const probColor = (p: number) => p >= 0.9 ? '#ef4444' : p >= 0.5 ? '#f97316' : p >= 0.1 ? '#f59e0b' : '#10b981';
  const magColor = (m: number) => m >= 6 ? '#ef4444' : m >= 5 ? '#f97316' : '#f59e0b';

  const timeAgo = (iso: string) => {
    const d = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    return d < 60 ? `${d}s ago` : d < 3600 ? `${Math.floor(d / 60)}m ago` : d < 86400 ? `${Math.floor(d / 3600)}h ago` : `${Math.floor(d / 86400)}d ago`;
  };

  function renderMd(raw: string) {
    return raw.split('\n').map((line, i) => {
      const t = line.trim();
      if (!t) return <div key={i} className="h-1" />;
      if (t.startsWith('# ')) return <h2 key={i} className="text-sm font-bold text-cyan-400 mt-2 mb-1">{t.slice(2)}</h2>;
      if (t.startsWith('## ')) return <h3 key={i} className="text-[12px] font-bold text-slate-200 mt-1.5 mb-0.5">{t.slice(3)}</h3>;
      if (t.startsWith('### ')) return <h4 key={i} className="text-[11px] font-semibold text-purple-400 mt-1">{t.slice(4)}</h4>;
      if (t.startsWith('- ')) return <div key={i} className="text-[10px] text-slate-400 pl-2">{'\u25B8'} {t.slice(2)}</div>;
      if (t.startsWith('|')) return <div key={i} className="text-[9px] text-slate-400 font-mono">{t}</div>;
      return <div key={i} className="text-[10px] text-slate-400">{t}</div>;
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 px-1">
        <Dot color={isLive ? '#10b981' : '#f59e0b'} pulse={isLive} />
        <span className="font-mono text-[10px] tracking-wider" style={{ color: isLive ? '#10b981' : '#f59e0b' }}>
          {isLive ? `GEOINT FEEDS LIVE: ${predictions.length} PREDICTIONS · ${earthquakes.length} SEISMIC EVENTS` : 'LOADING...'}
        </span>
        {lastUpdated && <span className="font-mono text-[9px] text-slate-600 ml-2">Updated {timeAgo(lastUpdated)}</span>}
      </div>

      {/* VIEWS Conflict Predictions */}
      <div className="bg-[#0d1520] border border-[#1e2d44] rounded-xl overflow-hidden" style={{ borderTop: '3px solid #ef4444' }}>
        <div className="px-5 py-3 bg-[#111827] border-b border-[#1e2d44] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">{'\u26A0\uFE0F'}</span>
            <span className="text-[13px] font-bold text-red-400" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              CONFLICT FATALITY PREDICTIONS
            </span>
            <span className="font-mono text-[9px] text-slate-500">VIEWS/PRIO | 36-month forecast | Monthly resolution</span>
          </div>
          {loadingViews && <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-[#2a3550] text-[9px] text-slate-500 uppercase">
                <th className="px-4 py-2 text-left">Country</th>
                <th className="px-3 py-2 text-right">Apr 2026</th>
                <th className="px-3 py-2 text-right">12m Average</th>
                <th className="px-3 py-2 text-right">Peak Month</th>
                <th className="px-3 py-2 text-right">P(Conflict)</th>
              </tr>
            </thead>
            <tbody>
              {predictions.map((p, i) => (
                <tr key={i} className="border-b border-white/[.02] hover:bg-white/[.02]">
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: probColor(p.conflictProb) }} />
                      <span className="font-semibold text-slate-200">{p.country}</span>
                      <span className="font-mono text-[8px] text-slate-600">{p.iso}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right font-mono" style={{ color: p.april > 50 ? '#ef4444' : p.april > 10 ? '#f97316' : '#64748b' }}>
                    {p.april.toFixed(1)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-slate-400">{p.avg12m.toFixed(1)}</td>
                  <td className="px-3 py-2 text-right font-mono text-slate-400">{p.peak12m.toFixed(1)}</td>
                  <td className="px-3 py-2 text-right">
                    <span className="font-mono font-bold" style={{ color: probColor(p.conflictProb) }}>
                      {(p.conflictProb * 100).toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 text-[9px] text-slate-600 border-t border-[#1e2d44]">
          Source: VIEWS (Violence & Impacts Early-Warning System) / PRIO. Model: fatalities003_2026_02. Predicted monthly state-based conflict fatalities.
        </div>
      </div>

      {/* USGS Earthquakes */}
      <div className="bg-[#0d1520] border border-[#1e2d44] rounded-xl overflow-hidden" style={{ borderTop: '3px solid #f59e0b' }}>
        <div className="px-5 py-3 bg-[#111827] border-b border-[#1e2d44] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">{'\uD83C\uDF0B'}</span>
            <span className="text-[13px] font-bold text-amber-400" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              SEISMIC ACTIVITY
            </span>
            <span className="font-mono text-[9px] text-slate-500">USGS | M4+ | Last 48 hours</span>
          </div>
          {loadingUsgs && <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />}
          <span className="font-mono text-[10px] text-amber-400">{earthquakes.length} events</span>
        </div>
        <div className="max-h-[350px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
          {earthquakes.map((q, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-2 border-b border-white/[.02] hover:bg-white/[.02]">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center font-mono font-bold text-[14px]"
                style={{ backgroundColor: `${magColor(q.magnitude)}15`, color: magColor(q.magnitude) }}>
                {q.magnitude.toFixed(1)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] text-slate-200 truncate">{q.place}</div>
                <div className="text-[9px] text-slate-500">
                  Depth: {q.depth?.toFixed(0)}km | {q.lat.toFixed(2)}N, {q.lon.toFixed(2)}E
                  {q.tsunami ? ' | TSUNAMI WARNING' : ''}
                </div>
              </div>
              <div className="text-[9px] text-slate-500 font-mono flex-shrink-0">{timeAgo(q.time)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Feed Reports */}
      {feedReports.length > 0 && (
        <div className="bg-[#0d1520] border border-[#1e2d44] rounded-xl overflow-hidden" style={{ borderTop: '2px solid #06b6d4' }}>
          <div className="px-5 py-3 bg-[#111827] border-b border-[#1e2d44] flex items-center justify-between">
            <span className="text-[13px] font-bold text-cyan-400" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              GEOINT FEED REPORTS
            </span>
            <span className="font-mono text-[10px] text-slate-500">{feedReports.length} reports</span>
          </div>
          <div className="divide-y divide-[#1a2740]">
            {feedReports.map((report, i) => (
              <div key={i}>
                <div className="px-4 py-2.5 cursor-pointer hover:bg-[#131f30] flex items-center justify-between"
                  onClick={() => setExpandedReport(expandedReport === report.filename ? null : report.filename)}>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-slate-300">{report.filename}</span>
                    <span className="text-[9px] text-slate-500">{formatAESTShort(report.modified)}</span>
                  </div>
                  <span className="text-slate-500 text-xs">{expandedReport === report.filename ? '\u25BE' : '\u25B8'}</span>
                </div>
                {expandedReport === report.filename && (
                  <div className="px-4 pb-3 max-h-[400px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                    {renderMd(report.content)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
