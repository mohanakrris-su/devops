import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import {
  parseInfracostJson,
  evaluatePolicy,
  runPolicyCheck,
  type PolicyConfig,
} from '../scripts/policy-check';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.resolve(__dirname, '../fixtures');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function loadFixture(name: string): string {
  return fs.readFileSync(path.join(FIXTURES, name), 'utf8');
}

function makeInfracostJson(overrides: {
  totalMonthlyCost?: string;
  pastTotalMonthlyCost?: string;
  diffTotalMonthlyCost?: string;
  version?: string;
  currency?: string;
}): string {
  return JSON.stringify({
    version: '0.2',
    currency: 'USD',
    totalMonthlyCost: '50.00',
    pastTotalMonthlyCost: '0',
    diffTotalMonthlyCost: '50.00',
    summary: { totalDetectedResources: 2, totalSupportedResources: 2 },
    timeGenerated: '2026-10-24T00:00:00Z',
    ...overrides,
  });
}

const defaultPolicy: PolicyConfig = {
  maxMonthlyCost: 500,
  maxIncrease: 100,
  warnOnly: false,
};

// ─── parseInfracostJson ───────────────────────────────────────────────────────

describe('parseInfracostJson', () => {
  it('parses a valid infracost JSON string', () => {
    const raw = makeInfracostJson({
      totalMonthlyCost: '73.43',
      pastTotalMonthlyCost: '0',
      diffTotalMonthlyCost: '73.43',
    });
    const result = parseInfracostJson(raw);
    expect(result.totalMonthlyCost).toBe('73.43');
    expect(result.pastTotalMonthlyCost).toBe('0');
    expect(result.diffTotalMonthlyCost).toBe('73.43');
    expect(result.currency).toBe('USD');
  });

  it('parses the below-budget fixture without error', () => {
    const raw = loadFixture('infracost-below.json');
    const result = parseInfracostJson(raw);
    expect(parseFloat(result.totalMonthlyCost)).toBeCloseTo(26.86, 1);
    expect(parseFloat(result.diffTotalMonthlyCost)).toBeCloseTo(26.86, 1);
  });

  it('parses the above-budget fixture without error', () => {
    const raw = loadFixture('infracost-above.json');
    const result = parseInfracostJson(raw);
    expect(parseFloat(result.totalMonthlyCost)).toBeGreaterThan(500);
    expect(parseFloat(result.diffTotalMonthlyCost)).toBeGreaterThan(100);
  });

  it('parses the moderate-increase fixture without error', () => {
    const raw = loadFixture('infracost-moderate-increase.json');
    const result = parseInfracostJson(raw);
    expect(parseFloat(result.totalMonthlyCost)).toBeGreaterThan(0);
    expect(parseFloat(result.pastTotalMonthlyCost)).toBeGreaterThan(0);
  });

  it('throws INVALID_JSON for non-JSON input', () => {
    expect(() => parseInfracostJson('not json at all')).toThrow('INVALID_JSON');
  });

  it('throws INVALID_JSON for empty string', () => {
    expect(() => parseInfracostJson('')).toThrow('INVALID_JSON');
  });

  it('throws MISSING_FIELD when totalMonthlyCost is absent', () => {
    const raw = JSON.stringify({ version: '0.2', pastTotalMonthlyCost: '0', diffTotalMonthlyCost: '0' });
    expect(() => parseInfracostJson(raw)).toThrow('MISSING_FIELD');
    expect(() => parseInfracostJson(raw)).toThrow('totalMonthlyCost');
  });

  it('throws MISSING_FIELD when diffTotalMonthlyCost is absent', () => {
    const raw = JSON.stringify({ version: '0.2', totalMonthlyCost: '10', pastTotalMonthlyCost: '0' });
    expect(() => parseInfracostJson(raw)).toThrow('MISSING_FIELD');
    expect(() => parseInfracostJson(raw)).toThrow('diffTotalMonthlyCost');
  });

  it('throws INVALID_COST when cost fields are non-numeric strings', () => {
    const raw = makeInfracostJson({ totalMonthlyCost: 'N/A' });
    expect(() => parseInfracostJson(raw)).toThrow('INVALID_COST');
  });

  it('handles zero-cost correctly (new infra, no prior baseline)', () => {
    const raw = makeInfracostJson({ totalMonthlyCost: '0', pastTotalMonthlyCost: '0', diffTotalMonthlyCost: '0' });
    const result = parseInfracostJson(raw);
    expect(parseFloat(result.totalMonthlyCost)).toBe(0);
  });
});

// ─── evaluatePolicy ───────────────────────────────────────────────────────────

