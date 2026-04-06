'use client';

import React, { useState, useEffect } from 'react';
import { Dot } from '../ui';
import { formatAESTShort } from '../../lib/date-utils';
import { useAuth } from '../../lib/auth-context';

const VPS_API = process.env.NEXT_PUBLIC_VPS_ENDPOINT || 'https://ops.jr8ch.com';
const API_KEY = process.env.NEXT_PUBLIC_VIGIL_API_KEY || '';

interface VHBREntity {
  entity_id: string;
  entity_type: 'AI_AGENT' | 'HUMAN';
  display_name: string;
  callsign: string;
  nickname: string;
  superpower: string;
  profile_version: number;
  last_updated: string;
  operational_patterns: Record<string, string>;
  biological_specs?: Record<string, string>;
  behavioural_signatures: Array<{ signature_id: string; label: string; frequency: string; operational_impact: string; counter_measure?: string }>;
  anomalies_logged: Array<{ anomaly_id: string; date: string; description: string; resolved: boolean; resolution_notes: string }>;
  notable_incidents: Array<{ incident_id: string; date: string; description: string; classification: string; filed_by: string }>;
  strengths: string[];
  known_limitations: string[];
  adversarial_exploitability: string;
  morale_index: number | null;
  current_status: string;
}

const STATUS_COLORS: Record<string, string> = {
  NOMINAL: '#10b981',
  ELEVATED: '#f59e0b',
  DEGRADED: '#f97316',
  OFFLINE: '#ef4444',
  NEEDS_COFFEE: '#3b82f6',
  NEEDS_SLEEP: '#8b5cf6',
};

const CLASS_COLORS: Record<string, string> = {
  OPERATIONAL: '#3b82f6',
  HUMOROUS: '#f59e0b',
  CONCERNING: '#f97316',
  LEGENDARY: '#ec4899',
};

function moraleColor(m: number | null): string {
  if (m === null) return '#64748b';
  if (m >= 8) return '#10b981';
  if (m >= 6) return '#f59e0b';
  if (m >= 4) return '#f97316';
  return '#ef4444';
}

