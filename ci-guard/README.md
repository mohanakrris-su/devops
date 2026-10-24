# CostWatch CI Guard

> Automated Terraform cost-policy enforcement for GitHub pull requests.
> Validates proposed infrastructure changes against configurable budget limits
> before they are merged and deployed.

## How It Works

```
PR opened touching infra-demo/ ─► GitHub Actions
        │
        ├─ Job 1: terraform validate (no credentials, safe)
        │
        ├─ Job 2: Cost Policy Check
        │          ├─ LIVE mode (INFRACOST_API_KEY set)
        │          │    Infracost contacts pricing APIs → real estimates
        │          │    → Posts cost breakdown as PR comment
        │          │
        │          └─ FIXTURE mode (no API key)
        │               Uses offline JSON fixture → deterministic
        │               → Warns in workflow log, does not block
        │
        └─ Job 3: Existing app regression guard
                  (backend tests + frontend type check always run)
```

**Pass/Warn/Fail behavior:**

| Condition | Status |
|---|---|
| Costs within both limits (live data) | **PASS** ✅ |
| Costs within limits (fixture data) | **WARN** ⚠ (data not real) |
| Any limit exceeded (`warnOnly=false`) | **FAIL** ❌ (blocks merge) |
| Any limit exceeded (`warnOnly=true`) | **WARN** ⚠ (advisory only) |
| Invalid Infracost JSON | **Error** — workflow fails |

---

## Setup

### 1. Fork / Clone

No extra setup is needed to run in fixture mode. The workflow works out of the box on any repo without cloud credentials.

### 2. Configure GitHub Secrets (for LIVE mode)

In your GitHub repository → **Settings → Secrets and variables → Actions**:

