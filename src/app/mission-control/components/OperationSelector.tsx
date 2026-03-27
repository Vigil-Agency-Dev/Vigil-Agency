'use client';

import React, { useState, useRef, useEffect } from 'react';
import { OPERATIONS } from '../lib/mission-data';
import type { Operation, ThreatLevel } from '../lib/types';
import { Badge, Dot } from './ui';

const THREAT_COLORS: Record<string, string> = {
  GREEN: '#10b981',
  YELLOW: '#eab308',
  AMBER: '#f59e0b',
  ORANGE: '#f97316',
  RED: '#ef4444',
  BLACK: '#6b7280',
};

const THREAT_OPTIONS: ThreatLevel[] = ['GREEN', 'YELLOW', 'AMBER', 'ORANGE', 'RED', 'BLACK'];

interface OperationSelectorProps {
  current: Operation;
  operations: Operation[];
  onSelect: (op: Operation) => void;
  onAddOperation: (op: Operation) => void;
}

export default function OperationSelector({ current, operations, onSelect, onAddOperation }: OperationSelectorProps) {
  const [open, setOpen] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newCodename, setNewCodename] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newThreat, setNewThreat] = useState<ThreatLevel>('GREEN');
  const [newStatus, setNewStatus] = useState<'active' | 'standby'>('standby');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setShowNewForm(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const dayCount = (op: Operation) => {
    if (!op.startDate) return '\u2014';
    const start = new Date(op.startDate);
    const now = new Date();
    const days = Math.floor((now.getTime() - start.getTime()) / 86400000) + 1;
    return `Day ${days}`;
  };

  const handleCreate = () => {
    if (!newCodename.trim()) return;
    const op: Operation = {
      id: `op-${String(operations.length + 1).padStart(3, '0')}`,
      codename: newCodename.toUpperCase(),
      status: newStatus,
      threatLevel: newThreat,
      description: newDescription,
      startDate: newStatus === 'active' ? new Date().toISOString().split('T')[0] : '',
      missions: [],
    };
    onAddOperation(op);
    setNewCodename('');
    setNewDescription('');
    setNewThreat('GREEN');
    setNewStatus('standby');
    setShowNewForm(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#2a3550] hover:border-[#3a4560] bg-[#111827]/80 transition-all"
      >
        <Dot color={THREAT_COLORS[current.threatLevel] || '#6b7280'} pulse={current.status === 'active'} />
        <span
          className="text-[12px] font-semibold tracking-wider text-cyan-400"
          style={{ fontFamily: "'JetBrains Mono', monospace" }}
        >
          {current.codename}
        </span>
        <svg
          className={`w-3 h-3 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-[420px] bg-[#111827] border border-[#2a3550] rounded-xl shadow-2xl shadow-black/50 z-[100] animate-fadeIn">
          <div className="px-4 py-3 border-b border-[#2a3550] flex items-center justify-between">
            <div className="text-[9px] font-semibold text-slate-500 tracking-[.2em] uppercase">Your Operations</div>
            <button
              onClick={() => setShowNewForm(!showNewForm)}
              className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              {showNewForm ? 'CANCEL' : '+ NEW OPERATION'}
            </button>
          </div>

          {/* New Operation Form */}
          {showNewForm && (
            <div className="px-4 py-4 border-b border-[#2a3550] bg-white/[.01]">
              <div className="flex flex-col gap-3">
                <div>
                  <label className="block text-[9px] font-medium text-slate-500 uppercase tracking-wider mb-1">Operation Codename</label>
                  <input
                    type="text"
                    value={newCodename}
                    onChange={e => setNewCodename(e.target.value)}
                    placeholder="e.g. IRON CURTAIN"
                    className="w-full px-3 py-2 bg-[#0a0e17] border border-[#2a3550] rounded-md text-sm text-slate-200 placeholder:text-slate-600 focus:border-cyan-500 outline-none font-mono tracking-wider"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-medium text-slate-500 uppercase tracking-wider mb-1">Description</label>
                  <input
                    type="text"
                    value={newDescription}
                    onChange={e => setNewDescription(e.target.value)}
                    placeholder="Brief description of the operation"
                    className="w-full px-3 py-2 bg-[#0a0e17] border border-[#2a3550] rounded-md text-sm text-slate-200 placeholder:text-slate-600 focus:border-cyan-500 outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-medium text-slate-500 uppercase tracking-wider mb-1">Threat Level</label>
                    <select
                      value={newThreat}
                      onChange={e => setNewThreat(e.target.value as ThreatLevel)}
                      className="w-full px-3 py-2 bg-[#0a0e17] border border-[#2a3550] rounded-md text-sm text-slate-200 outline-none"
                    >
                      {THREAT_OPTIONS.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-medium text-slate-500 uppercase tracking-wider mb-1">Status</label>
                    <select
                      value={newStatus}
                      onChange={e => setNewStatus(e.target.value as 'active' | 'standby')}
                      className="w-full px-3 py-2 bg-[#0a0e17] border border-[#2a3550] rounded-md text-sm text-slate-200 outline-none"
                    >
                      <option value="standby">Standby</option>
                      <option value="active">Active</option>
                    </select>
                  </div>
                </div>
                <button
                  onClick={handleCreate}
                  disabled={!newCodename.trim()}
                  className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-cyan-600/30 disabled:text-white/30 text-white font-semibold rounded-md text-xs tracking-wider transition-all font-mono"
                >
                  REGISTER OPERATION
                </button>
              </div>
            </div>
          )}

          {/* Operation List */}
          <div className="py-1">
            {operations.map(op => (
              <button
                key={op.id}
                onClick={() => { onSelect(op); setOpen(false); setShowNewForm(false); }}
                className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-white/[.03] transition-all ${
                  op.id === current.id ? 'bg-white/[.04]' : ''
                }`}
              >
                <div className="flex-shrink-0 w-5 flex justify-center">
                  {op.id === current.id ? (
                    <div className="w-2 h-2 rounded-full bg-cyan-400" />
                  ) : (
                    <div className="w-2 h-2 rounded-full border border-slate-600" />
                  )}
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[11px] font-semibold tracking-wider ${
                        op.id === current.id ? 'text-cyan-400' : 'text-slate-300'
                      }`}
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {op.codename}
                    </span>
                  </div>
                  <div className="text-[9px] text-slate-500 mt-0.5">{op.description}</div>
                </div>
                <div className="flex-shrink-0 flex flex-col items-end gap-1">
                  <Badge level={op.threatLevel} small />
                  <span className="text-[9px] text-slate-500 font-mono">
                    {op.status === 'active' ? dayCount(op) : op.status.toUpperCase()}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