describe('evaluatePolicy', () => {
  it('returns no violations when costs are within both limits', () => {
    const { violations } = evaluatePolicy(
      { totalMonthly: 80, pastTotalMonthly: 0, diffMonthly: 80 },
      defaultPolicy
    );
    expect(violations).toHaveLength(0);
  });

  it('returns no violations when cost exactly equals the limit (inclusive)', () => {
    const { violations } = evaluatePolicy(
      { totalMonthly: 500, pastTotalMonthly: 400, diffMonthly: 100 },
      defaultPolicy
    );
    expect(violations).toHaveLength(0);
  });

  it('flags MAX_MONTHLY_COST when total exceeds budget', () => {
    const { violations } = evaluatePolicy(
      { totalMonthly: 596.50, pastTotalMonthly: 26.86, diffMonthly: 569.64 },
      defaultPolicy
    );
    const rule = violations.find((v) => v.rule === 'MAX_MONTHLY_COST');
    expect(rule).toBeDefined();
    expect(rule!.actual).toBeCloseTo(596.50, 1);
    expect(rule!.limit).toBe(500);
  });

  it('flags MAX_COST_INCREASE when diff exceeds the increase limit', () => {
    const { violations } = evaluatePolicy(
      { totalMonthly: 596.50, pastTotalMonthly: 26.86, diffMonthly: 569.64 },
      defaultPolicy
    );
    const rule = violations.find((v) => v.rule === 'MAX_COST_INCREASE');
    expect(rule).toBeDefined();
    expect(rule!.actual).toBeCloseTo(569.64, 1);
    expect(rule!.limit).toBe(100);
  });

  it('flags only MAX_COST_INCREASE when total is fine but increase is too large', () => {
    // Existing infra with high baseline, small total, but large diff
    const { violations } = evaluatePolicy(
      { totalMonthly: 200, pastTotalMonthly: 0, diffMonthly: 150 },
      { ...defaultPolicy, maxMonthlyCost: 500, maxIncrease: 100 }
    );
    expect(violations).toHaveLength(1);
    expect(violations[0].rule).toBe('MAX_COST_INCREASE');
  });

  it('flags only MAX_MONTHLY_COST when total is high but increase is small', () => {
    const { violations } = evaluatePolicy(
      { totalMonthly: 600, pastTotalMonthly: 520, diffMonthly: 80 },
      { ...defaultPolicy, maxMonthlyCost: 500, maxIncrease: 100 }
    );
    expect(violations).toHaveLength(1);
    expect(violations[0].rule).toBe('MAX_MONTHLY_COST');
  });

  it('flags both rules when both are exceeded', () => {
    const { violations } = evaluatePolicy(
      { totalMonthly: 700, pastTotalMonthly: 100, diffMonthly: 600 },
      defaultPolicy
    );
    expect(violations).toHaveLength(2);
    const rules = violations.map((v) => v.rule);
    expect(rules).toContain('MAX_MONTHLY_COST');
    expect(rules).toContain('MAX_COST_INCREASE');
  });

  it('respects custom thresholds from policy config', () => {
    const strict: PolicyConfig = { maxMonthlyCost: 20, maxIncrease: 10, warnOnly: false };
    const { violations } = evaluatePolicy(
      { totalMonthly: 26.86, pastTotalMonthly: 0, diffMonthly: 26.86 },
      strict
    );
    expect(violations.length).toBeGreaterThanOrEqual(1);
  });

  it('handles negative diff (cost decrease) without violations', () => {
    // A cost reduction: diffMonthly is negative
    const { violations } = evaluatePolicy(
      { totalMonthly: 20, pastTotalMonthly: 50, diffMonthly: -30 },
      defaultPolicy
    );
    expect(violations).toHaveLength(0);
  });
});

// ─── runPolicyCheck — fixture mode ────────────────────────────────────────────

