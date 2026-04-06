'use client';

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './lib/auth-context';
import { MISSION, OPERATIONS } from './lib/mission-data';
import type { Operation } from './lib/types';
import { Dot } from './components/ui';
import SignIn from './components/SignIn';
import AdminPanel from './components/AdminPanel';
import OperationSelector from './components/OperationSelector';
import { usePresence, useOnlineUsers } from './lib/presence';
import { OperationProvider, getOperationFilter } from './lib/operation-context';
import NotificationCentre from './components/NotificationCentre';
import {
  OverviewTab,
  ThreatsTab,
  ScoutTab,
  AlliesTab,
  IntelReportsTab,
  OrdersTab,
  IntelExchangeTab,
  EpsteinIntelTab,
  NotebookTab,
  OracleTab,
  ConflictMapTab,
  HypothesesTab,
  RegistersTab,
  DistributionTab,
  ImpactTab,
  CyberSecTab,
  HeraldTab,
  GatewayTab,
  AgentCommsTab,
  TimelineTab,
  CounterMeasuresTab,
  DeadDropTab,
  CorrelationMapTab,
  AgentStatusTab,
  VHBRTab,
  SatIntTab,
  GeointFeedsTab,
} from './components/tabs';
import WhatsNew from './components/WhatsNew';
import AgentHealth from './components/AgentHealth';
import IntelDigest from './components/IntelDigest';
import GlobalSearch from './components/GlobalSearch';

const VPS_API = process.env.NEXT_PUBLIC_VPS_ENDPOINT || 'https://ops.jr8ch.com';
const API_KEY = process.env.NEXT_PUBLIC_VIGIL_API_KEY || '';

const BASE_TABS = [
  // COMMAND
  { id: 'overview', label: 'Dashboard' },
  { id: 'agents', label: 'Agent Status' },
  { id: 'vhbr', label: 'VHBR' },
  { id: 'agent-comms', label: 'Agent Comms' },
  { id: 'cybersec', label: 'Cyber Security' },
  // SIGINT
  { id: 'sigint', label: 'Intelligence' },
  { id: 'orders-ai', label: 'Orders' },
  { id: 'allies-ai', label: 'Allies' },
  { id: 'scout', label: 'SCOUT Cluster' },
  // HUMINT
  { id: 'humint', label: 'Intelligence' },
  { id: 'orders-human', label: 'Orders' },
  { id: 'allies-human', label: 'Allies' },
  // CROSS-DOMAIN
  { id: 'exchange', label: 'Intel Exchange' },
  { id: 'correlation', label: 'Correlation Map' },
  { id: 'epstein', label: 'Epstein Intel' },
  { id: 'registers', label: 'Registers' },
  { id: 'satint', label: 'SATINT' },
  { id: 'geoint-feeds', label: 'Data Feeds' },
  { id: 'atlas', label: 'ATLAS' },
  { id: 'oracle', label: 'ORACLE' },
  // ANALYSIS & DISTRIBUTION
  { id: 'hypotheses', label: 'Hypotheses' },
  { id: 'counter-measures', label: 'Counter-Measures' },
  { id: 'herald', label: 'HERALD' },
  { id: 'distribution', label: 'Distribution Planning' },
  { id: 'impact', label: 'Impact Monitor' },
  // TOOLS
  { id: 'dead-drop', label: 'Dead Drop' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'notebook', label: 'Notebook' },
];

