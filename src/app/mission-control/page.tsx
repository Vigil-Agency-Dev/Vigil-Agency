'use client';

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './lib/auth-context';
import { MISSION, OPERATIONS } from './lib/mission-data';
import type { Operation } from './lib/types';
import { Dot } from './components/ui';
import SignIn from './components/SignIn';
import AdminPanel from './components/AdminPanel';
import OperationSelector from './components/OperationSelector';
import {
  OverviewTab,
  ThreatsTab,
  ScoutTab,
  AlliesTab,
  IntelReportsTab,
  OrdersTab,
  IntelExchangeTab,
  EpsteinIntelTab,
  TimelineTab,
  CounterMeasuresTab,
  NotebookTab,
  GatewayTab,
  AgentCommsTab,
  OracleTab,
  ConflictMapTab,
  HypothesesTab,
  RegistersTab,
} from './components/tabs';

const VPS_API = process.env.NEXT_PUBLIC_VPS_ENDPOINT || 'https://ops.jr8ch.com';
const API_KEY = process.env.NEXT_PUBLIC_VIGIL_API_KEY || '';

const BASE_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'threats', label: 'Threats' },
  { id: 'scout', label: 'SCOUT Cluster' },
  { id: 'allies', label: 'Allies' },
  { id: 'intel', label: 'Intel Reports' },
  { id: 'orders', label: 'Orders' },
  { id: 'exchange', label: 'Intel Exchange' },
  { id: 'epstein', label: 'Epstein Intel' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'cms', label: 'Counter-Measures' },
  { id: 'registers', label: 'Registers' },
  { id: 'hypotheses', label: 'Hypotheses' },
  { id: 'oracle', label: 'ORACLE' },
  { id: 'atlas', label: 'ATLAS' },
  { id: 'notebook', label: 'Notebook' },
];

const ADMIN_TABS = [
  { id: 'gateway', label: 'Gateway' },
  { id: 'comms', label: 'Agent Comms' },
];

class ErrorBoundary extends React.Component<{ children: React.ReactNode; fallback?: string }, { hasError: boolean; error: string }> {
  constructor(props: any) { super(props); this.state = { hasError: false, error: '' }; }
  static getDerivedStateFromError(error: Error) { return { hasError: true, error: error.message }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
          <div className="text-sm font-bold text-red-400 mb-2">Component Error</div>
          <div className="text-xs text-red-300 font-mono">{this.state.error}</div>
          <button onClick={() => this.setState({ hasError: false })} className="mt-3 text-xs text-cyan-400 hover:text-cyan-300">Retry</button>
        </div>
      );
    }
    return this.props.children;
  }
}

