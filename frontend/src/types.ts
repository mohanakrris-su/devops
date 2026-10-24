// ─── Shared types between frontend and backend ─────────────────────────────

export type CloudProvider = 'AWS' | 'Azure' | 'GCP';
export type BillingStatus = 'processed' | 'pending' | 'estimated';
export type AlertSeverity = 'low' | 'medium' | 'high';
export type ResourceStatus = 'active' | 'idle' | 'unattached';
export type AlertType = 'anomaly' | 'budget_threshold' | 'idle_resource' | 'test';
export type DeliveryStatus = 'simulated' | 'pending' | 'delivered' | 'failed';

export interface BillingRecord {
  id: string;
  date: string;
  provider: CloudProvider;
  service: string;
  amount: number;
  currency: string;
  status: BillingStatus;
}

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
  detectedAt: string;
}

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
  lastActive: string;
  simulated: true;
}

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  source: string;
  timestamp: string;
  deliveryStatus: DeliveryStatus;
  deliveryChannel: string;
  anomalyId?: string;
  acknowledged: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DetectionResult {
  anomaliesDetected: number;
  newAnomalies: Anomaly[];
  alertsCreated: number;
  message: string;
  timestamp: string;
}

export interface ResourcesResponse {
  data: CloudResource[];
  total: number;
  summary: {
    idle: number;
    unattached: number;
    active: number;
    potentialMonthlySavings: number;
    note: string;
  };
}

export type Page = 'dashboard' | 'billing' | 'anomalies' | 'resources' | 'alerts';
