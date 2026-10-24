# CostWatch — Cloud Cost Anomaly Detector

> A portfolio-quality, full-stack cloud cost monitoring dashboard with real-time anomaly detection, resource optimization recommendations, and multi-cloud billing analytics.

![Tech Stack](https://img.shields.io/badge/stack-React%20%7C%20Node.js%20%7C%20TypeScript-blue)
![Tests](https://img.shields.io/badge/tests-26%20passing-brightgreen)
![Mode](https://img.shields.io/badge/data%20mode-mock%20%7C%20mongodb-orange)

---

## ✨ Features

| Feature | Description |
|---|---|
| **Dashboard KPIs** | Total spend, monthly run rate, budget utilization, anomaly count |
| **Spending Charts** | Daily trend area chart with baseline comparison (Recharts) |
| **Service Breakdown** | Horizontal bar chart by cloud service |
| **Anomaly Detection** | Statistical engine with configurable % and absolute thresholds |
| **Resource Inventory** | Idle/unattached resource detection with savings estimates |
| **Alert History** | Alert deduplication, test alert simulation |
| **Billing Table** | Paginated, filterable billing records (AWS, Azure, GCP) |
| **Mock-first mode** | Zero external dependencies — works entirely in-memory |

---

## Architecture

```
CostWatch/
├── backend/                  # Node.js + Express + TypeScript
│   ├── src/
│   │   ├── controllers/      # Route handlers
│   │   ├── data/             # seed.ts (deterministic mock) + mockStore.ts
│   │   ├── middleware/       # Error handler, 404
│   │   ├── routes/           # Express router
│   │   ├── services/         # anomalyDetection.ts, alertService.ts
│   │   ├── types/            # Shared TypeScript domain models
│   │   └── utils/config.ts   # Centralised typed config (env vars)
│   └── tests/                # Vitest unit + integration tests
│
└── frontend/                 # React 19 + Vite + TypeScript + Tailwind CSS
    └── src/
        ├── components/       # Sidebar, KPICards, SpendingChart, AnomalyList ...
        ├── api.ts            # Typed fetch client
        └── App.tsx           # Page routing and global state
```

### Data Flow
```
Browser -> Vite (port 5173) -> /api/* proxy -> Express (port 4000)
                                                   |
                                        MockStore (in-memory)
                                        AnomalyDetection engine
                                        AlertService
```

---

## Quick Start

### Prerequisites
- **Node.js >= 18** and **npm >= 9**
- No Docker, MongoDB, or cloud credentials required

### 1 — Clone and install

```bash
# Backend
cd backend
npm install

# Frontend (new terminal)
cd frontend
npm install
```

### 2 — Configure environment

```bash
# Backend
cd backend
cp .env.example .env   # defaults work out of the box
```

### 3 — Start servers (two terminals)

```bash
# Terminal 1 — Backend (port 4000)
cd backend
npm run dev

# Terminal 2 — Frontend (port 5173)
cd frontend
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## Testing

```bash
cd backend
npm test            # run 26 unit + integration tests
```

Test coverage includes:
- Anomaly detection algorithm (spike detection, severity, zero-baseline safety, threshold configurability)
- All REST API endpoints (health, dashboard, billing, anomalies, resources, alerts)
- Mock-mode operation without MongoDB
- Duplicate anomaly prevention

---

## Configuration

All settings are environment variables with sensible defaults:

| Variable | Default | Description |
|---|---|---|
| `PORT` | `4000` | Backend listening port |
| `DATA_MODE` | `mock` | `mock` (in-memory) or `mongodb` |
| `MONGODB_URI` | `mongodb://localhost:27017/costwatch` | Only used when DATA_MODE=mongodb |
| `ANOMALY_PERCENTAGE_THRESHOLD` | `50` | Min % above baseline to flag anomaly |
| `ANOMALY_ABSOLUTE_THRESHOLD` | `50` | Min $ above baseline to flag anomaly |
| `ANOMALY_HISTORY_DAYS` | `14` | Lookback window for baseline calculation |
| `ALERT_DEDUP_WINDOW_HOURS` | `24` | Suppress duplicate alerts within this window |

---

## Anomaly Detection Algorithm

1. **Group** billing data by `(provider, service)` pairs
2. **Compute baseline** = mean of all other dates for that service
3. **Flag anomaly** when both conditions hold:
   - `percentageDifference >= ANOMALY_PERCENTAGE_THRESHOLD`
   - `absoluteDifference >= ANOMALY_ABSOLUTE_THRESHOLD`
4. **Classify severity**: low (<100% over), medium (100-199%), high (>=200%)
5. **Deduplicate**: skip if same `(date, service, provider)` already detected

### Built-in demo anomalies (seed data)

| Day | Provider | Service | Spike Amount | Baseline |
|---|---|---|---|---|
| Day -3 | AWS | EC2 | $580 | ~$165 |
| Day -10 | Azure | Blob Storage | $205 | ~$69 |
| Day -18 | GCP | BigQuery | $179 | ~$47 |

---

## REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Health status, uptime, data mode |
| GET | `/api/ready` | Readiness checks |
| GET | `/api/dashboard` | KPIs, daily spending chart, service breakdown |
| GET | `/api/billing` | Paginated billing records |
| POST | `/api/anomalies/detect` | Run anomaly detection engine |
| GET | `/api/anomalies` | List detected anomalies |
| GET | `/api/resources` | Cloud resource inventory with savings estimates |
| GET | `/api/alerts` | Alert history |
| POST | `/api/alerts/test` | Create a simulated test alert |

---

## Limitations

> [!IMPORTANT]
> **MongoDB persistence is NOT implemented.** `DATA_MODE=mongodb` is a recognised config value, but Mongoose models and DB connection logic have not been built. The app will fall back to in-memory mock mode regardless. The README will be updated when persistence is added.

- **Mock data only.** All billing records, resources, and anomalies are deterministic, in-memory seed data. No real cloud API (AWS Cost Explorer, Azure Cost Management, GCP Billing) is called.
- **Anomalies reset on restart.** The MockStore is re-initialised on every server start. Detected anomalies are not persisted.
- **Alerts are simulated.** No email, Slack, or PagerDuty integrations exist. All `deliveryStatus` values are `"simulated"`.
- **No auth layer.** This is a portfolio demo with no login, API keys, or RBAC.
- No real cloud credentials are ever required or stored.

---

## Scripts

| Directory | Command | Action |
|---|---|---|
| `backend/` | `npm run dev` | Start with tsx watch (hot reload) |
| `backend/` | `npm test` | Run Vitest suite (26 tests) |
| `backend/` | `npm run build` | Compile TypeScript to `dist/` |
| `frontend/` | `npm run dev` | Start Vite dev server |
| `frontend/` | `npm run build` | Production build to `dist/` |
| `frontend/` | `npm run preview` | Preview production build locally |

---

## Windows PowerShell — Complete Startup Commands

Open **two PowerShell terminals** from the workspace root:

```powershell
# Terminal 1 — Backend (runs on port 4000)
cd backend
cp .env.example .env   # First time only
npm install            # First time only
npm run dev
```

```powershell
# Terminal 2 — Frontend (runs on port 5173)
cd frontend
npm install            # First time only
npm run dev
```

Then open **http://localhost:5173** in your browser.

```powershell
# Run backend tests (from project root)
cd backend
npm test
```

> **Note:** Both `npm install` steps must complete before starting the servers. Servers must start in the order shown — backend first, then frontend.