function Dashboard() {
  const { user, profile, loading, logout, isAdmin } = useAuth();
  const [tab, setTab] = useState('overview');
  const [showAdmin, setShowAdmin] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [ops, setOps] = useState<Operation[]>(OPERATIONS);
  const [currentOp, setCurrentOp] = useState<Operation>(OPERATIONS[0]);
  const isLumen = currentOp.id === 'op-001';
  const [liveMission, setLiveMission] = useState<Record<string, unknown> | null>(null);

  // Fetch live mission data for header
  useEffect(() => {
    if (!API_KEY) return;
    async function fetchHeader() {
      try {
        const res = await fetch(`${VPS_API}/api/mission/overview`, {
          headers: { 'x-api-key': API_KEY },
        });
        if (res.ok) {
          const data = await res.json();
          setLiveMission(data.mission);
        }
      } catch {
        // Silent fail — falls back to static
      }
    }
    fetchHeader();
    const interval = setInterval(fetchHeader, 60000);
    return () => clearInterval(interval);
  }, []);

  const mission = liveMission || MISSION;
  const rawOpsec = (typeof mission.opsec === 'object' ? (mission.opsec as any).status : mission.opsec as string) || MISSION.opsec;
  const opsec = rawOpsec === 'UNKNOWN' ? 'GREEN' : rawOpsec; // Default to GREEN if agent hasn't reported
  const rawThreat = (mission.threat as string) || MISSION.threat;
  const threat = rawThreat === 'UNKNOWN' ? 'ORANGE' : rawThreat; // Default to ORANGE (last known)
  const phase = (mission.phase as string) || MISSION.phase;
  const day = (mission.day as number) || MISSION.day;
  const dayNum = liveMission
    ? Math.ceil((Date.now() - new Date(MISSION.startDate).getTime()) / 86400000)
    : day;

  const handleAddOperation = (op: Operation) => {
    setOps(prev => [...prev, op]);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#060a12]">
        <div className="text-center">
          <img src="/images/brand/vigil-logo.png" alt="VIGIL" className="w-14 h-14 mb-3 animate-pulse object-contain" />
          <div className="font-mono text-sm text-cyan-400 tracking-widest">AUTHENTICATING...</div>
        </div>
      </div>
    );
  }

  if (!user || !profile) return <SignIn />;

  if (showAdmin && isAdmin) {
    return (
      <div className="min-h-screen bg-[#060a12]">
        <div className="p-4">
          <button onClick={() => setShowAdmin(false)} className="text-xs text-slate-400 hover:text-slate-200 font-mono mb-4">
            {'\u2190'} Back to Dashboard
          </button>
          <AdminPanel />
        </div>
      </div>
    );
  }

  const allTabs = [...BASE_TABS, ...(isAdmin ? ADMIN_TABS : [])];

  const NAV_SECTIONS = [
    { label: 'Operations', items: allTabs.filter(t => ['overview', 'threats', 'scout', 'allies'].includes(t.id)) },
    { label: 'Intelligence', items: allTabs.filter(t => ['intel', 'orders', 'exchange', 'epstein'].includes(t.id)) },
    { label: 'Analysis', items: allTabs.filter(t => ['timeline', 'cms', 'registers', 'hypotheses', 'oracle', 'atlas'].includes(t.id)) },
    { label: 'Tools', items: allTabs.filter(t => ['notebook', 'gateway', 'comms'].includes(t.id)) },
  ].filter(s => s.items.length > 0);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ===== SIDEBAR ===== */}
      <aside className={`fixed md:relative z-50 h-full bg-[#0a0f1a] border-r border-[#1e2d44] flex flex-col transition-all duration-200 ${sidebarOpen ? 'w-56' : 'w-0 md:w-14 overflow-hidden'}`}>
        {/* Logo + Toggle */}
        <div className="flex items-center gap-2.5 px-3 py-4 border-b border-[#1e2d44]">
          <img src="/images/brand/vigil-logo.png" alt="VIGIL" className="w-8 h-8 shrink-0 object-contain cursor-pointer" onClick={() => setSidebarOpen(!sidebarOpen)} />
          {sidebarOpen && (
            <div className="min-w-0">
              <h1 className="text-sm font-bold tracking-[.2em] text-cyan-400" style={{ fontFamily: "'JetBrains Mono', monospace" }}>VIGIL</h1>
              <div className="text-[10px] text-slate-500 truncate">Mission Control</div>
            </div>
          )}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="ml-auto text-slate-500 hover:text-slate-300 text-sm shrink-0">
            {sidebarOpen ? '\u2190' : '\u2192'}
          </button>
        </div>

        {/* Operation Selector */}
        {sidebarOpen && (
          <div className="px-2 py-3 border-b border-[#1e2d44]">
            <OperationSelector current={currentOp} operations={ops} onSelect={setCurrentOp} onAddOperation={handleAddOperation} />
          </div>
        )}

        {/* Status indicators */}
        <div className={`px-3 py-2 border-b border-[#1e2d44] ${sidebarOpen ? '' : 'flex flex-col items-center gap-1'}`}>
          <div className="flex items-center gap-1.5">
            <Dot color={opsec === 'GREEN' ? '#10b981' : '#f97316'} pulse />
            {sidebarOpen && <span className="font-mono text-[11px] font-medium" style={{ color: opsec === 'GREEN' ? '#10b981' : '#f97316' }}>OPSEC {opsec}</span>}
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <Dot color={threat === 'ORANGE' || threat === 'ELEVATED' ? '#f97316' : threat === 'RED' || threat === 'CRITICAL' ? '#ef4444' : '#f59e0b'} />
            {sidebarOpen && <span className="font-mono text-[11px] font-medium" style={{ color: threat === 'ORANGE' || threat === 'ELEVATED' ? '#f97316' : '#f59e0b' }}>THREAT {threat}</span>}
          </div>
          {sidebarOpen && liveMission && (
            <div className="mt-1.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[9px] text-green-500 font-mono">LIVE — VPS API</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2">
          {NAV_SECTIONS.map(section => (
            <div key={section.label} className="mb-1">
              {sidebarOpen && <div className="px-3 py-1.5 text-[9px] font-bold text-slate-600 uppercase tracking-[.15em]">{section.label}</div>}
              {section.items.map(t => (
                <button
                  key={t.id}
                  onClick={() => { setTab(t.id); if (window.innerWidth < 768) setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-all ${
                    tab === t.id
                      ? 'bg-cyan-500/10 text-cyan-400 border-l-2 border-cyan-400'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/[.03] border-l-2 border-transparent'
                  }`}
                >
                  <span className={`text-[13px] font-medium truncate ${sidebarOpen ? '' : 'hidden'}`}>{t.label}</span>
                  {!sidebarOpen && <span className="text-[10px] font-mono mx-auto">{t.label.slice(0, 2).toUpperCase()}</span>}
                </button>
              ))}
            </div>
          ))}
        </nav>

        {/* User + Logout */}
        <div className="border-t border-[#1e2d44] px-3 py-3">
          {sidebarOpen ? (
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-300 font-medium">{profile.displayName}</div>
                <div className="font-mono text-[10px] text-slate-500">{profile.role.toUpperCase()} {'\u2022'} DAY {dayNum}</div>
              </div>
              <div className="flex flex-col gap-1">
                {isAdmin && <button onClick={() => setShowAdmin(true)} className="text-[10px] text-blue-400 hover:text-blue-300 font-mono">ADMIN</button>}
                <button onClick={logout} className="text-[10px] text-slate-500 hover:text-red-400 font-mono">LOGOUT</button>
              </div>
            </div>
          ) : (
            <button onClick={logout} className="w-full text-center text-[10px] text-slate-500 hover:text-red-400 font-mono">OUT</button>
          )}
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* ===== MAIN CONTENT ===== */}
      <main className="flex-1 overflow-y-auto">
        {/* Mobile top bar */}
        <div className="md:hidden sticky top-0 z-30 bg-[#060a12]/95 backdrop-blur-xl border-b border-[#2a3550] px-4 py-2.5 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)} className="text-slate-400 hover:text-slate-200 text-lg">{'\u2630'}</button>
          <span className="font-mono text-xs text-cyan-400 font-bold tracking-wider">
            {allTabs.find(t => t.id === tab)?.label?.toUpperCase() || 'VIGIL'}
          </span>
          <div className="flex items-center gap-1.5">
            <Dot color="#10b981" pulse />
            <Dot color="#f97316" />
          </div>
        </div>

        <div className="p-4 md:p-6 md:px-8 relative z-10">
          <ErrorBoundary>
          {tab === 'registers' && <RegistersTab />}
          {tab === 'hypotheses' && <HypothesesTab />}
          {tab === 'oracle' && <OracleTab />}
          {tab === 'atlas' && <ConflictMapTab />}
          {isAdmin && tab === 'gateway' && <GatewayTab />}
          {isAdmin && tab === 'comms' && <AgentCommsTab />}
          {tab !== 'oracle' && tab !== 'atlas' && tab !== 'gateway' && tab !== 'comms' && (
            isLumen ? (
              <>
                {tab === 'overview' && <OverviewTab />}
                {tab === 'threats' && <ThreatsTab />}
                {tab === 'scout' && <ScoutTab />}
                {tab === 'allies' && <AlliesTab />}
                {tab === 'intel' && <IntelReportsTab />}
                {tab === 'orders' && <OrdersTab />}
                {tab === 'exchange' && <IntelExchangeTab />}
                {tab === 'epstein' && <EpsteinIntelTab />}
                {tab === 'timeline' && <TimelineTab />}
                {tab === 'cms' && <CounterMeasuresTab />}
                {tab === 'notebook' && <NotebookTab />}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-16 h-16 rounded-2xl bg-[#111827] border border-[#2a3550] flex items-center justify-center mb-4">
                  <span className="text-2xl opacity-40">&#x1F4C1;</span>
                </div>
                <h3 className="text-lg font-bold tracking-wider text-slate-400 mb-2" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {currentOp.codename}
                </h3>
                <p className="text-sm text-slate-600 max-w-md">{currentOp.description}</p>
                <div className="mt-4 px-4 py-2 rounded-lg bg-[#111827] border border-[#2a3550]">
                  <span className="text-xs text-slate-500 font-mono">
                    {currentOp.status === 'standby'
                      ? 'Operation registered. No active missions.'
                      : `${currentOp.missions.length} mission(s) registered. Dashboard data pending.`}
                  </span>
                </div>
              </div>
            )
          )}
          </ErrorBoundary>
        </div>

        <div className="text-center py-8">
          <img src="/images/brand/vigil-logo.png" alt="VIGIL" className="w-8 h-8 mx-auto mb-3 opacity-20 object-contain" />
          <p className="text-xs text-slate-600 tracking-widest font-medium" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            VIGIL {'\u2022'} KEEPING WATCH THROUGH THE DARKNESS {'\u2022'} EST. 2026
          </p>
        </div>
      </main>
    </div>
  );
}

export default function MissionControlPage() {
  return (
    <AuthProvider>
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: #0a0e17; }
        ::-webkit-scrollbar-thumb { background: #2a3550; border-radius: 3px; }
        .grid-bg {
          background-image: linear-gradient(rgba(59,130,246,.02) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(59,130,246,.02) 1px, transparent 1px);
          background-size: 40px 40px;
          position: relative;
        }
        .grid-bg::before {
          content: '';
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 500px;
          height: 500px;
          background: url('/images/brand/vigil-logo.png') center/contain no-repeat;
          opacity: 0.015;
          pointer-events: none;
          z-index: 0;
        }
      `}</style>
      <div className="grid-bg">
        <Dashboard />
      </div>
    </AuthProvider>
  );
}