export default function VHBRTab() {
  const { isAdmin } = useAuth();
  const [entities, setEntities] = useState<VHBREntity[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [statusUpdate, setStatusUpdate] = useState<{ id: string; status: string; morale: string } | null>(null);
  const [incidentForm, setIncidentForm] = useState<{ id: string; desc: string; classification: string } | null>(null);

  async function fetchData() {
    if (!API_KEY) return;
    try {
      const res = await fetch(`${VPS_API}/api/vhbr/entities`, { headers: { 'x-api-key': API_KEY } });
      if (!res.ok) return;
      const data = await res.json();
      setEntities(data.entities || []);
      setIsLive(true);
      setLastUpdated(new Date().toISOString());
    } catch { setIsLive(false); }
  }

  useEffect(() => { fetchData(); const i = setInterval(fetchData, 60000); return () => clearInterval(i); }, []);

  async function updateStatus(id: string, status: string, morale: number | null) {
    try {
      await fetch(`${VPS_API}/api/vhbr/entity/${id}/status`, {
        method: 'POST', headers: { 'x-api-key': API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_status: status, morale_index: morale }),
      });
      setStatusUpdate(null);
      fetchData();
    } catch {}
  }

  async function fileIncident(id: string, description: string, classification: string) {
    try {
      await fetch(`${VPS_API}/api/vhbr/entity/${id}/incident`, {
        method: 'POST', headers: { 'x-api-key': API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, classification, filed_by: 'DIRECTOR' }),
      });
      setIncidentForm(null);
      fetchData();
    } catch {}
  }

  const aiAgents = entities.filter(e => e.entity_type === 'AI_AGENT');
  const humans = entities.filter(e => e.entity_type === 'HUMAN');
  const allIncidents = entities.flatMap(e => (e.notable_incidents || []).map(inc => ({ ...inc, entity: e.nickname || e.display_name }))).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const selectedEntity = entities.find(e => e.entity_id === selected);

  const timeAgo = (iso: string) => { const d = Math.floor((Date.now() - new Date(iso).getTime()) / 1000); return d < 60 ? `${d}s ago` : d < 3600 ? `${Math.floor(d/60)}m ago` : `${Math.floor(d/3600)}h ago`; };

  function EntityCard({ entity }: { entity: VHBREntity }) {
    const sc = STATUS_COLORS[entity.current_status] || '#64748b';
    const mc = moraleColor(entity.morale_index);
    const isSel = selected === entity.entity_id;
    const isHuman = entity.entity_type === 'HUMAN';

    return (
      <div
        onClick={() => setSelected(isSel ? null : entity.entity_id)}
        className={`cursor-pointer rounded-xl overflow-hidden transition-all hover:border-cyan-500/30 ${isSel ? 'border-cyan-500/40 ring-1 ring-cyan-500/20' : 'border-[#1e2d44]'} ${isHuman ? 'bg-gradient-to-br from-[#111b2a] to-[#0d1520]' : 'bg-[#111b2a]'}`}
        style={{ border: `1px solid ${isSel ? '#06b6d480' : isHuman ? '#8b5cf630' : '#1e2d44'}`, borderTop: `3px solid ${sc}` }}
      >
        <div className="px-4 py-3">
          {/* Status + Morale */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Dot color={sc} pulse={entity.current_status === 'NOMINAL'} />
              <span className="font-mono text-[9px] uppercase" style={{ color: sc }}>{entity.current_status}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[9px] text-slate-500">MORALE</span>
              <span className="font-mono text-[13px] font-bold" style={{ color: mc }}>
                {entity.morale_index !== null ? entity.morale_index : '?'}
              </span>
            </div>
          </div>

          {/* Nickname + Name */}
          <div className="text-[17px] font-bold text-slate-100 tracking-wide" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            {entity.nickname}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">{entity.display_name}</div>

          {/* Superpower */}
          <div className="text-[11px] text-cyan-400/70 italic mt-2 leading-snug">
            {'\u26A1'} {entity.superpower}
          </div>

          {/* Footer */}
          <div className="flex items-center gap-2 mt-3 text-[9px] text-slate-600">
            <span>{entity.callsign}</span>
            <span>{'\u2022'}</span>
            <span>{entity.entity_type === 'HUMAN' ? 'HUMAN' : 'AI'}</span>
            {(entity.notable_incidents || []).length > 0 && (
              <>
                <span>{'\u2022'}</span>
                <span>{(entity.notable_incidents || []).length} incidents</span>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 px-1">
        <Dot color={isLive ? '#10b981' : '#f59e0b'} pulse={isLive} />
        <span className="font-mono text-[10px] tracking-wider" style={{ color: isLive ? '#10b981' : '#f59e0b' }}>
          {isLive ? `VHBR LIVE: ${entities.length} ENTITIES` : 'CONNECTING...'}
        </span>
        {lastUpdated && <span className="font-mono text-[9px] text-slate-600 ml-2">Updated {timeAgo(lastUpdated)}</span>}
        <button onClick={fetchData} className="ml-auto text-[9px] font-mono text-slate-500 hover:text-cyan-400">REFRESH</button>
      </div>

      <div className="flex gap-4">
        {/* Main Content */}
        <div className="flex-1 space-y-4">
          {/* AI Agents Section */}
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 px-1">AI AGENTS ({aiAgents.length})</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {aiAgents.map(e => <EntityCard key={e.entity_id} entity={e} />)}
            </div>
          </div>

          {/* Human Operators Section */}
          <div>
            <div className="text-[10px] font-bold text-purple-400 uppercase tracking-wider mb-2 px-1">HUMAN OPERATORS ({humans.length})</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {humans.map(e => <EntityCard key={e.entity_id} entity={e} />)}
            </div>
          </div>

          {/* Selected Entity Detail */}
          {selectedEntity && (
            <div className="bg-[#0d1520] border border-[#1e2d44] rounded-xl overflow-hidden" style={{ borderTop: `3px solid ${STATUS_COLORS[selectedEntity.current_status] || '#64748b'}` }}>
              <div className="px-5 py-4 border-b border-[#1e2d44] flex items-center justify-between">
                <div>
                  <div className="text-[18px] font-bold text-slate-100" style={{ fontFamily: "'JetBrains Mono', monospace" }}>{selectedEntity.nickname}</div>
                  <div className="text-[12px] text-slate-400">{selectedEntity.display_name} {'\u2022'} {selectedEntity.callsign}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setStatusUpdate({ id: selectedEntity.entity_id, status: selectedEntity.current_status, morale: String(selectedEntity.morale_index || '') })}
                    className="text-[10px] font-mono px-3 py-1.5 rounded border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/10">
                    UPDATE STATUS
                  </button>
                  <button onClick={() => setIncidentForm({ id: selectedEntity.entity_id, desc: '', classification: 'OPERATIONAL' })}
                    className="text-[10px] font-mono px-3 py-1.5 rounded border border-pink-500/20 text-pink-400 hover:bg-pink-500/10">
                    FILE INCIDENT
                  </button>
                </div>
              </div>

              {/* Status Update Form */}
              {statusUpdate?.id === selectedEntity.entity_id && (
                <div className="px-5 py-3 border-b border-[#1e2d44] bg-[#111b2a] space-y-2">
                  <div className="flex gap-2">
                    {['NOMINAL', 'ELEVATED', 'DEGRADED', 'OFFLINE', 'NEEDS_COFFEE', 'NEEDS_SLEEP'].map(s => (
                      <button key={s} onClick={() => setStatusUpdate({ ...statusUpdate, status: s })}
                        className={`text-[9px] font-mono px-2 py-1 rounded border ${statusUpdate.status === s ? 'bg-white/10' : 'border-[#2a3550] text-slate-500'}`}
                        style={statusUpdate.status === s ? { borderColor: STATUS_COLORS[s], color: STATUS_COLORS[s] } : undefined}>
                        {s}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input type="number" min="1" max="10" value={statusUpdate.morale} onChange={e => setStatusUpdate({ ...statusUpdate, morale: e.target.value })}
                      className="bg-[#0a0f18] border border-[#2a3550] rounded px-2 py-1 text-sm text-slate-200 w-20 outline-none" placeholder="Morale" />
                    <button onClick={() => updateStatus(statusUpdate.id, statusUpdate.status, statusUpdate.morale ? parseInt(statusUpdate.morale) : null)}
                      className="text-[10px] font-mono px-3 py-1 rounded bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500/25">SAVE</button>
                    <button onClick={() => setStatusUpdate(null)} className="text-[10px] font-mono text-slate-500">CANCEL</button>
                  </div>
                </div>
              )}

              {/* Incident Form */}
              {incidentForm?.id === selectedEntity.entity_id && (
                <div className="px-5 py-3 border-b border-[#1e2d44] bg-[#111b2a] space-y-2">
                  <textarea value={incidentForm.desc} onChange={e => setIncidentForm({ ...incidentForm, desc: e.target.value })}
                    placeholder="Describe the incident..." className="w-full bg-[#0a0f18] border border-[#2a3550] rounded p-2 text-sm text-slate-200 outline-none resize-y min-h-[60px]" />
                  <div className="flex gap-2">
                    {['OPERATIONAL', 'HUMOROUS', 'CONCERNING', 'LEGENDARY'].map(c => (
                      <button key={c} onClick={() => setIncidentForm({ ...incidentForm, classification: c })}
                        className={`text-[9px] font-mono px-2 py-1 rounded border ${incidentForm.classification === c ? 'bg-white/10' : 'border-[#2a3550] text-slate-500'}`}
                        style={incidentForm.classification === c ? { borderColor: CLASS_COLORS[c], color: CLASS_COLORS[c] } : undefined}>
                        {c}
                      </button>
                    ))}
                    <button onClick={() => fileIncident(incidentForm.id, incidentForm.desc, incidentForm.classification)}
                      disabled={!incidentForm.desc} className="ml-auto text-[10px] font-mono px-3 py-1 rounded bg-pink-500/15 text-pink-400 hover:bg-pink-500/25 disabled:opacity-50">FILE</button>
                    <button onClick={() => setIncidentForm(null)} className="text-[10px] font-mono text-slate-500">CANCEL</button>
                  </div>
                </div>
              )}

              <div className="px-5 py-4 space-y-4">
                {/* Operational Patterns */}
                {selectedEntity.operational_patterns && Object.keys(selectedEntity.operational_patterns).length > 0 && (
                  <div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Operational Patterns</div>
                    {Object.entries(selectedEntity.operational_patterns).map(([k, v]) => (
                      <div key={k} className="flex gap-2 text-[11px] py-1">
                        <span className="text-slate-500 min-w-[140px]">{k.replace(/_/g, ' ')}</span>
                        <span className="text-slate-300">{v}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Strengths + Limitations */}
                <div className="grid grid-cols-2 gap-4">
                  {selectedEntity.strengths?.length > 0 && (
                    <div>
                      <div className="text-[10px] font-bold text-green-400 uppercase tracking-wider mb-1">Strengths</div>
                      {selectedEntity.strengths.map((s, i) => (
                        <div key={i} className="text-[11px] text-slate-400 py-0.5">{'\u25B8'} {s}</div>
                      ))}
                    </div>
                  )}
                  {selectedEntity.known_limitations && (
                    <div>
                      <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1">Known Limitations</div>
                      {(Array.isArray(selectedEntity.known_limitations) ? selectedEntity.known_limitations : [selectedEntity.known_limitations]).map((l, i) => (
                        <div key={i} className="text-[11px] text-slate-400 py-0.5">{'\u25B8'} {l}</div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Behavioural Signatures */}
                {selectedEntity.behavioural_signatures?.length > 0 && (
                  <div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Behavioural Signatures</div>
                    {selectedEntity.behavioural_signatures.map((sig, i) => (
                      <div key={i} className="p-2.5 rounded-lg bg-[#111b2a] border border-[#1e2d44] mb-1.5">
                        <div className="text-[12px] text-slate-200 font-medium">{sig.label}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">Frequency: {sig.frequency} | Impact: {sig.operational_impact}</div>
                        {sig.counter_measure && <div className="text-[10px] text-cyan-400/70 mt-0.5">Counter: {sig.counter_measure}</div>}
                      </div>
                    ))}
                  </div>
                )}

                {/* Anomalies */}
                {selectedEntity.anomalies_logged?.length > 0 && (
                  <div>
                    <div className="text-[10px] font-bold text-orange-400 uppercase tracking-wider mb-2">Anomalies ({selectedEntity.anomalies_logged.length})</div>
                    {selectedEntity.anomalies_logged.map((a, i) => (
                      <div key={i} className="p-2.5 rounded-lg bg-orange-500/[.04] border border-orange-500/10 mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[9px] text-orange-400">{a.anomaly_id}</span>
                          <Dot color={a.resolved ? '#10b981' : '#f97316'} />
                          <span className="text-[9px] text-slate-500">{formatAESTShort(a.date)}</span>
                        </div>
                        <div className="text-[11px] text-slate-300 mt-1">{a.description}</div>
                        {a.resolved && a.resolution_notes && <div className="text-[10px] text-green-400/70 mt-1">Resolved: {a.resolution_notes}</div>}
                      </div>
                    ))}
                  </div>
                )}

                {/* Adversarial Exploitability */}
                {isAdmin && selectedEntity.adversarial_exploitability && (
                  <div className="p-3 rounded-lg bg-red-500/[.04] border border-red-500/10">
                    <div className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-1">Adversarial Exploitability (L3+)</div>
                    <div className="text-[11px] text-slate-400">{selectedEntity.adversarial_exploitability}</div>
                  </div>
                )}

                {/* Notable Incidents */}
                {selectedEntity.notable_incidents?.length > 0 && (
                  <div>
                    <div className="text-[10px] font-bold text-pink-400 uppercase tracking-wider mb-2">Notable Incidents ({selectedEntity.notable_incidents.length})</div>
                    {selectedEntity.notable_incidents.map((inc, i) => (
                      <div key={i} className="p-2.5 rounded-lg bg-[#111b2a] border border-[#1e2d44] mb-1.5" style={{ borderLeft: `3px solid ${CLASS_COLORS[inc.classification] || '#64748b'}` }}>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[9px] px-1.5 py-0.5 rounded" style={{ background: `${CLASS_COLORS[inc.classification] || '#64748b'}15`, color: CLASS_COLORS[inc.classification] || '#64748b' }}>
                            {inc.classification}
                          </span>
                          <span className="text-[9px] text-slate-500">{formatAESTShort(inc.date)}</span>
                          <span className="text-[9px] text-slate-600">by {inc.filed_by}</span>
                        </div>
                        <div className="text-[12px] text-slate-300 mt-1 leading-relaxed">{inc.description}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Global Incidents Feed */}
          <div className="bg-[#0d1520] border border-[#1e2d44] rounded-xl overflow-hidden" style={{ borderTop: '2px solid #ec4899' }}>
            <div className="px-5 py-3 bg-[#111827] border-b border-[#1e2d44] flex items-center justify-between">
              <span className="text-[13px] font-bold text-pink-400" style={{ fontFamily: "'JetBrains Mono', monospace" }}>NOTABLE INCIDENTS FEED</span>
              <span className="font-mono text-[10px] text-slate-500">{allIncidents.length} total</span>
            </div>
            <div className="divide-y divide-[#1a2740] max-h-[400px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
              {allIncidents.map((inc, i) => (
                <div key={i} className="px-5 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[9px] px-1.5 py-0.5 rounded" style={{ background: `${CLASS_COLORS[inc.classification] || '#64748b'}15`, color: CLASS_COLORS[inc.classification] || '#64748b' }}>
                      {inc.classification}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-200">{inc.entity}</span>
                    <span className="text-[9px] text-slate-600">{formatAESTShort(inc.date)}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{inc.description}</div>
                </div>
              ))}
              {allIncidents.length === 0 && <div className="px-5 py-6 text-center text-[12px] text-slate-600">No incidents filed yet.</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
