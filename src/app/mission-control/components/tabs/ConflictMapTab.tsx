'use client';

import React, { useState, useEffect } from 'react';
import { Dot, Card, Badge } from '../ui';

const VPS_API = process.env.NEXT_PUBLIC_VPS_ENDPOINT || 'https://ops.jr8ch.com';
const API_KEY = process.env.NEXT_PUBLIC_VIGIL_API_KEY || '';

interface OilInstrument {
  symbol: string;
  name: string;
  priority: string;
  price: number;
  previousClose?: number;
  change?: number;
  changePct: number;
  dayHigh?: number;
  dayLow?: number;
  timestamp?: string;
  history30d?: number[];
  assessment?: string;
}

interface Vessel {
  mmsi: string;
  name: string;
  flag: string;
  lat: number;
  lon: number;
  heading?: number;
  speed?: number;
  zone: string;
  destination?: string;
  lastSeen: string;
}

interface DarkAlert {
  mmsi: string;
  name: string;
  flag: string;
  gapMinutes: number;
  lastKnown: { lat: number; lon: number; zone: string };
  reappeared: { lat: number; lon: number; zone: string };
  timestamp: string;
}

interface MetadataAnomaly {
  mmsi: string;
  name: string;
  flag: string;
  matchedField: string;
  pattern: string;
  lat: number;
  lon: number;
  zone: string;
  timestamp: string;
}

interface ThermalDetection {
  area: string;
  lat: number;
  lon: number;
  frp: number;
  brightness: number;
  confidence: string;
  datetime: string;
}

interface AtlasStatus {
  pipeline: { last_run?: string; priority?: string; summary?: string; brent_crude_usd?: number; thermal_anomalies?: number; gps_jam_zones?: number; cross_ref_alerts?: number };
  ais: { updated?: string; vesselsTracked?: number; darkCandidates?: number; darkConfirmed?: number; metadataFlags?: number; messagesReceived?: number };
  feeds: { lastRun?: string; lastPriority?: string; lastAlertCount?: number };
}

interface ConflictEvent {
  id: string;
  date: string;
  type: string;
  subType: string;
  country: string;
  location: string;
  lat: number;
  lng: number;
  fatalities: number;
  actor1: string;
  notes: string;
}

function timeSince(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: '#ef4444', HIGH: '#f97316', ELEVATED: '#f59e0b', MONITORING: '#64748b', ROUTINE: '#10b981',
};