| Secret / Variable | Type | Description |
|---|---|---|
| `INFRACOST_API_KEY` | **Secret** | Infracost API key from [infracost.io](https://www.infracost.io/). Free tier available. Leave unset to use fixture mode. |
| `BUDGET_MAX_MONTHLY` | Variable | Max total monthly cost in USD. Default: `500` |
| `BUDGET_MAX_INCREASE` | Variable | Max monthly cost increase in USD. Default: `100` |
| `CI_GUARD_WARN_ONLY` | Variable | Set to `true` to make failures advisory (non-blocking). Default: `false` |

> **Getting an Infracost API key:**
> 1. Register at [dashboard.infracost.io](https://dashboard.infracost.io/)
> 2. Copy the API key from your account settings
> 3. Add it as a **GitHub Secret** named `INFRACOST_API_KEY`

### 3. AWS Credentials (for live Infracost Terraform plan)

Infracost needs to run `terraform plan` to generate cost estimates.
This requires AWS credentials in GitHub Secrets:

| Secret | Description |
|---|---|
| `AWS_ACCESS_KEY_ID` | Read-only IAM user with `ReadOnlyAccess` policy |
| `AWS_SECRET_ACCESS_KEY` | Corresponding secret key |

> ⚠ Use a **dedicated read-only IAM user** for CI. Never use root credentials.

---

## Policy Configuration

Policies are configured via GitHub Actions Variables (or environment variables locally):

```
BUDGET_MAX_MONTHLY=500    # Maximum total monthly cost in USD
BUDGET_MAX_INCREASE=100   # Maximum cost increase per PR in USD
CI_GUARD_WARN_ONLY=false  # false = block merges on violation, true = advisory
```

### How the policy engine decides:

```
IF totalMonthlyCost > BUDGET_MAX_MONTHLY  → MAX_MONTHLY_COST violation
IF diffTotalMonthlyCost > BUDGET_MAX_INCREASE → MAX_COST_INCREASE violation

IF any violation AND warnOnly=false → status=FAIL (exit 1)
IF any violation AND warnOnly=true  → status=WARN (exit 0)
IF no violations AND live data      → status=PASS (exit 0)
IF no violations AND fixture data   → status=WARN (exit 0, not PASS — data is not real)
```

---

## Running Locally (No Cloud Credentials Required)

```powershell
# Install dependencies
cd ci-guard
npm install

# Run all tests (fixture-based, fully offline)
npm test

# Run verbose tests
npm run test:verbose

# Run the policy check script directly (fixture mode, offline)
node --import tsx/esm scripts/policy-check.ts

# Run with custom thresholds
$env:BUDGET_MAX_MONTHLY = "30"
$env:BUDGET_MAX_INCREASE = "20"
node --import tsx/esm scripts/policy-check.ts
```

### Simulating above-budget scenario locally:

```powershell
$env:CI_GUARD_FIXTURE = "true"
$env:BUDGET_MAX_MONTHLY = "20"   # Force a failure — fixture costs $26.86
cd ci-guard
node --import tsx/esm scripts/policy-check.ts
# Exits with code 1 (FAIL)
```

### Using a real Infracost JSON file:

```powershell
# First, generate infracost output (requires Infracost + Terraform installed)
cd infra-demo
terraform init -backend=false
terraform plan -var="db_password=placeholder" -out=tfplan.binary
terraform show -json tfplan.binary > tfplan.json
infracost breakdown --path tfplan.json --format json --out-file ../infracost-real.json

# Then run the policy check against it
$env:INFRACOST_JSON_PATH = "$(pwd)\..\infracost-real.json"
cd ..\ci-guard
node --import tsx/esm scripts/policy-check.ts
```

---

## Test Coverage

Tests run entirely offline — no cloud credentials or paid services needed.

```powershell
cd ci-guard
npm test
```

| Test Group | What is covered |
|---|---|
| `parseInfracostJson` | Valid JSON, invalid JSON, missing fields, non-numeric costs, zero costs |
| `evaluatePolicy` | Both rules, boundary equality, only-one-rule-exceeded, both exceeded, custom thresholds, negative diffs (cost reductions) |
| `runPolicyCheck (fixture mode)` | WARN on clean fixture, FAIL on above-budget fixture, warnOnly override, cost field accuracy, summary text content |
| `runPolicyCheck (invalid inputs)` | Bad JSON, missing fields, missing file, non-numeric costs |
| `runPolicyCheck (env vars)` | BUDGET_MAX_MONTHLY, BUDGET_MAX_INCREASE, CI_GUARD_WARN_ONLY |
| `runPolicyCheck (file loading)` | File path with CI_GUARD_FIXTURE, file path as live mode |

---

## Directory Structure

```
ci-guard/
├── README.md                         # This file
├── package.json                      # Isolated from frontend/backend
├── tsconfig.json
├── vitest.config.ts
├── scripts/
│   └── policy-check.ts               # Core policy engine (exports + CLI)
├── fixtures/
│   ├── infracost-below.json          # $26.86/month — passes default policy
│   ├── infracost-above.json          # $596.50/month — fails default policy
│   └── infracost-moderate-increase.json  # $56.94/month, +$30.08 increase
└── tests/
    └── policy.test.ts                # All tests

infra-demo/
├── README.md                         # Usage warnings + variable docs
├── main.tf                           # EC2 + S3 + RDS resources
├── variables.tf                      # Input variable definitions
├── outputs.tf                        # Resource output values
└── terraform.tfvars.example          # Copy → terraform.tfvars, never commit

.github/workflows/
└── ci-guard.yml                      # GitHub Actions workflow
```

---

## Limitations

> [!IMPORTANT]
> **Fixture mode does not reflect real AWS pricing.** The fixture JSON files contain hand-crafted estimates for illustration purposes. Real pricing varies by region, account discounts, reserved vs on-demand pricing, and data transfer. Always use live Infracost data for production gates.

- **No Terraform state**: `terraform validate` and `infracost breakdown` run without a real backend. This means drift detection is not possible.
- **No multi-project support**: The policy engine reads the top-level `totalMonthlyCost` from a single Infracost JSON file.
- **AWS only in demo**: The `infra-demo/` configuration only defines AWS resources. GCP and Azure Terraform configurations can be added and cost-estimated the same way.
- **`terraform apply` is intentionally never run** in CI. This workflow is purely a guardrail, not a deployment pipeline.
- **Infracost usage-based resources**: Resources priced on actual usage (e.g. S3 data transfer, Lambda invocations) show `$0` in estimates. Infracost marks these as `totalUsageBasedResources`.
