/**
 * Deterministic mock data for CostWatch.
 *
 * All numbers are fixed — no Math.random().
 * Contains 30 days of billing, 3 distinct anomalies, and normal spending.
 */

import type {
  BillingRecord,
  CloudResource,
  DailySpending,
  CloudProvider,
} from '../types';

// ─── Helpers ────────────────────────────────────────────────────────────────

function dateStr(daysAgo: number): string {
  const d = new Date('2026-10-24T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

let _billId = 0;
function billId(): string {
  return `bill-${String(++_billId).padStart(4, '0')}`;
}

// ─── Daily Cost Patterns (last 30 days) ─────────────────────────────────────

interface DayPattern {
  daysAgo: number;
  aws: number;
  azure: number;
  gcp: number;
}

/**
 * Baseline daily AWS ~$420, Azure ~$280, GCP ~$180  → Total ~$880/day
 * Anomaly 1 — Day 3: AWS spike to $1,450  (EC2 burst)
 * Anomaly 2 — Day 10: Azure spike to $820  (Blob Storage)
 * Anomaly 3 — Day 18: GCP spike to $640   (BigQuery)
 */
const dailyPatterns: DayPattern[] = [];

const baselines: Record<string, { aws: number; azure: number; gcp: number }> = {};

for (let d = 29; d >= 0; d--) {
  let aws = 400 + (d % 5) * 8;    // 400–432 range
  let azure = 260 + (d % 4) * 10; // 260–290
  let gcp = 165 + (d % 3) * 12;   // 165–189

  // Anomaly 1 — day 3 ago: AWS EC2 spike
  if (d === 3) aws = 1450;
  // Anomaly 2 — day 10 ago: Azure Blob spike
  if (d === 10) azure = 820;
  // Anomaly 3 — day 18 ago: GCP BigQuery spike
  if (d === 18) gcp = 640;

  dailyPatterns.push({ daysAgo: d, aws, azure, gcp });
  baselines[dateStr(d)] = { aws, azure, gcp };
}

// ─── Service-level splits (deterministic fractions) ─────────────────────────

interface ServiceSplit {
  provider: CloudProvider;
  service: string;
  fraction: number; // of provider daily total
}

const serviceSplits: ServiceSplit[] = [
  // AWS
  { provider: 'AWS', service: 'EC2', fraction: 0.40 },
  { provider: 'AWS', service: 'S3', fraction: 0.18 },
  { provider: 'AWS', service: 'RDS', fraction: 0.22 },
  { provider: 'AWS', service: 'Lambda', fraction: 0.12 },
  { provider: 'AWS', service: 'CloudFront', fraction: 0.08 },
  // Azure
  { provider: 'Azure', service: 'Virtual Machines', fraction: 0.35 },
  { provider: 'Azure', service: 'Blob Storage', fraction: 0.25 },
  { provider: 'Azure', service: 'SQL Database', fraction: 0.22 },
  { provider: 'Azure', service: 'Functions', fraction: 0.18 },
  // GCP
  { provider: 'GCP', service: 'Compute Engine', fraction: 0.32 },
  { provider: 'GCP', service: 'Cloud Storage', fraction: 0.20 },
  { provider: 'GCP', service: 'BigQuery', fraction: 0.28 },
  { provider: 'GCP', service: 'Cloud Functions', fraction: 0.20 },
];

// ─── Generate Billing Records ───────────────────────────────────────────────

export function generateBillingRecords(): BillingRecord[] {
  const records: BillingRecord[] = [];

  for (const day of dailyPatterns) {
    const date = dateStr(day.daysAgo);
    const providerTotals: Record<CloudProvider, number> = {
      AWS: day.aws,
      Azure: day.azure,
      GCP: day.gcp,
    };

    for (const split of serviceSplits) {
      const amount = Math.round(providerTotals[split.provider] * split.fraction * 100) / 100;
      if (amount <= 0) continue;

      records.push({
        id: billId(),
        date,
        provider: split.provider,
        service: split.service,
        amount,
        currency: 'USD',
        status: day.daysAgo <= 1 ? 'estimated' : 'processed',
      });
    }
  }

  return records;
}

// ─── Generate Daily Spending (for charts) ───────────────────────────────────

export function generateDailySpending(): DailySpending[] {
  // Baseline = average of non-anomaly days (we hard-code because data is deterministic)
  // Normal AWS ~416, Azure ~275, GCP ~177 → total ~868
  const normalBaseline = 868;

  return dailyPatterns.map((day) => ({
    date: dateStr(day.daysAgo),
    amount: Math.round((day.aws + day.azure + day.gcp) * 100) / 100,
    baseline: normalBaseline,
  }));
}

// ─── Compute Baselines for Anomaly Detection ────────────────────────────────

export interface HistoricalPoint {
  date: string;
  provider: CloudProvider;
  service: string;
  amount: number;
}

export function generateHistoricalData(): HistoricalPoint[] {
  const points: HistoricalPoint[] = [];

  for (const day of dailyPatterns) {
    const date = dateStr(day.daysAgo);
    const totals: Record<CloudProvider, number> = {
      AWS: day.aws,
      Azure: day.azure,
      GCP: day.gcp,
    };

    for (const split of serviceSplits) {
      points.push({
        date,
        provider: split.provider,
        service: split.service,
        amount: Math.round(totals[split.provider] * split.fraction * 100) / 100,
      });
    }
  }

  return points;
}

// ─── Cloud Resources (Simulated) ────────────────────────────────────────────

export function generateCloudResources(): CloudResource[] {
  return [
    {
      id: 'res-001',
      provider: 'AWS',
      service: 'EC2',
      resourceType: 'Instance',
      resourceId: 'i-0a1b2c3d4e5f6a7b8',
      region: 'us-east-1',
      status: 'idle',
      monthlyCost: 156.80,
      utilizationPercent: 2,
      potentialSavings: 141.12,
      recommendation: 'Instance has <5% CPU utilization for 14+ days. Consider stopping or downsizing. (Simulated)',
      lastActive: '2026-10-10T08:30:00Z',
      simulated: true,
    },
    {
      id: 'res-002',
      provider: 'AWS',
      service: 'EBS',
      resourceType: 'Volume',
      resourceId: 'vol-0b2c3d4e5f6a7b8c9',
      region: 'us-east-1',
      status: 'unattached',
      monthlyCost: 45.00,
      utilizationPercent: null,
      potentialSavings: 45.00,
      recommendation: 'EBS volume is unattached. Consider deleting or snapshotting. (Simulated)',
      lastActive: '2026-09-28T14:00:00Z',
      simulated: true,
    },
    {
      id: 'res-003',
      provider: 'Azure',
      service: 'Virtual Machines',
      resourceType: 'VM',
      resourceId: 'vm-costwatch-staging-01',
      region: 'eastus',
      status: 'idle',
      monthlyCost: 210.40,
      utilizationPercent: 1,
      potentialSavings: 189.36,
      recommendation: 'VM has <5% utilization. Consider deallocating or resizing to B-series. (Simulated)',
      lastActive: '2026-10-08T22:15:00Z',
      simulated: true,
    },
    {
      id: 'res-004',
      provider: 'Azure',
      service: 'Managed Disks',
      resourceType: 'Disk',
      resourceId: 'disk-orphan-backup-02',
      region: 'eastus',
      status: 'unattached',
      monthlyCost: 32.00,
      utilizationPercent: null,
      potentialSavings: 32.00,
      recommendation: 'Managed disk is not attached to any VM. Consider deletion. (Simulated)',
      lastActive: '2026-09-15T10:00:00Z',
      simulated: true,
    },
    {
      id: 'res-005',
      provider: 'GCP',
      service: 'Compute Engine',
      resourceType: 'Instance',
      resourceId: 'gce-prod-worker-03',
      region: 'us-central1',
      status: 'active',
      monthlyCost: 320.00,
      utilizationPercent: 72,
      potentialSavings: 0,
      recommendation: 'Resource is normally utilized. No action needed.',
      lastActive: '2026-10-24T10:00:00Z',
      simulated: true,
    },
    {
      id: 'res-006',
      provider: 'GCP',
      service: 'Persistent Disk',
      resourceType: 'Disk',
      resourceId: 'pd-snapshot-archive',
      region: 'us-central1',
      status: 'unattached',
      monthlyCost: 18.50,
      utilizationPercent: null,
      potentialSavings: 18.50,
      recommendation: 'Persistent disk is detached. Consider deleting if no longer needed. (Simulated)',
      lastActive: '2026-09-20T06:45:00Z',
      simulated: true,
    },
    {
      id: 'res-007',
      provider: 'AWS',
      service: 'EC2',
      resourceType: 'Instance',
      resourceId: 'i-9f8e7d6c5b4a3210f',
      region: 'us-west-2',
      status: 'active',
      monthlyCost: 480.00,
      utilizationPercent: 65,
      potentialSavings: 0,
      recommendation: 'Resource is normally utilized. No action needed.',
      lastActive: '2026-10-24T12:00:00Z',
      simulated: true,
    },
    {
      id: 'res-008',
      provider: 'AWS',
      service: 'RDS',
      resourceType: 'Database',
      resourceId: 'db-costwatch-prod',
      region: 'us-east-1',
      status: 'active',
      monthlyCost: 290.00,
      utilizationPercent: 45,
      potentialSavings: 0,
      recommendation: 'Resource is normally utilized. No action needed.',
      lastActive: '2026-10-24T11:30:00Z',
      simulated: true,
    },
  ];
}

export const BUDGET_TOTAL = 30000; // monthly budget in USD