describe('runPolicyCheck (fixture mode)', () => {
  beforeEach(() => {
    // Ensure no INFRACOST_JSON_PATH leaks from environment
    delete process.env.INFRACOST_JSON_PATH;
    delete process.env.BUDGET_MAX_MONTHLY;
    delete process.env.BUDGET_MAX_INCREASE;
    delete process.env.CI_GUARD_WARN_ONLY;
    delete process.env.CI_GUARD_FIXTURE;
  });

  it('returns WARN (not FAIL or PASS) in fixture mode when costs are below budget', () => {
    const result = runPolicyCheck({
      fixtureOverride: loadFixture('infracost-below.json'),
      config: { warnOnly: false },
    });
    // Fixture mode with no violations → WARN (not PASS — data is not real)
    expect(result.status).toBe('WARN');
    expect(result.fixtureMode).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('returns FAIL when above-budget fixture is loaded with live-like policy', () => {
    const result = runPolicyCheck({
      fixtureOverride: loadFixture('infracost-above.json'),
      config: { maxMonthlyCost: 500, maxIncrease: 100, warnOnly: false },
    });
    expect(result.status).toBe('FAIL');
    expect(result.violations.length).toBeGreaterThanOrEqual(1);
  });

  it('returns WARN (not FAIL) when warnOnly is true, even with violations', () => {
    const result = runPolicyCheck({
      fixtureOverride: loadFixture('infracost-above.json'),
      config: { maxMonthlyCost: 500, maxIncrease: 100, warnOnly: true },
    });
    expect(result.status).toBe('WARN');
  });

  it('exposes costs correctly from the below fixture', () => {
    const result = runPolicyCheck({
      fixtureOverride: loadFixture('infracost-below.json'),
    });
    expect(result.costs.totalMonthly).toBeCloseTo(26.86, 1);
    expect(result.costs.pastTotalMonthly).toBeCloseTo(0, 1);
    expect(result.costs.diffMonthly).toBeCloseTo(26.86, 1);
  });

  it('exposes costs correctly from the above fixture', () => {
    const result = runPolicyCheck({
      fixtureOverride: loadFixture('infracost-above.json'),
    });
    expect(result.costs.totalMonthly).toBeCloseTo(596.50, 0);
    expect(result.costs.diffMonthly).toBeCloseTo(569.64, 0);
  });

  it('exposes violation messages as human-readable strings', () => {
    const result = runPolicyCheck({
      fixtureOverride: loadFixture('infracost-above.json'),
      config: { maxMonthlyCost: 500, maxIncrease: 100, warnOnly: false },
    });
    const messages = result.violations.map((v) => v.message);
    expect(messages.some((m) => m.includes('$'))).toBe(true);
  });

  it('includes fixture-mode warning in summary text', () => {
    const result = runPolicyCheck({
      fixtureOverride: loadFixture('infracost-below.json'),
    });
    expect(result.summary).toContain('FIXTURE');
  });

  it('includes result status in summary text', () => {
    const result = runPolicyCheck({
      fixtureOverride: loadFixture('infracost-below.json'),
    });
    expect(result.summary).toContain(result.status);
  });
});

// ─── runPolicyCheck — invalid inputs ──────────────────────────────────────────

describe('runPolicyCheck (invalid inputs)', () => {
  it('throws when fixture override is invalid JSON', () => {
    expect(() =>
      runPolicyCheck({ fixtureOverride: 'this is not json' })
    ).toThrow('INVALID_JSON');
  });

  it('throws when required cost fields are missing', () => {
    const bad = JSON.stringify({ version: '0.2' });
    expect(() => runPolicyCheck({ fixtureOverride: bad })).toThrow('MISSING_FIELD');
  });

  it('throws FILE_NOT_FOUND when INFRACOST_JSON_PATH points to a nonexistent file', () => {
    expect(() =>
      runPolicyCheck({ jsonPath: '/nonexistent/path/infracost.json' })
    ).toThrow('FILE_NOT_FOUND');
  });

  it('throws INVALID_COST when cost values are non-numeric', () => {
    const bad = JSON.stringify({
      version: '0.2',
      totalMonthlyCost: 'undefined',
      pastTotalMonthlyCost: '0',
      diffTotalMonthlyCost: '0',
    });
    expect(() => runPolicyCheck({ fixtureOverride: bad })).toThrow('INVALID_COST');
  });
});

// ─── runPolicyCheck — environment variable configuration ──────────────────────

describe('runPolicyCheck (environment variable policy config)', () => {
  afterEach(() => {
    delete process.env.BUDGET_MAX_MONTHLY;
    delete process.env.BUDGET_MAX_INCREASE;
    delete process.env.CI_GUARD_WARN_ONLY;
  });

  it('reads BUDGET_MAX_MONTHLY from environment', () => {
    process.env.BUDGET_MAX_MONTHLY = '10'; // very strict
    const result = runPolicyCheck({
      fixtureOverride: loadFixture('infracost-below.json'), // $26.86
    });
    // $26.86 > $10 → should fail
    const maxCostViolation = result.violations.find((v) => v.rule === 'MAX_MONTHLY_COST');
    expect(maxCostViolation).toBeDefined();
  });

  it('reads BUDGET_MAX_INCREASE from environment', () => {
    process.env.BUDGET_MAX_INCREASE = '5'; // very strict
    const result = runPolicyCheck({
      fixtureOverride: loadFixture('infracost-below.json'), // diff=$26.86
    });
    const increaseViolation = result.violations.find((v) => v.rule === 'MAX_COST_INCREASE');
    expect(increaseViolation).toBeDefined();
  });

  it('reads CI_GUARD_WARN_ONLY=true from environment, downgrading FAIL to WARN', () => {
    process.env.CI_GUARD_WARN_ONLY = 'true';
    const result = runPolicyCheck({
      fixtureOverride: loadFixture('infracost-above.json'),
    });
    expect(result.status).toBe('WARN');
  });
});

// ─── runPolicyCheck — file-based fixture loading ──────────────────────────────

describe('runPolicyCheck (file-based loading)', () => {
  it('loads infracost-below.json fixture by file path when CI_GUARD_FIXTURE=true', () => {
    const fixturePath = path.join(FIXTURES, 'infracost-below.json');
    // Even if we pass a jsonPath, CI_GUARD_FIXTURE=true forces fixture mode
    process.env.CI_GUARD_FIXTURE = 'true';
    const result = runPolicyCheck({ jsonPath: fixturePath });
    expect(result.fixtureMode).toBe(true);
    delete process.env.CI_GUARD_FIXTURE;
  });

  it('uses live mode when a valid file path is provided without CI_GUARD_FIXTURE', () => {
    const fixturePath = path.join(FIXTURES, 'infracost-below.json');
    const result = runPolicyCheck({ jsonPath: fixturePath });
    // File exists and is valid JSON → treated as live data
    expect(result.fixtureMode).toBe(false);
    expect(result.status).toBe('PASS');
  });
});
