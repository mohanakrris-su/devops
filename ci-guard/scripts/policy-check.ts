#!/usr/bin/env node
/**
 * CostWatch CI Guard — Policy Check Script
 *
 * Reads an Infracost JSON breakdown and validates it against configurable
 * cost policies. Exits with:
 *   0  — PASS  (all policies satisfied)
 *   1  — FAIL  (one or more policies violated; blocks merge)
 *   2  — WARN  (non-blocking advisory, e.g. running in fixture mode)
 *
 * Environment variables (all optional — sensible defaults are applied):
 *   INFRACOST_JSON_PATH       Path to infracost breakdown --format json output.
 *                             Defaults to the offline fixture when omitted.
 *   BUDGET_MAX_MONTHLY        Maximum allowed total monthly cost in USD. Default: 500
 *   BUDGET_MAX_INCREASE       Maximum allowed monthly cost increase in USD. Default: 100
 *   CI_GUARD_WARN_ONLY        Set to "true" to downgrade FAIL to WARN (advisory mode).
 *   CI_GUARD_FIXTURE          Set to "true" to force fixture mode regardless of path.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Types ───────────────────────────────────────────────────────────────────

export interface InfracostOutput {
  version: string;
  currency: string;
  totalMonthlyCost: string;        // Total cost after proposed change
  pastTotalMonthlyCost: string;    // Cost before proposed change (baseline)
  diffTotalMonthlyCost: string;    // Net change
  summary: {
    totalDetectedResources: number;
    totalSupportedResources: number;
  };
  timeGenerated: string;
}

export interface PolicyConfig {
  maxMonthlyCost: number;   // USD: fail if totalMonthlyCost exceeds this
  maxIncrease: number;      // USD: fail if diffTotalMonthlyCost exceeds this
  warnOnly: boolean;        // Downgrade FAIL → WARN
}

export type PolicyStatus = 'PASS' | 'FAIL' | 'WARN';

export interface PolicyViolation {
  rule: string;
  actual: number;
  limit: number;
  message: string;
}

export interface PolicyResult {
  status: PolicyStatus;
  fixtureMode: boolean;
  costs: {
    totalMonthly: number;
    pastTotalMonthly: number;
    diffMonthly: number;
  };
  violations: PolicyViolation[];
  summary: string;
}

// ─── Parsing ─────────────────────────────────────────────────────────────────

export function parseInfracostJson(raw: string): InfracostOutput {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('INVALID_JSON: Infracost output is not valid JSON.');
  }

  const obj = parsed as Record<string, unknown>;

  // Required fields
  const required = ['version', 'totalMonthlyCost', 'pastTotalMonthlyCost', 'diffTotalMonthlyCost'];
  for (const field of required) {
    if (!(field in obj)) {
      throw new Error(`MISSING_FIELD: Infracost JSON is missing required field "${field}".`);
    }
  }

  const totalMonthlyCost = parseFloat(obj.totalMonthlyCost as string);
  const pastTotalMonthlyCost = parseFloat(obj.pastTotalMonthlyCost as string);
  const diffTotalMonthlyCost = parseFloat(obj.diffTotalMonthlyCost as string);

  if (isNaN(totalMonthlyCost) || isNaN(pastTotalMonthlyCost) || isNaN(diffTotalMonthlyCost)) {
    throw new Error('INVALID_COST: Cost fields must be parseable numbers.');
  }

  return {
    version: String(obj.version || '0.2'),
    currency: String(obj.currency || 'USD'),
    totalMonthlyCost: String(obj.totalMonthlyCost),
    pastTotalMonthlyCost: String(obj.pastTotalMonthlyCost),
    diffTotalMonthlyCost: String(obj.diffTotalMonthlyCost),
    summary: (obj.summary as InfracostOutput['summary']) ?? {
      totalDetectedResources: 0,
      totalSupportedResources: 0,
    },
    timeGenerated: String(obj.timeGenerated || new Date().toISOString()),
  };
}

// ─── Policy Evaluation ────────────────────────────────────────────────────────

export function evaluatePolicy(
  costs: PolicyResult['costs'],
  config: PolicyConfig
): { violations: PolicyViolation[] } {
  const violations: PolicyViolation[] = [];

  if (costs.totalMonthly > config.maxMonthlyCost) {
    violations.push({
      rule: 'MAX_MONTHLY_COST',
      actual: costs.totalMonthly,
      limit: config.maxMonthlyCost,
      message:
        `Total monthly cost $${costs.totalMonthly.toFixed(2)} exceeds the ` +
        `$${config.maxMonthlyCost.toFixed(2)} budget limit.`,
    });
  }

  if (costs.diffMonthly > config.maxIncrease) {
    violations.push({
      rule: 'MAX_COST_INCREASE',
      actual: costs.diffMonthly,
      limit: config.maxIncrease,
      message:
        `Monthly cost increase $${costs.diffMonthly.toFixed(2)} exceeds the ` +
        `$${config.maxIncrease.toFixed(2)} maximum allowed increase.`,
    });
  }

  return { violations };
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────

export function runPolicyCheck(options?: {
  jsonPath?: string;
  config?: Partial<PolicyConfig>;
  fixtureOverride?: string;
}): PolicyResult {
  const config: PolicyConfig = {
    maxMonthlyCost: parseFloat(process.env.BUDGET_MAX_MONTHLY ?? '500'),
    maxIncrease: parseFloat(process.env.BUDGET_MAX_INCREASE ?? '100'),
    warnOnly: process.env.CI_GUARD_WARN_ONLY === 'true',
    ...options?.config,
  };

  // Resolve the Infracost JSON source
  const forceFixture = process.env.CI_GUARD_FIXTURE === 'true';
  const jsonPath = options?.jsonPath ?? process.env.INFRACOST_JSON_PATH ?? '';
  const fixtureMode = forceFixture || !jsonPath;

  let rawJson: string;
  let resolvedSource: string;

  if (options?.fixtureOverride) {
    // Direct string override (used in tests)
    rawJson = options.fixtureOverride;
    resolvedSource = '<inline>';
  } else if (fixtureMode) {
    const fixturePath = path.resolve(
      __dirname,
      '../fixtures/infracost-below.json'
    );
    rawJson = fs.readFileSync(fixturePath, 'utf8');
    resolvedSource = fixturePath;
  } else {
    if (!fs.existsSync(jsonPath)) {
      throw new Error(`FILE_NOT_FOUND: Infracost JSON not found at "${jsonPath}".`);
    }
    rawJson = fs.readFileSync(jsonPath, 'utf8');
    resolvedSource = jsonPath;
  }

  const infracost = parseInfracostJson(rawJson);

  const costs: PolicyResult['costs'] = {
    totalMonthly: parseFloat(infracost.totalMonthlyCost),
    pastTotalMonthly: parseFloat(infracost.pastTotalMonthlyCost),
    diffMonthly: parseFloat(infracost.diffTotalMonthlyCost),
  };

  const { violations } = evaluatePolicy(costs, config);

  let status: PolicyStatus;
  if (violations.length === 0) {
    status = fixtureMode ? 'WARN' : 'PASS';
  } else if (config.warnOnly) {
    status = 'WARN';
  } else {
    status = 'FAIL';
  }

  const currency = infracost.currency;
  const lines: string[] = [
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `  CostWatch CI Guard — Policy Check`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    fixtureMode
      ? `  MODE:   FIXTURE (offline — estimates are not real)`
      : `  MODE:   LIVE (Infracost pricing data)`,
    `  SOURCE: ${resolvedSource}`,
    ``,
    `  Costs (${currency}):`,
    `    Baseline (before):  $${costs.pastTotalMonthly.toFixed(2)}/month`,
    `    Proposed (after):   $${costs.totalMonthly.toFixed(2)}/month`,
    `    Increase:          +$${costs.diffMonthly.toFixed(2)}/month`,
    ``,
    `  Policies:`,
    `    Max monthly cost:   $${config.maxMonthlyCost.toFixed(2)}   → ${costs.totalMonthly <= config.maxMonthlyCost ? '✓ OK' : '✗ EXCEEDED'}`,
    `    Max increase:       $${config.maxIncrease.toFixed(2)}   → ${costs.diffMonthly <= config.maxIncrease ? '✓ OK' : '✗ EXCEEDED'}`,
  ];

  if (violations.length > 0) {
    lines.push(``, `  Violations:`);
    for (const v of violations) {
      lines.push(`    ✗ [${v.rule}] ${v.message}`);
    }
  }

  if (fixtureMode) {
    lines.push(
      ``,
      `  ⚠ FIXTURE MODE: These are not real cost estimates.`,
      `  To get real estimates, set INFRACOST_JSON_PATH to an`,
      `  actual infracost breakdown JSON file.`
    );
  }

  lines.push(``, `  Result: ${status}`, `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  return {
    status,
    fixtureMode,
    costs,
    violations,
    summary: lines.join('\n'),
  };
}

// ─── CLI Entry ────────────────────────────────────────────────────────────────

// Only run as main when executed directly (not imported by tests)
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try {
    const result = runPolicyCheck();
    console.log(result.summary);

    const exitCode = result.status === 'FAIL' ? 1 : 0;
    process.exit(exitCode);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`\n  ✗ CI Guard error: ${message}\n`);
    process.exit(1);
  }
}
