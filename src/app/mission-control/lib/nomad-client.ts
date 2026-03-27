// NOMAD-VIGIL API Client for Mission Control
// Connects to the NOMAD endpoints on vigil-api (ops.jr8ch.com)

const VPS_BASE = process.env.NEXT_PUBLIC_VPS_ENDPOINT || 'https://ops.jr8ch.com';
const API_KEY = process.env.NEXT_PUBLIC_VIGIL_API_KEY || '';

// ===================== TYPES =====================

export interface NomadStatus {
  status: 'healthy' | 'error';
  timestamp: string;
  qdrant: {
    collections: number;
    vigil_intel_docs: number;
    storage_gb: string;
  };
  error?: string;
}

export interface SearchResult {
  id: string;
  source: string;
  timestamp: string;
  title: string;
  content: string;
  score: number;
  confidence: number;
  category: string;
  tags: string[];
}

export interface SearchResponse {
  query: string;
  count: number;
  results: SearchResult[];
  timestamp: string;
}

export interface CollectionInfo {
  name: string;
  vectors_count: number;
  points_count: number;
  status: string;
}

export interface CollectionsResponse {
  collections: CollectionInfo[];
  timestamp: string;
}

// ===================== HELPERS =====================

async function nomadFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${VPS_BASE}${path}`;
  const headers: Record<string, string> = {
    'x-api-key': API_KEY,
    'Content-Type': 'application/json',
  };

  const res = await fetch(url, {
    ...options,
    headers: { ...headers, ...options?.headers },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `NOMAD API error: ${res.status}`);
  }

  return res.json();
}

// ===================== API METHODS =====================

/**
 * Get NOMAD/Qdrant health status
 */
export async function getNomadStatus(): Promise<NomadStatus> {
  return nomadFetch<NomadStatus>('/api/nomad/status');
}

/**
 * Semantic search across all ingested intel
 */
export async function searchIntel(
  query: string,
  limit: number = 10,
  threshold: number = 0.3
): Promise<SearchResponse> {
  const params = new URLSearchParams({
    q: query,
    limit: String(limit),
    threshold: String(threshold),
  });
  return nomadFetch<SearchResponse>(`/api/nomad/search?${params}`);
}

/**
 * List all Qdrant collections
 */
export async function getCollections(): Promise<CollectionsResponse> {
  return nomadFetch<CollectionsResponse>('/api/nomad/collections');
}

/**
 * Trigger manual ingestion of a dead-drop file
 */
export async function triggerIngest(filepath: string): Promise<{ success: boolean; pointsAdded: number }> {
  return nomadFetch('/api/nomad/ingest', {
    method: 'POST',
    body: JSON.stringify({ filepath }),
  });
}
