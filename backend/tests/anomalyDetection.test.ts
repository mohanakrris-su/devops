import { describe, it, expect } from 'vitest';
import { detectAnomaliesPure } from '../src/services/anomalyDetection';
import { generateHistoricalData } from '../src/data/seed';
import type { CloudProvider } from '../src/types';

type HistoricalPoint = {
  date: string;
  provider: CloudProvider;
  service: string;
  amount: number;
};

// ─── Helper to build history ────────────────────────────────────────────────

function buildHistory(amounts: number[], service = 'EC2', provider: CloudProvider = 'AWS'): HistoricalPoint[] {
  return amounts.map((amount, i) => ({
    date: `2026-10-${String(i + 1).padStart(2, '0')}`,
    provider,
    service,
    amount,
  }));
}

const defaultCfg = {
  percentageThreshold: 50,
  absoluteThreshold: 100,
  historyDays: 14,
};

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('Anomaly Detection Engine', () => {
  it('detects an obvious spending spike', () => {
    // 14 normal days at ~$200, then a spike to $800
    const data = buildHistory([
      200, 210, 195, 205, 198, 202, 208, 200, 195, 210,
      200, 205, 198, 200, 800,
    ]);

    const results = detectAnomaliesPure(data, defaultCfg);

    expect(results.length).toBeGreaterThanOrEqual(1);
    const spike = results.find((r) => r.detectedAmount === 800);
    expect(spike).toBeDefined();
    expect(spike!.percentageDifference).toBeGreaterThan(50);
    expect(spike!.absoluteDifference).toBeGreaterThan(100);
    expect(spike!.severity).toBe('high');
  });

  it('does NOT flag normal spending as anomaly', () => {
    // All values are very close — no spike
    const data = buildHistory([
      200, 205, 198, 202, 210, 200, 195, 205, 200, 202,
      198, 205, 200, 202, 205,
    ]);

    const results = detectAnomaliesPure(data, defaultCfg);
    expect(results.length).toBe(0);
  });

  it('handles insufficient historical data (fewer than 2 points)', () => {
    const data = buildHistory([500]);
    const results = detectAnomaliesPure(data, defaultCfg);
    expect(results.length).toBe(0); // can't compute baseline from 1 point
  });

  it('handles zero baseline values safely', () => {
    // All zeros except one day
    const data = buildHistory([0, 0, 0, 0, 300]);
    const results = detectAnomaliesPure(data, defaultCfg);
    // Baseline is 0 → should NOT divide by zero or crash
    // We might detect or not detect, but it must not throw
    expect(Array.isArray(results)).toBe(true);
  });

  it('handles missing/empty data gracefully', () => {
    const results = detectAnomaliesPure([], defaultCfg);
    expect(results).toEqual([]);
  });

  it('computes correct percentage and absolute differences', () => {
    // Normal at ~$100, spike to $300
    const data = buildHistory([
      100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 300,
    ]);

    const results = detectAnomaliesPure(data, defaultCfg);
    const spike = results.find((r) => r.detectedAmount === 300);
    expect(spike).toBeDefined();

    // Baseline ≈ mean of 10 × $100 = $100
    // $300 - $100 = $200 absolute diff
    // ($200 / $100) × 100 = 200% percentage diff
    expect(spike!.absoluteDifference).toBeCloseTo(200, 0);
    expect(spike!.percentageDifference).toBeCloseTo(200, 0);
  });

  it('classifies severity correctly based on percentage', () => {
    // ~50-99% → low, ~100-199% → medium, ≥200% → high

    // Medium: spike from $100 baseline to $250 → ~150%
    const medData = buildHistory([100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 250]);
    const medResults = detectAnomaliesPure(medData, defaultCfg);
    const medSpike = medResults.find((r) => r.detectedAmount === 250);
    expect(medSpike).toBeDefined();
    expect(medSpike!.severity).toBe('medium');

    // High: spike from $100 to $400 → ~300%
    const highData = buildHistory([100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 400]);
    const highResults = detectAnomaliesPure(highData, defaultCfg);
    const highSpike = highResults.find((r) => r.detectedAmount === 400);
    expect(highSpike).toBeDefined();
    expect(highSpike!.severity).toBe('high');
  });

  it('detects anomalies in the actual demo seed data', () => {
    // Use the real generator — must use same thresholds as production config
    // absoluteThreshold=50 matches service-level amounts (fractions of provider totals)
    const seedCfg = { percentageThreshold: 50, absoluteThreshold: 50, historyDays: 14 };
    const data = generateHistoricalData();
    const results = detectAnomaliesPure(data, seedCfg);

    // We seeded 3 anomalies: AWS EC2 spike, Azure Blob spike, GCP BigQuery spike
    expect(results.length).toBeGreaterThanOrEqual(3);

    const providers = new Set(results.map((r: { provider: string }) => r.provider));
    expect(providers.has('AWS')).toBe(true);
    expect(providers.has('Azure')).toBe(true);
    expect(providers.has('GCP')).toBe(true);
  });

  it('respects configurable thresholds', () => {
    // With very high thresholds, the same spike should not be detected
    const data = buildHistory([
      100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 300,
    ]);

    const strictCfg = {
      percentageThreshold: 500,  // 500% → very strict
      absoluteThreshold: 1000,
      historyDays: 14,
    };

    const results = detectAnomaliesPure(data, strictCfg);
    expect(results.length).toBe(0);
  });

  it('detects service-level anomalies across providers', () => {
    const data: HistoricalPoint[] = [
      ...buildHistory([100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100], 'EC2', 'AWS'),
      ...buildHistory([50, 50, 50, 50, 50, 50, 50, 50, 50, 50, 300], 'Lambda', 'AWS'),
    ];

    const results = detectAnomaliesPure(data, defaultCfg);

    // Only Lambda should be flagged — EC2 is stable
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.every((r) => r.service === 'Lambda')).toBe(true);
  });
});
