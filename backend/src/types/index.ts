// ─── Billing ────────────────────────────────────────────────────────────────

export interface BillingRecord {
  id: string;
  date: string;            // ISO date string YYYY-MM-DD
  provider: CloudProvider;
  service: string;
  amount: number;          // USD
  currency: string;
  status: BillingStatus;
}

export type CloudProvider = 'AWS' | 'Azure' | 'GCP';
export type BillingStatus = 'processed' | 'pending' | 'estimated';

// ─── Anomalies ──────────────────────────────────────────────────────────────

export interface Anomaly {
  id: string;
  date: string;
  provider: CloudProvider;
  service: string;
  detectedAmount: number;
  expectedBaseline: number;
  absoluteDifference: number;
  percentageDifference: number;
  severity: AlertSeverity;
  explanation: string;
  detectedAt: string;     // ISO datetime
}

export type AlertSeverity = 'low' | 'medium' | 'high';

// ─── Dashboard ──────────────────────────────────────────────────────────────

export interface DashboardKPIs {
  totalSpend: number;
  currentPeriodSpend: number;
  budgetTotal: number;
  budgetUsedPercent: number;
  anomalyCount: number;
  activeAlerts: number;
  potentialSavings: number;
}

export interface DailySpending {
  date: string;
  amount: number;
  baseline: number;
}

export interface ServiceBreakdown {
  service: string;
  provider: CloudProvider;
  amount: number;
  percentage: number;
}

export interface DashboardResponse {
  kpis: DashboardKPIs;
  dailySpending: DailySpending[];
  serviceBreakdown: ServiceBreakdown[];
}

// ─── Resources ──────────────────────────────────────────────────────────────

export type ResourceStatus = 'active' | 'idle' | 'unattached';

export interface CloudResource {
  id: string;
  provider: CloudProvider;
  service: string;
  resourceType: string;
  resourceId: string;
  region: string;
  status: ResourceStatus;
  monthlyCost: number;
  utilizationPercent: number | null;
  potentialSavings: number;
  recommendation: string;
  lastActive: string;     // ISO datetime
  simulated: true;        // always true — this is mock data
}

// ─── Alerts ─────────────────────────────────────────────────────────────────

export type AlertType = 'anomaly' | 'budget_threshold' | 'idle_resource' | 'test';
export type DeliveryStatus = 'simulated' | 'pending' | 'delivered' | 'failed';

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  source: string;
  timestamp: string;      // ISO datetime
  deliveryStatus: DeliveryStatus;
  deliveryChannel: string; // e.g. "in-app (simulated)"
  anomalyId?: string;
  acknowledged: boolean;
}

// ─── Query Filters ──────────────────────────────────────────────────────────

export interface BillingFilters {
  startDate?: string;
  endDate?: string;
  provider?: CloudProvider;
  service?: string;
  status?: BillingStatus;
  page?: number;
  limit?: number;
}

export interface AnomalyFilters {
  startDate?: string;
  endDate?: string;
  provider?: CloudProvider;
  service?: string;
  severity?: AlertSeverity;
}

// ─── API Responses ──────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
  details?: unknown;
}

export interface HealthResponse {
  status: 'healthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  dataMode: string;
}

export interface ReadyResponse {
  ready: boolean;
  checks: Record<string, { status: 'ok' | 'unavailable'; message: string }>;
}

// ─── Detection ──────────────────────────────────────────────────────────────

export interface DetectionResult {
  anomaliesDetected: number;
  newAnomalies: Anomaly[];
  alertsCreated: number;
  message: string;
  timestamp: string;
}
