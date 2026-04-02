'use client';

import React, { useState, useEffect } from 'react';
import { Dot } from './ui';

const VPS_API = process.env.NEXT_PUBLIC_VPS_ENDPOINT || 'https://ops.jr8ch.com';
const API_KEY = process.env.NEXT_PUBLIC_VIGIL_API_KEY || '';

interface AgentStatus {
  id: string;
  name: string;
  status: string;
  lastHeartbeat?: string;
  lastAnalysis?: string;
  lastActivity?: string;
}

// Expected heartbeat intervals per agent (hours)
const EXPECTED_INTERVALS: Record<string, number> = {
  clarion: 4,
  'mission-control': 6,
  meridian: 24,
  sentinel: 24,
  axiom: 12,
  bastion: 24,
  herald: 48,
};

function getHealthColor(agentId: string, lastTime: string | undefined): string {
  if (!lastTime) return '#64748b'; // Unknown — grey
  const hoursAgo = (Date.now() - new Date(lastTime).getTime()) / 3600000;
  const expected = EXPECTED_INTERVALS[agentId] || 24;
  if (hoursAgo <= expected) return '#10b981'; // Green — on schedule
  if (hoursAgo <= expected * 2) return '#f59e0b'; // Amber — slightly late
  return '#ef4444'; // Red — overdue
}

function getHealthLabel(agentId: string, lastTime: string | undefined): string {
  if (!lastTime) return 'NO DATA';
  const hoursAgo = (Date.now() - new Date(lastTime).getTime()) / 3600000;
  const expected = EXPECTED_INTERVALS[agentId] || 24;
  if (hoursAgo <= expected) return 'ON TIME';
  if (hoursAgo <= expected * 2) return 'LATE';
  return 'OVERDUE';
}

function timeSince(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export default function AgentHealth() {
  const [agents, setAgents] = useState<AgentStatus[]>([]);

  useEffect(() => {
    if (!API_KEY) return;
    async function load() {
      try {
        const res = await fetch(`${VPS_API}/api/mission/agents`, { headers: { 'x-api-key': API_KEY } });
        if (!res.ok) return;
        const data = await res.json();
        setAgents(data.agents || []);
      } catch { /* silent */ }
    }
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, []);

  if (agents.length === 0) return null;

  return (
    <div className="px-3 py-2 border-b border-[#1e2d44]">
      <div className="text-[9px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Agent Health</div>
      <div className="space-y-1">
        {agents.map(agent => {
          const lastTime = agent.lastHeartbeat || agent.lastAnalysis || agent.lastActivity;
          const color = getHealthColor(agent.id, lastTime);
          const label = getHealthLabel(agent.id, lastTime);
          return (
            <div key={agent.id} className="flex items-center gap-1.5">
              <Dot color={color} pulse={agent.status === 'ACTIVE' && label === 'ON TIME'} />
              <span className="font-mono text-[9px] text-slate-400 flex-1 truncate">{agent.name.length > 12 ? agent.id.toUpperCase() : agent.name}</span>
              <span className="font-mono text-[8px]" style={{ color }}>
                {lastTime ? timeSince(lastTime) : '--'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
