'use client';

import React, { useState, useEffect } from 'react';
import { Badge, Card, Dot } from '../ui';
import { VECTORS, ESCALATION } from '../../lib/mission-data';
import { formatAESTShort } from '../../lib/date-utils';

const VPS_API = process.env.NEXT_PUBLIC_VPS_ENDPOINT || 'https://ops.jr8ch.com';
const API_KEY = process.env.NEXT_PUBLIC_VIGIL_API_KEY || '';

interface Agent {
  id: string;
  name: string;
  realm: string;
  platform: string;
  status: string;
  role: string;
  lastHeartbeat?: string;
  lastAnalysis?: string;
  lastActivity?: string;
  gateway?: { active: boolean; state: string };
  model?: string;
}

interface TeamReport {
  team: string;
  status: Record<string, unknown>;
  received: string;
}

interface Threat {
  id: string;
  name: string;
  severity: string;
  status: string;
  detail: string;
}

const REALM_COLORS: Record<string, string> = {
  AI: '#06b6d4',
  C2: '#8b5cf6',
  OSINT: '#f59e0b',
  Sales: '#10b981',
  Human: '#3b82f6',
  Cyber: '#ef4444',
  'Media/Distribution': '#ec4899',
  Media: '#ec4899',
  'OSINT/Engagement': '#06b6d4',
};

const REALM_ICONS: Record<string, string> = {
  AI: '\uD83E\uDD16',
  C2: '\uD83E\uDDE0',
  OSINT: '\uD83D\uDD0D',
  Sales: '\uD83D\uDCB0',
  Human: '\uD83D\uDC64',
  Cyber: '\uD83D\uDD12',
  'Media/Distribution': '\uD83D\uDCE2',
  Media: '\uD83D\uDCE2',
  'OSINT/Engagement': '\uD83D\uDD0D',
};

// Expected heartbeat intervals per agent (hours).
// Twice-daily cadence = 12h for agents on the standard cron.
const EXPECTED_INTERVALS: Record<string, number> = {
  clarion: 12,
  'mission-control': 12,
  commander: 12,
  meridian: 24,
  bastion: 24,
  herald: 48,
};

