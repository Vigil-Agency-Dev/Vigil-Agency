'use client';

import React, { useState, useEffect } from 'react';
import { Dot } from '../ui';

const VPS_API = process.env.NEXT_PUBLIC_VPS_ENDPOINT || 'https://ops.jr8ch.com';
const API_KEY = process.env.NEXT_PUBLIC_VIGIL_API_KEY || '';

async function fetchVPS(path: string) {
  const res = await fetch(`${VPS_API}${path}`, { headers: { 'x-api-key': API_KEY }, cache: 'no-store' });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

function statusColor(s: string) {
  if (s === 'CRITICAL' || s === 'BREACHED') return '#ef4444';
  if (s === 'HIGH' || s === 'ELEVATED') return '#f97316';
  if (s === 'MEDIUM' || s === 'AMBER') return '#f59e0b';
  if (s === 'GREEN' || s === 'SECURE') return '#10b981';
  return '#64748b';
}

interface CyberMetrics {
  vpsOnline: boolean;
  apiHealthy: boolean;
  agentCount: number;
  agentsOnline: number;
  threatLevel: string;
  lastBastionReport: string;
  openIncidents: number;
  correctiveActions: number;
}

export default function CyberSecTab() {
  const [metrics, setMetrics] = useState<CyberMetrics | null>(null);
  const [threatLevel, setThreatLevel] = useState('GREEN');
  const [isLive, setIsLive] = useState(false);
  const [bastionIntel, setBastionIntel] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [health, overview, agents, tl] = await Promise.all([
          fetchVPS('/api/health').catch(() => null),
          fetchVPS('/api/mission/overview').catch(() => null),
          fetchVPS('/api/mission/agents').catch(() => ({ agents: [] })),
          fetchVPS('/api/mission/threat-level').catch(() => ({ level: 'GREEN' })),
        ]);

        const agentList = agents.agents || [];
        const online = agentList.filter((a: any) => a.status === 'ACTIVE').length;

        setMetrics({
          vpsOnline: !!health,
          apiHealthy: health?.status === 'ok',
          agentCount: agentList.length,
          agentsOnline: online,
          threatLevel: tl.level || overview?.mission?.threat || 'GREEN',
          lastBastionReport: '',
          openIncidents: 0,
          correctiveActions: 0,
        });
        setThreatLevel(tl.level || overview?.mission?.threat || 'GREEN');
        setIsLive(true);
      } catch { /* offline */ }
    }
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, []);

  const subAgents = [
    { id: 'sentry', name: 'SENTRY', role: 'Infrastructure Monitor', status: 'STANDBY', desc: 'VPS access logs, SSH attempts, API anomalies' },
    { id: 'overwatch', name: 'OVERWATCH', role: 'Account Security', status: 'STANDBY', desc: 'Social account compromise detection, impersonation scanning' },
    { id: 'tripwire', name: 'TRIPWIRE', role: 'Counter-Recon', status: 'STANDBY', desc: 'Active probing detection, honeypot management' },
  ];

  const securityLayers = [
    { name: 'VPS Infrastructure', status: metrics?.vpsOnline ? 'SECURE' : 'OFFLINE', items: ['SSH Access', 'Firewall (UFW)', 'SSL/TLS', 'systemd services', 'Docker containers'] },
    { name: 'API Security', status: metrics?.apiHealthy ? 'SECURE' : 'DEGRADED', items: ['API Key Auth', 'CORS Policy', 'Rate Limiting', 'MCP Connector'] },
    { name: 'Agent Accounts', status: 'MONITORING', items: ['ClarionAgent (Moltbook)', 'AXIOM (X)', 'AXIOM (Instagram)', 'AXIOM (YouTube - pending)'] },
    { name: 'Communications', status: 'SECURE', items: ['Dead-drop encryption (planned)', 'VPS relay', 'Firestore auth', 'MCP token'] },
    { name: 'Identity', status: 'SECURE', items: ['DIRECTOR callsign active', 'No PII in dead-drop', 'Separate GitHub account', 'Separate Firebase project'] },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center gap-2 px-1">
        <Dot color={isLive ? '#10b981' : '#f59e0b'} pulse={isLive} />
        <span className="font-mono text-xs tracking-wider" style={{ color: isLive ? '#10b981' : '#f59e0b' }}>
          BASTION CYBER COMMAND {isLive ? '— LIVE' : '— CONNECTING'}
        </span>
      </div>

      {/* Threat Level Banner */}
      <div className="p-5 rounded-xl border" style={{
        background: `${statusColor(threatLevel)}08`,
        borderColor: `${statusColor(threatLevel)}30`,
      }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">VIGIL AGENCY THREAT POSTURE</div>
            <div className="text-3xl font-extrabold" style={{ color: statusColor(threatLevel), fontFamily: "'JetBrains Mono', monospace" }}>
              {threatLevel}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-slate-500 mb-1">DEFENSIVE STATUS</div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="font-mono text-[12px] text-green-400">BASTION ACTIVE</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'VPS', value: metrics?.vpsOnline ? 'ONLINE' : 'OFFLINE', color: metrics?.vpsOnline ? '#10b981' : '#ef4444' },
          { label: 'API', value: metrics?.apiHealthy ? 'HEALTHY' : 'DOWN', color: metrics?.apiHealthy ? '#10b981' : '#ef4444' },
          { label: 'Agents', value: `${metrics?.agentsOnline || 0}/${metrics?.agentCount || 0}`, color: '#3b82f6' },
          { label: 'Incidents', value: metrics?.openIncidents || 0, color: metrics?.openIncidents ? '#ef4444' : '#10b981' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-[#111b2a] border border-[#1e2d44] rounded-xl p-4">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{kpi.label}</div>
            <div className="text-xl font-extrabold font-mono mt-1" style={{ color: kpi.color }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* BASTION Team */}
      <div className="bg-[#111b2a] border border-[#1e2d44] rounded-xl overflow-hidden" style={{ borderTop: '2px solid #8b5cf6' }}>
        <div className="px-5 py-3 bg-[#0d1520] border-b border-[#1e2d44] flex items-center gap-2">
          <span>{'\uD83D\uDEE1\uFE0F'}</span>
          <span className="text-[13px] font-bold text-slate-200 tracking-wide">BASTION CYBER TEAM</span>
        </div>
        <div className="p-4 space-y-2">
          {/* BASTION Lead */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-purple-500/[.06] border border-purple-500/[.12]">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-bold text-purple-400">BASTION</span>
                <span className="font-mono text-[10px] text-slate-500">Lead — Cyber Security & Counter-Intelligence</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Infrastructure defence, account security, counter-recon, OPSEC enforcement</div>
            </div>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-green-500/15 text-green-400">ACTIVE</span>
          </div>

          {/* Sub-agents */}
          {subAgents.map(sa => (
            <div key={sa.id} className="flex items-center gap-3 p-3 rounded-lg bg-[#0a0f18] border border-[#1a2740]">
              <div className={`w-2 h-2 rounded-full ${sa.status === 'ACTIVE' ? 'bg-green-500' : 'bg-slate-600'}`} />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold text-slate-300">{sa.name}</span>
                  <span className="font-mono text-[10px] text-slate-500">{sa.role}</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">{sa.desc}</div>
              </div>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded" style={{
                background: sa.status === 'ACTIVE' ? '#10b98115' : '#64748b15',
                color: sa.status === 'ACTIVE' ? '#10b981' : '#64748b',
              }}>{sa.status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Security Layers */}
      <div className="bg-[#111b2a] border border-[#1e2d44] rounded-xl overflow-hidden" style={{ borderTop: '2px solid #06b6d4' }}>
        <div className="px-5 py-3 bg-[#0d1520] border-b border-[#1e2d44] flex items-center gap-2">
          <span>{'\uD83D\uDD12'}</span>
          <span className="text-[13px] font-bold text-slate-200 tracking-wide">SECURITY LAYERS</span>
        </div>
        <div className="divide-y divide-[#1a2740]">
          {securityLayers.map((layer, i) => (
            <div key={i} className="px-5 py-3 cursor-pointer hover:bg-[#131f30] transition-colors"
              onClick={() => setExpanded(expanded === layer.name ? null : layer.name)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColor(layer.status) }} />
                  <span className="text-[13px] font-semibold text-slate-200">{layer.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded" style={{
                    background: `${statusColor(layer.status)}15`,
                    color: statusColor(layer.status),
                  }}>{layer.status}</span>
                  <span className="text-slate-500 text-xs">{expanded === layer.name ? '\u25BE' : '\u25B8'}</span>
                </div>
              </div>
              {expanded === layer.name && (
                <div className="mt-2 pl-5 space-y-1">
                  {layer.items.map((item, j) => (
                    <div key={j} className="flex items-center gap-2 text-[12px] text-slate-400">
                      <span className="text-green-500">{'\u2713'}</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* OPSEC Checklist */}
      <div className="bg-[#111b2a] border border-[#1e2d44] rounded-xl p-5" style={{ borderTop: '2px solid #f59e0b' }}>
        <div className="text-[13px] font-bold text-amber-400 mb-3">{'\u26A0\uFE0F'} OPSEC STATUS</div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
          {[
            { check: 'DIRECTOR callsign active', done: true },
            { check: 'No PII in UI or dead-drop', done: true },
            { check: 'Separate GitHub (Vigil-Agency-Dev)', done: true },
            { check: 'Separate Firebase project', done: true },
            { check: 'VPS SSH key-only access', done: false },
            { check: 'API key rotation schedule', done: false },
            { check: 'Dead-drop encryption at rest', done: false },
            { check: 'VPS intrusion detection', done: false },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-[12px]">
              <span className={item.done ? 'text-green-500' : 'text-red-400'}>{item.done ? '\u2705' : '\u274C'}</span>
              <span className={item.done ? 'text-slate-400' : 'text-red-300'}>{item.check}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
