/**
 * In-memory mock data store.
 *
 * Acts as the data-access layer when DATA_MODE=mock.
 * All state lives in memory and is re-seeded on restart.
 */

import type {
  BillingRecord,
  Anomaly,
  CloudResource,
  Alert,
  DailySpending,
  BillingFilters,
  AnomalyFilters,
  PaginatedResponse,
} from '../types';
import {
  generateBillingRecords,
  generateDailySpending,
  generateCloudResources,
  BUDGET_TOTAL,
} from './seed';

class MockStore {
  billingRecords: BillingRecord[];
  dailySpending: DailySpending[];
  resources: CloudResource[];
  anomalies: Anomaly[] = [];
  alerts: Alert[] = [];

  constructor() {
    this.billingRecords = generateBillingRecords();
    this.dailySpending = generateDailySpending();
    this.resources = generateCloudResources();
  }

  // ─── Billing ────────────────────────────────────────────────────────

  getBilling(filters: BillingFilters): PaginatedResponse<BillingRecord> {
    let data = [...this.billingRecords];

    if (filters.startDate) {
      data = data.filter((r) => r.date >= filters.startDate!);
    }
    if (filters.endDate) {
      data = data.filter((r) => r.date <= filters.endDate!);
    }
    if (filters.provider) {
      data = data.filter((r) => r.provider === filters.provider);
    }
    if (filters.service) {
      data = data.filter((r) =>
        r.service.toLowerCase().includes(filters.service!.toLowerCase())
      );
    }
    if (filters.status) {
      data = data.filter((r) => r.status === filters.status);
    }

    // Sort newest first
    data.sort((a, b) => b.date.localeCompare(a.date));

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const total = data.length;
    const start = (page - 1) * limit;
    const paged = data.slice(start, start + limit);

    return {
      data: paged,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ─── Anomalies ──────────────────────────────────────────────────────

  getAnomalies(filters: AnomalyFilters): Anomaly[] {
    let data = [...this.anomalies];

    if (filters.startDate) data = data.filter((a) => a.date >= filters.startDate!);
    if (filters.endDate) data = data.filter((a) => a.date <= filters.endDate!);
    if (filters.provider) data = data.filter((a) => a.provider === filters.provider);
    if (filters.service) {
      data = data.filter((a) =>
        a.service.toLowerCase().includes(filters.service!.toLowerCase())
      );
    }
    if (filters.severity) data = data.filter((a) => a.severity === filters.severity);

    return data.sort((a, b) => b.date.localeCompare(a.date));
  }

  addAnomaly(anomaly: Anomaly): void {
    this.anomalies.push(anomaly);
  }

  hasAnomaly(date: string, service: string, provider: string): boolean {
    return this.anomalies.some(
      (a) => a.date === date && a.service === service && a.provider === provider
    );
  }

  // ─── Alerts ─────────────────────────────────────────────────────────

  getAlerts(): Alert[] {
    return [...this.alerts].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  addAlert(alert: Alert): void {
    this.alerts.push(alert);
  }

  hasDuplicateAlert(anomalyId: string, windowHours: number): boolean {
    const cutoff = Date.now() - windowHours * 60 * 60 * 1000;
    return this.alerts.some(
      (a) =>
        a.anomalyId === anomalyId &&
        new Date(a.timestamp).getTime() > cutoff
    );
  }

  // ─── Resources ──────────────────────────────────────────────────────

  getResources(): CloudResource[] {
    return this.resources;
  }

  // ─── Dashboard helpers ─────────────────────────────────────────────

  getTotalSpend(): number {
    return this.billingRecords.reduce((s, r) => s + r.amount, 0);
  }

  getCurrentPeriodSpend(): number {
    // Last 30 days
    return this.getTotalSpend();
  }

  getBudgetTotal(): number {
    return BUDGET_TOTAL;
  }

  getDailySpending(): DailySpending[] {
    return this.dailySpending;
  }

  getServiceBreakdown(): { service: string; provider: string; amount: number }[] {
    const map = new Map<string, { service: string; provider: string; amount: number }>();

    for (const r of this.billingRecords) {
      const key = `${r.provider}:${r.service}`;
      const existing = map.get(key);
      if (existing) {
        existing.amount += r.amount;
      } else {
        map.set(key, { service: r.service, provider: r.provider, amount: r.amount });
      }
    }

    return Array.from(map.values())
      .sort((a, b) => b.amount - a.amount);
  }
}

// Singleton
export const mockStore = new MockStore();