function timeSince(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function getHealthInfo(agentId: string, lastTime: string | undefined): { color: string; label: string } {
  if (!lastTime) return { color: '#64748b', label: 'NO DATA' };
  const hoursAgo = (Date.now() - new Date(lastTime).getTime()) / 3600000;
  const expected = EXPECTED_INTERVALS[agentId] || 24;
  if (hoursAgo <= expected) return { color: '#10b981', label: 'ON SCHEDULE' };
  if (hoursAgo <= expected * 2) return { color: '#f59e0b', label: 'LATE' };
  return { color: '#ef4444', label: 'OVERDUE' };
}

export default function AgentStatusTab() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [teamReports, setTeamReports] = useState<TeamReport[]>([]);
  const [threats, setThreats] = useState<Threat[]>([]);
  const [threatLevel, setThreatLevel] = useState<string>('');
  const [isLive, setIsLive] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  useEffect(() => {
    if (!API_KEY) return;
    async function load() {
      try {
        const [agentsRes, teamRes, threatsRes, tlRes] = await Promise.all([
          fetch(`${VPS_API}/api/mission/agents`, { headers: { 'x-api-key': API_KEY } }),
          fetch(`${VPS_API}/api/mission/team-reports`, { headers: { 'x-api-key': API_KEY } }),
          fetch(`${VPS_API}/api/mission/threats`, { headers: { 'x-api-key': API_KEY } }),
          fetch(`${VPS_API}/api/mission/threat-level`, { headers: { 'x-api-key': API_KEY } }),
        ]);

        if (agentsRes.ok) {
          const data = await agentsRes.json();
          setAgents(data.agents || []);
        }
        if (teamRes.ok) {
          const data = await teamRes.json();
          setTeamReports(data.reports || []);
        }
        if (threatsRes.ok) {
          const data = await threatsRes.json();
          setThreats(data.threats || []);
        }
        if (tlRes.ok) {
          const data = await tlRes.json();
          setThreatLevel(data.level || '');
        }
        setIsLive(true);
        setLastUpdated(new Date().toISOString());
      } catch { setIsLive(false); }
    }
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, []);

  const displayThreats = isLive && threats.length > 0 ? threats : VECTORS;
  const activeThreats = displayThreats.filter(t => t.status === 'ACTIVE').length;
  const monitoringThreats = displayThreats.filter(t => t.status === 'MONITORING').length;
  const activeAgents = agents.filter(a => a.status === 'ACTIVE').length;

  // Get team report for a specific agent
  function getTeamReport(agentId: string): TeamReport | undefined {
    const idMap: Record<string, string[]> = {
      clarion: ['clarion', 'clarion_intel_analyst', 'ClarionAgent'],
      'mission-control': ['mission-control', 'mcp', 'commander', 'COMMANDER', 'MCP'],
      meridian: ['meridian', 'MERIDIAN'],
      commander: ['commander', 'COMMANDER'],
      bastion: ['bastion', 'BASTION'],
      herald: ['herald', 'HERALD'],
    };
    const names = idMap[agentId] || [agentId];
    return teamReports.find(r => names.some(n => r.team?.toLowerCase() === n.toLowerCase()));
  }

  const timeAgo = (iso: string) => {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Status Bar */}
      <div className="flex items-center gap-2 px-1">
        <Dot color={isLive ? '#10b981' : '#f59e0b'} pulse={isLive} />
        <span className="font-mono text-[10px] tracking-wider" style={{ color: isLive ? '#10b981' : '#f59e0b' }}>
          {isLive ? `LIVE — ${agents.length} AGENTS · ${displayThreats.length} THREATS` : 'CONNECTING...'}
        </span>
        {lastUpdated && <span className="font-mono text-[9px] text-slate-600 ml-2">Updated {timeAgo(lastUpdated)}</span>}
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
        {[
          { label: 'Agents Online', value: activeAgents, total: agents.length, color: '#10b981' },
          { label: 'Threat Level', value: threatLevel || 'UNKNOWN', color: threatLevel === 'RED' ? '#ef4444' : threatLevel === 'ORANGE' ? '#f97316' : '#f59e0b' },
          { label: 'Active Threats', value: activeThreats, color: '#ef4444' },
          { label: 'Monitoring', value: monitoringThreats, color: '#f59e0b' },
          { label: 'Team Reports', value: teamReports.length, color: '#8b5cf6' },
          { label: 'Realms', value: [...new Set(agents.map(a => a.realm))].length, color: '#06b6d4' },
        ].map((kpi, i) => (
          <div key={i} className="bg-[#1a2235] border border-[#2a3550] rounded-lg p-3" style={{ borderLeft: `3px solid ${kpi.color}` }}>
            <div className="text-[9px] text-slate-500 uppercase tracking-wider">{kpi.label}</div>
            <div className="font-mono text-xl font-bold mt-0.5" style={{ color: kpi.color }}>
              {kpi.value}{(kpi as any).total !== undefined ? <span className="text-[11px] text-slate-500">/{(kpi as any).total}</span> : null}
            </div>
          </div>
        ))}
      </div>

      {/* Agent Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
        {agents.map(agent => {
          const lastTime = agent.lastHeartbeat || agent.lastAnalysis || agent.lastActivity;
          const health = getHealthInfo(agent.id, lastTime);
          const realmColor = REALM_COLORS[agent.realm] || '#64748b';
          const realmIcon = REALM_ICONS[agent.realm] || '\uD83D\uDCE1';
          const report = getTeamReport(agent.id);
          const isSelected = selectedAgent === agent.id;

          return (
            <div
              key={agent.id}
              className={`bg-[#111b2a] border rounded-xl overflow-hidden cursor-pointer transition-all hover:border-cyan-500/30 ${
                isSelected ? 'border-cyan-500/40 ring-1 ring-cyan-500/20' : 'border-[#1e2d44]'
              }`}
              style={{ borderTop: `3px solid ${realmColor}` }}
              onClick={() => setSelectedAgent(isSelected ? null : agent.id)}
            >
              {/* Agent Header */}
              <div className="px-4 py-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ background: `${realmColor}15` }}>
                  {realmIcon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-bold text-slate-200">{agent.name}</span>
                    <Dot color={agent.status === 'ACTIVE' ? '#10b981' : agent.status === 'UNKNOWN' ? '#f59e0b' : '#ef4444'} pulse={agent.status === 'ACTIVE'} />
                  </div>
                  <div className="text-[10px] text-slate-500">{agent.realm} — {agent.platform}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-mono text-[10px] font-bold" style={{ color: health.color }}>{health.label}</div>
                  <div className="font-mono text-[9px] text-slate-500">{lastTime ? timeSince(lastTime) : 'No data'}</div>
                </div>
              </div>

              {/* Agent Stats Bar */}
              <div className="px-4 pb-2 flex items-center gap-2 flex-wrap">
                <span className="font-mono text-[9px] px-1.5 py-0.5 rounded" style={{
                  background: agent.status === 'ACTIVE' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                  color: agent.status === 'ACTIVE' ? '#10b981' : '#f59e0b',
                }}>
                  {agent.status}
                </span>
                <span className="font-mono text-[9px] px-1.5 py-0.5 rounded" style={{ background: `${realmColor}15`, color: realmColor }}>
                  {agent.realm}
                </span>
                {agent.model && (
                  <span className="font-mono text-[9px] px-1.5 py-0.5 rounded" style={{
                    background: agent.model.includes('opus') ? 'rgba(239,68,68,0.1)' : 'rgba(139,92,246,0.1)',
                    color: agent.model.includes('opus') ? '#ef4444' : '#8b5cf6',
                  }}>
                    {agent.model.includes('opus') ? 'OPUS' : 'SONNET'}
                  </span>
                )}
                {agent.gateway && (
                  <span className="font-mono text-[9px] px-1.5 py-0.5 rounded" style={{
                    background: agent.gateway.active ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                    color: agent.gateway.active ? '#10b981' : '#ef4444',
                  }}>
                    GW {agent.gateway.state}
                  </span>
                )}
              </div>

              {/* Role */}
              <div className="px-4 pb-3">
                <div className="text-[11px] text-slate-500 leading-snug">{agent.role}</div>
              </div>

              {/* Expanded: Team Report + Activity */}
              {isSelected && (
                <div className="border-t border-[#1e2d44] px-4 py-3 bg-[#0a0f18]">
                  {/* Heartbeat Timeline */}
                  <div className="mb-3">
                    <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">HEARTBEAT</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full bg-[#1a2235] overflow-hidden">
                        {lastTime && (() => {
                          const hoursAgo = (Date.now() - new Date(lastTime).getTime()) / 3600000;
                          const expected = EXPECTED_INTERVALS[agent.id] || 24;
                          const pct = Math.min(100, Math.max(5, (1 - hoursAgo / (expected * 2)) * 100));
                          return <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: health.color }} />;
                        })()}
                      </div>
                      <span className="font-mono text-[9px]" style={{ color: health.color }}>
                        {lastTime ? formatAESTShort(lastTime) : '--'}
                      </span>
                    </div>
                    <div className="text-[9px] text-slate-600 mt-1">
                      Expected every {EXPECTED_INTERVALS[agent.id] || 24}h
                    </div>
                  </div>

                  {/* Latest Team Report */}
                  {report ? (
                    <div>
                      <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">LATEST TEAM REPORT</div>
                      <div className="text-[10px] text-slate-400 mb-1">
                        Filed: {formatAESTShort(report.received)}
                      </div>
                      <div className="text-[11px] text-slate-300 leading-relaxed p-2.5 rounded-lg bg-[#111b2a] border border-[#1e2d44] max-h-[200px] overflow-y-auto" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px' }}>
                        {typeof report.status === 'string'
                          ? report.status
                          : report.status?.summary
                            ? String(report.status.summary)
                            : JSON.stringify(report.status, null, 2).slice(0, 500)
                        }
                      </div>
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-600 italic">No team report on file</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Threat Environment */}
      <Card title={`Threat Environment — ${displayThreats.length} Vectors`} icon="&#x1F6E1;&#xFE0F;" accent="#ef4444" full>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
          {displayThreats.map((v, i) => (
            <div key={i} className="flex items-start justify-between p-2.5 px-3 rounded-lg bg-white/[.02] border border-white/[.03]">
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[9px] text-slate-500">{v.id}</span>
                  <span className="text-xs font-medium">{v.name}</span>
                  <span className="font-mono text-[9px] px-1.5 py-0.5 rounded" style={{
                    background: v.status === 'ACTIVE' ? 'rgba(239,68,68,0.1)' : v.status === 'EXPANDING' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.1)',
                    color: v.status === 'ACTIVE' || v.status === 'EXPANDING' ? '#ef4444' : '#f59e0b',
                  }}>
                    {v.status}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1 leading-snug">{v.detail}</div>
              </div>
              <div className="flex-shrink-0 ml-2">
                <Badge level={v.severity as any} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Escalation Ladder */}
      <Card title="Escalation Ladder" icon="&#x1F6A8;" accent="#f97316" full>
        {ESCALATION.map((e, i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-2.5 px-3 rounded-md mb-1.5"
            style={{
              background: e.current ? 'rgba(249,115,22,.08)' : 'rgba(255,255,255,.015)',
              border: e.current ? '1px solid rgba(249,115,22,.3)' : '1px solid transparent',
            }}
          >
            <Badge level={e.level} />
            <div className="flex-1">
              <div className="text-xs">{e.trigger}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Action: {e.action}</div>
            </div>
            {e.current && (
              <span className="font-mono text-[9px] text-orange-500 animate-pulse">CURRENT</span>
            )}
          </div>
        ))}
      </Card>
    </div>
  );
}
