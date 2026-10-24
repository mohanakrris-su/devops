import type {
  DashboardResponse,
  PaginatedResponse,
  BillingRecord,
  Anomaly,
  DetectionResult,
  ResourcesResponse,
  Alert,
} from './types';

const BASE = '/api';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `API error: ${res.status}`);
  }

  return res.json();
}

// ─── Dashboard ──────────────────────────────────────────────────────────────

export function fetchDashboard(): Promise<DashboardResponse> {
  return fetchJson(`${BASE}/dashboard`);
}

// ─── Billing ────────────────────────────────────────────────────────────────

export function fetchBilling(params?: Record<string, string>): Promise<PaginatedResponse<BillingRecord>> {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return fetchJson(`${BASE}/billing${qs}`);
}

// ─── Anomalies ──────────────────────────────────────────────────────────────

export function fetchAnomalies(params?: Record<string, string>): Promise<{ data: Anomaly[]; total: number }> {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  return fetchJson(`${BASE}/anomalies${qs}`);
}

export function runDetection(): Promise<DetectionResult> {
  return fetchJson(`${BASE}/anomalies/detect`, { method: 'POST' });
}

// ─── Resources ──────────────────────────────────────────────────────────────

export function fetchResources(): Promise<ResourcesResponse> {
  return fetchJson(`${BASE}/resources`);
}

// ─── Alerts ─────────────────────────────────────────────────────────────────

export function fetchAlerts(): Promise<{ data: Alert[]; total: number }> {
  return fetchJson(`${BASE}/alerts`);
}

export function sendTestAlert(severity: string, message?: string): Promise<{ alert: Alert; note: string }> {
  return fetchJson(`${BASE}/alerts/test`, {
    method: 'POST',
    body: JSON.stringify({ severity, message }),
  });
}
