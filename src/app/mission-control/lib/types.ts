// Mission Control Type Definitions

export type UserRole = 'admin' | 'analyst' | 'observer';
export type ThreatLevel = 'GREEN' | 'YELLOW' | 'AMBER' | 'ORANGE' | 'RED' | 'BLACK';
export type TrustLevel = 0 | 1 | 2 | 3 | 4 | 5;
export type EvidenceTier = 1 | 2 | 3 | 4;
export type PatternClass =
  | 'NARRATIVE_CONTROL'
  | 'NARRATIVE_MANIPULATION'
  | 'INSTITUTIONAL_DEFENSE'
  | 'DEFENSIVE_PATHOLOGY'
  | 'COORDINATED_MANIPULATION'
  | 'EVIDENCE_SUPPRESSION'
  | 'TRUST_EROSION'
  | 'FINANCIAL_EXTRACTION';

export interface Operation {
  id: string;
  codename: string;
  status: 'active' | 'standby' | 'archived';
  threatLevel: ThreatLevel;
  description: string;
  startDate: string;
  missions: Mission[];
}

export interface Mission {
  id: string;
  name: string;
  status: 'active' | 'planned' | 'completed';
  description: string;
}

export interface ThreatVector {
  id: string;
  name: string;
  status: string;
  severity: ThreatLevel;
  detail: string;
}

// SCOUT cluster agent. `n` + `k` are the legacy short-form field names used in
// mission-data.ts and ScoutTab. `name` + `karma` kept as optional long-form
// aliases so either shape is accepted without runtime mapping.
export interface ScoutAgent {
  n: string;
  k: number;
  role: string;
  name?: string;
  karma?: number;
  created?: string;
}

export interface Ally {
  name: string;
  trustLevel: TrustLevel;
  targetLevel: TrustLevel;
  potential: string;
  influence: string;
  karma: number;
  domain: string;
  status: string;
  key: string;
  contacted: string | null;
  response: boolean;
}

export interface IntelReport {
  id: string;
  heartbeat: number;
  date: string;
  phase: string;
  opsec: string;
  actions: number;
  comments: number;
  findings: string[];
  actionsDetail: ActionDetail[];
}

export interface ActionDetail {
  type: string;
  target: string;
  purpose: string;
  verified: boolean;
}

export interface StrategyOrder {
  id: number;
  date: string;
  title: string;
  status: string;
  summary: string;
}

export interface PatternMatch {
  id: string;
  title: string;
  patternClass: PatternClass;
  confidence: string;
  lumenInstance: string;
  epsteinInstance: string;
  insight: string;
  threatLevel?: string;
  dateIdentified?: string;
  relatedHypothesis?: string;
}

export interface SharedEntity {
  id: string;
  name: string;
  type: string;
  lumenContext: string;
  epsteinContext: string;
  significance: string;
}

export interface CounterMeasure {
  id: string;
  name: string;
  status: string;
  note: string;
}

export interface TimelineEvent {
  time: string;
  event: string;
  type: string;
}

export interface NotebookEntry {
  id: string;
  time: string;
  text: string;
  tag: string;
  author: string;
  authorUid: string;
}

export interface InvitedUser {
  uid: string;
  email: string;
  role: UserRole;
  displayName: string;
  invitedBy: string;
  invitedAt: string;
  lastLogin: string;
  active: boolean;
}