function SparkLine({ data, color = '#06b6d4', width = 120, height = 32 }: { data: number[]; color?: string; width?: number; height?: number }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * height}`).join(' ');
  return (
    <svg width={width} height={height} className="opacity-60">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

export default function ConflictMapTab() {
  const [oil, setOil] = useState<{ instruments: OilInstrument[]; alerts: { type: string; priority: string; detail: string }[] }>({ instruments: [], alerts: [] });
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [vesselCount, setVesselCount] = useState(0);
  const [darkAlerts, setDarkAlerts] = useState<DarkAlert[]>([]);
  const [anomalies, setAnomalies] = useState<MetadataAnomaly[]>([]);
  const [thermal, setThermal] = useState<ThermalDetection[]>([]);
  const [status, setStatus] = useState<AtlasStatus>({ pipeline: {}, ais: {}, feeds: {} });
  const [events, setEvents] = useState<ConflictEvent[]>([]);
  const [report, setReport] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<string | null>(null);

  const headers = { 'x-api-key': API_KEY };

  useEffect(() => {
    if (!API_KEY) return;
    async function load() {
      try {
        const [oilRes, aisRes, darkRes, anomRes, thermalRes, statusRes, eventsRes, reportRes] = await Promise.all([
          fetch(`${VPS_API}/api/atlas/oil`, { headers }).catch(() => null),
          fetch(`${VPS_API}/api/atlas/ais`, { headers }).catch(() => null),
          fetch(`${VPS_API}/api/atlas/ais/dark`, { headers }).catch(() => null),
          fetch(`${VPS_API}/api/atlas/ais/anomalies`, { headers }).catch(() => null),
          fetch(`${VPS_API}/api/atlas/thermal`, { headers }).catch(() => null),
          fetch(`${VPS_API}/api/atlas/status`, { headers }).catch(() => null),
          fetch(`${VPS_API}/api/atlas/events`, { headers }).catch(() => null),
          fetch(`${VPS_API}/api/atlas/report`, { headers }).catch(() => null),
        ]);

        if (oilRes?.ok) { const d = await oilRes.json(); setOil(d); }
        if (aisRes?.ok) { const d = await aisRes.json(); setVessels(d.vessels || []); setVesselCount(d.count || 0); }
        if (darkRes?.ok) { const d = await darkRes.json(); setDarkAlerts(d.alerts || []); }
        if (anomRes?.ok) { const d = await anomRes.json(); setAnomalies(d.anomalies || []); }
        if (thermalRes?.ok) { const d = await thermalRes.json(); setThermal(d.detections || []); }
        if (statusRes?.ok) { const d = await statusRes.json(); setStatus(d); }
        if (eventsRes?.ok) { const d = await eventsRes.json(); setEvents((d.events || []).slice(0, 50)); }
        if (reportRes?.ok) { const d = await reportRes.json(); setReport(d.report || null); }

        setIsLive(true);
        setLastUpdated(new Date().toISOString());
      } catch { setIsLive(false); }
    }
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, []);

  const brent = oil.instruments?.find(i => i.symbol === 'BZ=F');
  const wti = oil.instruments?.find(i => i.symbol === 'CL=F');
  const spread = oil.instruments?.find(i => i.symbol === 'SPREAD');
  const ng = oil.instruments?.find(i => i.symbol === 'NG=F');
  const pipelinePriority = status.pipeline?.priority || 'ROUTINE';

  // Vessel zone breakdown
  const zoneBreakdown: Record<string, number> = {};
  vessels.forEach(v => { zoneBreakdown[v.zone] = (zoneBreakdown[v.zone] || 0) + 1; });

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-2 px-1">
        <Dot color={isLive ? '#10b981' : '#f59e0b'} pulse={isLive} />
        <span className="font-mono text-[10px] tracking-wider" style={{ color: isLive ? '#10b981' : '#f59e0b' }}>
          {isLive ? `ATLAS LIVE | ${vesselCount} VESSELS | BRENT $${brent?.price || '--'}` : 'CONNECTING...'}
        </span>
        {lastUpdated && <span className="font-mono text-[9px] text-slate-600 ml-2">Updated {timeSince(lastUpdated)}</span>}
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {[
          { label: 'Pipeline', value: pipelinePriority, color: PRIORITY_COLORS[pipelinePriority] || '#64748b' },
          { label: 'Brent Crude', value: brent ? `$${brent.price}` : '--', color: brent && brent.price > 100 ? '#ef4444' : '#10b981', sub: brent ? `${brent.changePct > 0 ? '+' : ''}${brent.changePct}%` : '' },
          { label: 'WTI Crude', value: wti ? `$${wti.price}` : '--', color: wti && wti.price > 100 ? '#ef4444' : '#10b981', sub: wti ? `${wti.changePct > 0 ? '+' : ''}${wti.changePct}%` : '' },
          { label: 'BW Spread', value: spread ? `$${spread.price}` : '--', color: spread && Math.abs(Number(spread.price)) > 10 ? '#ef4444' : '#10b981' },
          { label: 'Vessels', value: vesselCount, color: '#06b6d4' },
          { label: 'Dark Alerts', value: darkAlerts.length, color: darkAlerts.length > 0 ? '#ef4444' : '#10b981' },
          { label: 'Thermal', value: thermal.length, color: thermal.length > 0 ? '#f97316' : '#10b981' },
        ].map((kpi, i) => (
          <div key={i} className="bg-[#1a2235] border border-[#2a3550] rounded-lg p-2.5" style={{ borderLeft: `3px solid ${kpi.color}` }}>
            <div className="text-[8px] text-slate-500 uppercase tracking-wider">{kpi.label}</div>
            <div className="font-mono text-lg font-bold mt-0.5" style={{ color: kpi.color }}>{kpi.value}</div>
            {(kpi as any).sub && <div className="font-mono text-[9px] text-slate-500">{(kpi as any).sub}</div>}
          </div>
        ))}
      </div>

      {/* Oil Futures + AIS Status Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Oil Futures Panel */}
        <Card title="Oil Futures (Live)" icon="&#x1F6E2;&#xFE0F;" accent="#f59e0b">
          <div className="space-y-2">
            {oil.instruments?.filter(i => i.symbol !== 'SPREAD').map(inst => (
              <div key={inst.symbol} className="flex items-center justify-between p-2 rounded-lg bg-white/[.02] border border-white/[.03]">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[9px] px-1.5 py-0.5 rounded" style={{ background: `${PRIORITY_COLORS[inst.priority] || '#64748b'}15`, color: PRIORITY_COLORS[inst.priority] || '#64748b' }}>{inst.priority}</span>
                    <span className="text-[12px] font-medium text-slate-200">{inst.name}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {inst.history30d && <SparkLine data={inst.history30d} color={inst.changePct >= 0 ? '#10b981' : '#ef4444'} />}
                  <div className="text-right min-w-[70px]">
                    <div className="font-mono text-[14px] font-bold text-slate-200">${inst.price}</div>
                    <div className="font-mono text-[9px]" style={{ color: inst.changePct >= 0 ? '#10b981' : '#ef4444' }}>
                      {inst.changePct >= 0 ? '+' : ''}{inst.changePct}%
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {spread && (
              <div className="flex items-center justify-between p-2 rounded-lg bg-white/[.02] border border-white/[.03]">
                <span className="text-[12px] text-slate-400">Brent-WTI Spread</span>
                <div className="text-right">
                  <span className="font-mono text-[14px] font-bold" style={{ color: Math.abs(Number(spread.price)) > 10 ? '#ef4444' : '#10b981' }}>${spread.price}</span>
                  <div className="font-mono text-[9px] text-slate-500">{spread.assessment}</div>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* AIS Maritime Panel */}
        <Card title={`AIS Maritime (${vesselCount} vessels)`} icon="&#x1F6A2;" accent="#06b6d4">
          {/* Zone breakdown */}
          <div className="space-y-1.5 mb-3">
            {Object.entries(zoneBreakdown).sort((a, b) => b[1] - a[1]).map(([zone, count]) => (
              <div key={zone} className="flex items-center justify-between p-1.5 px-2.5 rounded bg-white/[.02]">
                <span className="text-[11px] text-slate-300">{zone}</span>
                <span className="font-mono text-[12px] font-bold text-cyan-400">{count}</span>
              </div>
            ))}
            {Object.keys(zoneBreakdown).length === 0 && <div className="text-[11px] text-slate-600 italic">Waiting for AIS stream data...</div>}
          </div>

          {/* AIS daemon stats */}
          {status.ais?.messagesReceived !== undefined && (
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#1e2d44]">
              <div className="text-center">
                <div className="font-mono text-[14px] font-bold text-cyan-400">{status.ais.messagesReceived}</div>
                <div className="text-[8px] text-slate-500">MSGS</div>
              </div>
              <div className="text-center">
                <div className="font-mono text-[14px] font-bold" style={{ color: (status.ais.darkCandidates || 0) > 0 ? '#ef4444' : '#10b981' }}>{status.ais.darkCandidates || 0}</div>
                <div className="text-[8px] text-slate-500">DARK CAND</div>
              </div>
              <div className="text-center">
                <div className="font-mono text-[14px] font-bold" style={{ color: (status.ais.metadataFlags || 0) > 0 ? '#f97316' : '#10b981' }}>{status.ais.metadataFlags || 0}</div>
                <div className="text-[8px] text-slate-500">META FLAGS</div>
              </div>
            </div>
          )}

          {/* Named vessels */}
          {vessels.filter(v => v.name && v.name.trim() && v.name.trim() !== 'UNKNOWN').length > 0 && (
            <div className="mt-3 pt-2 border-t border-[#1e2d44]">
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">IDENTIFIED VESSELS</div>
              <div className="space-y-1 max-h-[150px] overflow-y-auto">
                {vessels.filter(v => v.name && v.name.trim() && v.name.trim() !== 'UNKNOWN').map(v => (
                  <div key={v.mmsi} className="flex items-center justify-between text-[10px] py-1 px-2 rounded bg-white/[.01]">
                    <span className="text-slate-300 font-mono">{v.name.trim()}</span>
                    <span className="text-slate-500">{v.zone} | {timeSince(v.lastSeen)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Alerts Row */}
      {(darkAlerts.length > 0 || anomalies.length > 0 || thermal.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Dark Vessel Alerts */}
          {darkAlerts.length > 0 && (
            <Card title={`Dark Transit Alerts (${darkAlerts.length})`} icon="&#x1F47B;" accent="#ef4444">
              <div className="space-y-2">
                {darkAlerts.map((a, i) => (
                  <div key={i} className="p-2 rounded-lg bg-red-500/[.05] border border-red-500/20">
                    <div className="text-[12px] font-bold text-red-400">{a.name} ({a.flag})</div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      MMSI {a.mmsi} | Dark {a.gapMinutes}min
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {a.lastKnown.zone} → {a.reappeared.zone}
                    </div>
                    <div className="text-[9px] text-slate-600 mt-0.5">{timeSince(a.timestamp)}</div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Metadata Anomalies */}
          {anomalies.length > 0 && (
            <Card title={`AIS Metadata Flags (${anomalies.length})`} icon="&#x26A0;&#xFE0F;" accent="#f97316">
              <div className="space-y-2">
                {anomalies.slice(0, 10).map((a, i) => (
                  <div key={i} className="p-2 rounded-lg bg-orange-500/[.05] border border-orange-500/20">
                    <div className="text-[12px] font-bold text-orange-400">{a.name} ({a.flag})</div>
                    <div className="text-[10px] text-slate-400 mt-1">{a.pattern}</div>
                    <div className="text-[9px] text-slate-500 font-mono mt-0.5">"{a.matchedField}"</div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Thermal Anomalies */}
          {thermal.length > 0 && (
            <Card title={`Thermal Anomalies (${thermal.length})`} icon="&#x1F525;" accent="#ef4444">
              <div className="space-y-2">
                {thermal.slice(0, 10).map((d, i) => (
                  <div key={i} className="p-2 rounded-lg bg-red-500/[.05] border border-red-500/20">
                    <div className="text-[12px] font-bold text-red-400">{d.area}</div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      FRP {d.frp}MW | {d.confidence} confidence
                    </div>
                    <div className="text-[9px] text-slate-500 font-mono">{d.lat.toFixed(3)}, {d.lon.toFixed(3)} | {d.datetime}</div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Conflict Events (ACLED) */}
      {events.length > 0 && (
        <Card title={`Conflict Events -- ACLED (${events.length})`} icon="&#x1F6A8;" accent="#ef4444" full>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 max-h-[400px] overflow-y-auto">
            {events.slice(0, 20).map((e, i) => (
              <div key={i} className="flex items-start justify-between p-2 px-3 rounded-lg bg-white/[.02] border border-white/[.03]">
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[9px] text-slate-500">{e.date}</span>
                    <span className="text-[11px] font-medium text-slate-200">{e.type}</span>
                    {e.fatalities > 0 && (
                      <span className="font-mono text-[9px] px-1 py-0.5 rounded bg-red-500/10 text-red-400">{e.fatalities} killed</span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{e.location}, {e.country}</div>
                  {e.actor1 && <div className="text-[9px] text-slate-500 mt-0.5">{e.actor1}</div>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Latest ATLAS Report */}
      {report && (
        <Card title="Latest ATLAS Intel Report" icon="&#x1F4CB;" accent="#8b5cf6" full>
          <div
            className="text-[11px] text-slate-300 leading-relaxed p-3 rounded-lg bg-[#0a0f18] border border-[#1e2d44] max-h-[400px] overflow-y-auto whitespace-pre-wrap"
            style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px' }}
          >
            {report}
          </div>
        </Card>
      )}

      {/* Pipeline Status Footer */}
      <div className="bg-[#111b2a] border border-[#1e2d44] rounded-xl p-4">
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">ATLAS PIPELINE STATUS</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <div className="text-[9px] text-slate-500">Feed Aggregator</div>
            <div className="font-mono text-[11px] text-slate-300">
              {status.feeds?.lastRun ? timeSince(status.feeds.lastRun) : 'No data'}
            </div>
          </div>
          <div>
            <div className="text-[9px] text-slate-500">AIS Daemon</div>
            <div className="font-mono text-[11px] text-slate-300">
              {status.ais?.updated ? timeSince(status.ais.updated) : 'Offline'}
            </div>
          </div>
          <div>
            <div className="text-[9px] text-slate-500">Pipeline Priority</div>
            <div className="font-mono text-[11px]" style={{ color: PRIORITY_COLORS[status.pipeline?.priority || 'ROUTINE'] }}>
              {status.pipeline?.priority || 'UNKNOWN'}
            </div>
          </div>
          <div>
            <div className="text-[9px] text-slate-500">Cross-Ref Alerts</div>
            <div className="font-mono text-[11px]" style={{ color: (status.pipeline?.cross_ref_alerts || 0) > 0 ? '#ef4444' : '#10b981' }}>
              {status.pipeline?.cross_ref_alerts || 0}
            </div>
          </div>
        </div>
        {status.pipeline?.summary && (
          <div className="mt-2 pt-2 border-t border-[#1e2d44] text-[10px] text-slate-500">{status.pipeline.summary}</div>
        )}
      </div>
    </div>
  );
}