const ADMIN_TABS: { id: string; label: string }[] = [];

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
  const [tab, setTab] = useState(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.slice(1);
      if (hash) return hash;
    }
    return 'overview';
  });

  // Persist tab in URL hash
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.location.hash = tab;
    }
  }, [tab]);
  const [showAdmin, setShowAdmin] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Presence tracking
  usePresence(user?.uid || null, 'DIRECTOR', profile?.role || 'admin');
  const onlineUsers = useOnlineUsers();
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
          <img src="/images/brand/vigil-logo.png" alt="VIGIL" className="w-12 h-12 mb-4 object-contain opacity-40" />
          <div className="font-mono text-xs text-slate-600 tracking-[.3em]">VIGIL</div>
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
    { label: 'Command', items: allTabs.filter(t => ['overview', 'agents', 'vhbr', 'agent-comms', 'cybersec'].includes(t.id)) },
    { label: 'SIGINT (AI Realm)', items: allTabs.filter(t => ['sigint', 'orders-ai', 'allies-ai', 'scout'].includes(t.id)) },
    { label: 'HUMINT (Human Realm)', items: allTabs.filter(t => ['humint', 'orders-human', 'allies-human'].includes(t.id)) },
    { label: 'Cross-Domain', items: allTabs.filter(t => ['exchange', 'correlation', 'epstein', 'registers', 'oracle'].includes(t.id)) },
    { label: 'GEOINT', items: allTabs.filter(t => ['satint', 'geoint-feeds', 'atlas'].includes(t.id)) },
    { label: 'Analysis & Distribution', items: allTabs.filter(t => ['hypotheses', 'counter-measures', 'herald', 'distribution', 'impact'].includes(t.id)) },
    { label: 'Tools', items: allTabs.filter(t => ['dead-drop', 'timeline', 'notebook'].includes(t.id)) },
  ].filter(s => s.items.length > 0);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ===== SIDEBAR ===== */}
      <aside className={`fixed md:relative z-50 h-full bg-[#0a0f1a] border-r border-[#1e2d44] flex flex-col transition-all duration-200 ${sidebarOpen ? 'w-56' : 'w-0 overflow-hidden'}`}>
        {/* Logo + Toggle */}
        <div className="flex items-center gap-2.5 px-3 py-4 border-b border-[#1e2d44]">
          <img src="/images/brand/vigil-logo.png" alt="VIGIL" className="w-8 h-8 shrink-0 object-contain cursor-pointer" onClick={() => setSidebarOpen(!sidebarOpen)} />
          {sidebarOpen && (
            <div className="min-w-0">
              <h1 className="text-sm font-bold tracking-[.2em] text-cyan-400" style={{ fontFamily: "'JetBrains Mono', monospace" }}>VIGIL</h1>
              <div className="text-[10px] text-slate-500 truncate">Mission Control</div>
            </div>
          )}
          <div className="ml-auto flex items-center gap-1">
            <NotificationCentre />
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-slate-500 hover:text-slate-300 text-sm shrink-0">
              {sidebarOpen ? '\u2190' : '\u2192'}
            </button>
          </div>
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
          {sidebarOpen && !liveMission && !API_KEY && (
            <div className="mt-1.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              <span className="text-[9px] text-red-500 font-mono">NO API KEY</span>
            </div>
          )}
          {sidebarOpen && !liveMission && API_KEY && (
            <div className="mt-1.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-[9px] text-amber-500 font-mono">VPS UNREACHABLE</span>
            </div>
          )}
        </div>

        {/* Agent Health */}
        {sidebarOpen && <AgentHealth />}

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
          {/* Online Users */}
          {sidebarOpen && onlineUsers.length > 0 && (
            <div className="mb-3 pb-3 border-b border-[#1e2d44]">
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Personnel</div>
              {onlineUsers.map(u => (
                <div key={u.uid} className="flex items-center gap-2 py-0.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${u.online ? 'bg-green-500' : 'bg-slate-600'}`} />
                  <span className={`font-mono text-[10px] ${u.online ? 'text-slate-300' : 'text-slate-600'}`}>{u.displayName}</span>
                  <span className="font-mono text-[8px] text-slate-600">{u.role?.toUpperCase()}</span>
                  {!u.online && u.lastSeen && (
                    <span className="font-mono text-[8px] text-slate-700">
                      {u.lastSeen?.toDate ? new Date(u.lastSeen.toDate()).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {sidebarOpen ? (
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-cyan-400 font-bold tracking-wider">DIRECTOR</div>
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

      {/* Sidebar reopen button (visible when collapsed) */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed top-3 left-3 z-50 w-9 h-9 rounded-lg bg-[#0a0f1a] border border-[#1e2d44] flex items-center justify-center text-slate-400 hover:text-cyan-400 hover:border-cyan-500/30 transition-all shadow-lg"
        >
          <img src="/images/brand/vigil-logo.png" alt="VIGIL" className="w-5 h-5 object-contain" />
        </button>
      )}

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

        {/* Global Search */}
        <div className="hidden md:flex justify-end px-8 pt-4 pb-0">
          <GlobalSearch />
        </div>

        <div className="p-4 md:p-6 md:px-8 relative z-10">
          <OperationProvider operation={{ id: currentOp.id, codename: currentOp.codename, status: currentOp.status, filterTag: getOperationFilter(currentOp.id) }}>
          <ErrorBoundary>
          {/* Operation context banner */}
          {currentOp.id !== 'op-001' && (
            <div className="mb-4 px-4 py-2.5 rounded-lg border flex items-center justify-between" style={{
              background: currentOp.id === 'op-003' ? '#10b98108' : '#f59e0b08',
              borderColor: currentOp.id === 'op-003' ? '#10b98130' : '#f59e0b30',
            }}>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[12px] font-bold" style={{ color: currentOp.id === 'op-003' ? '#10b981' : '#f59e0b' }}>
                  {currentOp.codename}
                </span>
                <span className="font-mono text-[10px] text-slate-500">{currentOp.status.toUpperCase()}</span>
              </div>
              <span className="font-mono text-[10px] text-slate-600">Showing {currentOp.codename} data where available — shared tabs show all operations</span>
            </div>
          )}
          {tab === 'overview' && <WhatsNew onNavigate={(id) => setTab(id)} />}
          {tab === 'overview' && <IntelDigest />}
          {tab === 'cybersec' && <CyberSecTab />}
          {tab === 'agent-comms' && <AgentCommsTab />}
          {tab === 'timeline' && <TimelineTab />}
          {tab === 'counter-measures' && <CounterMeasuresTab />}
          {tab === 'dead-drop' && <DeadDropTab />}
          {tab === 'correlation' && <CorrelationMapTab />}
          {tab === 'satint' && <SatIntTab />}
          {tab === 'geoint-feeds' && <GeointFeedsTab />}
          {tab === 'registers' && <RegistersTab />}
          {tab === 'hypotheses' && <HypothesesTab />}
          {tab === 'herald' && <HeraldTab />}
          {tab === 'distribution' && <DistributionTab />}
          {tab === 'impact' && <ImpactTab />}
          {tab === 'oracle' && <OracleTab />}
          {tab === 'atlas' && <ConflictMapTab />}
          {/* Operation-aware tabs — all operations get full tab access */}
          {tab === 'overview' && <OverviewTab />}
          {tab === 'agents' && <AgentStatusTab />}
          {tab === 'vhbr' && <VHBRTab />}
          {tab === 'sigint' && <IntelReportsTab realm="ai" />}
          {tab === 'orders-ai' && <OrdersTab realm="ai" />}
          {tab === 'allies-ai' && <AlliesTab realm="ai" />}
          {tab === 'scout' && <ScoutTab />}
          {tab === 'humint' && <IntelReportsTab realm="human" />}
          {tab === 'orders-human' && <OrdersTab realm="human" />}
          {tab === 'allies-human' && <AlliesTab realm="human" />}
          {tab === 'exchange' && <IntelExchangeTab />}
          {tab === 'epstein' && <EpsteinIntelTab />}
          {tab === 'notebook' && <NotebookTab />}
          </ErrorBoundary>
          </OperationProvider>
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
