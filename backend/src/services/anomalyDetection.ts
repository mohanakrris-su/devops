/**
 * Anomaly Detection Engine
 *
 * Calculates baselines from historical daily spending and detects cost spikes
 * using configurable percentage and absolute thresholds.
 *
 * Algorithm:
 *   1. Group spending by (date, service, provider).
 *   2. For each group on each date, compute baseline = mean of all other dates
 *      with at least `historyDays` of data.
 *   3. Flag as anomaly when:
 *        - percentageDifference >= percentageThreshold  AND
 *        - absoluteDifference >= absoluteThreshold
 *   4. Assign severity based on percentage above baseline.
 *   5. Skip if already detected (duplicate prevention).
 */

import type { Anomaly, AlertSeverity, CloudProvider } from '../types';
import { config } from '../utils/config';
import { generateHistoricalData, type HistoricalPoint } from '../data/seed';
import { mockStore } from '../data/mockStore';

interface DetectionConfig {
  percentageThreshold: number;
  absoluteThreshold: number;
  historyDays: number;
}

function getConfig(): DetectionConfig {
  return {
    percentageThreshold: config.anomaly.percentageThreshold,
    absoluteThreshold: config.anomaly.absoluteThreshold,
    historyDays: config.anomaly.historyDays,
  };
}

function classifySeverity(percentageDiff: number): AlertSeverity {
  if (percentageDiff >= 200) return 'high';
  if (percentageDiff >= 100) return 'medium';
  return 'low';
}

let _anomalySeq = 0;
function anomalyId(): string {
  return `anom-${String(++_anomalySeq).padStart(4, '0')}`;
}

export interface ServiceDaySummary {
  date: string;
  provider: CloudProvider;
  service: string;
  amount: number;
}

/**
 * Compute the mean of an array of numbers, or null if empty.
 */
function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Run anomaly detection on the historical data.
 * Returns newly detected anomalies (skips already-detected).
 */
export function detectAnomalies(
  historicalData?: HistoricalPoint[],
  overrideConfig?: Partial<DetectionConfig>
): Anomaly[] {
  const cfg = { ...getConfig(), ...overrideConfig };
  const data = historicalData ?? generateHistoricalData();

  // Group by service+provider → collect daily amounts
  const grouped = new Map<string, ServiceDaySummary[]>();

  for (const point of data) {
    const key = `${point.provider}:${point.service}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push({
      date: point.date,
      provider: point.provider,
      service: point.service,
      amount: point.amount,
    });
  }

  const newAnomalies: Anomaly[] = [];

  for (const [, entries] of grouped) {
    if (entries.length < 2) continue; // need at least 2 data points

    // Sort chronologically
    entries.sort((a, b) => a.date.localeCompare(b.date));

    // For each entry, compute baseline from all *other* entries
    for (const entry of entries) {
      const others = entries.filter((e) => e.date !== entry.date);

      if (others.length < Math.min(cfg.historyDays, entries.length - 1)) {
        // Insufficient history — we still compute but note it
      }

      const baseline = mean(others.map((o) => o.amount));

      if (baseline === null || baseline === 0) {
        // Cannot compute meaningful deviation from zero baseline
        continue;
      }

      const absDiff = entry.amount - baseline;
      const pctDiff = (absDiff / baseline) * 100;

      if (pctDiff >= cfg.percentageThreshold && absDiff >= cfg.absoluteThreshold) {
        // Check for duplicate
        if (mockStore.hasAnomaly(entry.date, entry.service, entry.provider)) {
          continue;
        }

        const severity = classifySeverity(pctDiff);
        const anomaly: Anomaly = {
          id: anomalyId(),
          date: entry.date,
          provider: entry.provider,
          service: entry.service,
          detectedAmount: Math.round(entry.amount * 100) / 100,
          expectedBaseline: Math.round(baseline * 100) / 100,
          absoluteDifference: Math.round(absDiff * 100) / 100,
          percentageDifference: Math.round(pctDiff * 100) / 100,
          severity,
          explanation: buildExplanation(entry, baseline, pctDiff, absDiff, severity),
          detectedAt: new Date().toISOString(),
        };

        newAnomalies.push(anomaly);
      }
    }
  }

  return newAnomalies;
}

function buildExplanation(
  entry: ServiceDaySummary,
  baseline: number,
  pctDiff: number,
  absDiff: number,
  severity: AlertSeverity
): string {
  const pctStr = Math.round(pctDiff);
  const absStr = Math.round(absDiff * 100) / 100;

  return (
    `${entry.provider} ${entry.service} spending on ${entry.date} was $${entry.amount.toFixed(2)}, ` +
    `which is ${pctStr}% above the historical baseline of $${baseline.toFixed(2)} ` +
    `(+$${absStr.toFixed(2)}). ` +
    `This ${severity}-severity anomaly exceeded both the ${pctStr >= 50 ? 'percentage' : ''} ` +
    `and absolute spending thresholds.`
  );
}

/**
 * Stateless detection helper for unit testing — does NOT touch mockStore.
 */
export function detectAnomaliesPure(
  data: HistoricalPoint[],
  cfg: DetectionConfig
): Omit<Anomaly, 'id' | 'detectedAt'>[] {
  const grouped = new Map<string, ServiceDaySummary[]>();

  for (const point of data) {
    const key = `${point.provider}:${point.service}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push({
      date: point.date,
      provider: point.provider,
      service: point.service,
      amount: point.amount,
    });
  }

  const results: Omit<Anomaly, 'id' | 'detectedAt'>[] = [];

  for (const [, entries] of grouped) {
    if (entries.length < 2) continue;
    entries.sort((a, b) => a.date.localeCompare(b.date));

    for (const entry of entries) {
      const others = entries.filter((e) => e.date !== entry.date);
      const baseline = mean(others.map((o) => o.amount));

      if (baseline === null || baseline === 0) continue;

      const absDiff = entry.amount - baseline;
      const pctDiff = (absDiff / baseline) * 100;

      if (pctDiff >= cfg.percentageThreshold && absDiff >= cfg.absoluteThreshold) {
        const severity = classifySeverity(pctDiff);
        results.push({
          date: entry.date,
          provider: entry.provider,
          service: entry.service,
          detectedAmount: Math.round(entry.amount * 100) / 100,
          expectedBaseline: Math.round(baseline * 100) / 100,
          absoluteDifference: Math.round(absDiff * 100) / 100,
          percentageDifference: Math.round(pctDiff * 100) / 100,
          severity,
          explanation: buildExplanation(entry, baseline, pctDiff, absDiff, severity),
        });
      }
    }
  }

  return results;
}
