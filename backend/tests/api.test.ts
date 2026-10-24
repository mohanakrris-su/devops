import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';

// Run detection once before anomaly/alert tests so the store is populated
let detectionResult: { anomaliesDetected: number; newAnomalies: unknown[]; alertsCreated: number };

beforeAll(async () => {
  const res = await request(app).post('/api/anomalies/detect');
  detectionResult = res.body;
});

describe('API Endpoints', () => {
  // ─── Health & Readiness ─────────────────────────────────────────────

  it('GET /api/health returns healthy status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.dataMode).toBe('mock');
    expect(res.body).toHaveProperty('uptime');
    expect(res.body).toHaveProperty('version');
  });

  it('GET /api/ready returns readiness checks', async () => {
    const res = await request(app).get('/api/ready');
    expect(res.status).toBe(200);
    expect(res.body.ready).toBe(true);
    expect(res.body.checks.dataStore.status).toBe('ok');
  });

  // ─── Dashboard ──────────────────────────────────────────────────────

  it('GET /api/dashboard returns KPIs and chart data', async () => {
    const res = await request(app).get('/api/dashboard');
    expect(res.status).toBe(200);
    expect(res.body.kpis).toBeDefined();
    expect(res.body.kpis.totalSpend).toBeGreaterThan(0);
    expect(res.body.kpis.budgetTotal).toBe(30000);
    expect(res.body.dailySpending).toBeDefined();
    expect(res.body.dailySpending.length).toBeGreaterThan(0);
    expect(res.body.serviceBreakdown).toBeDefined();
    expect(res.body.serviceBreakdown.length).toBeGreaterThan(0);
  });

  // ─── Billing ────────────────────────────────────────────────────────

  it('GET /api/billing returns paginated records', async () => {
    const res = await request(app).get('/api/billing');
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.total).toBeGreaterThan(0);
    expect(res.body.page).toBe(1);
    expect(res.body.totalPages).toBeGreaterThan(0);
  });

  it('GET /api/billing filters by provider', async () => {
    const res = await request(app).get('/api/billing?provider=AWS');
    expect(res.status).toBe(200);
    expect(res.body.data.every((r: { provider: string }) => r.provider === 'AWS')).toBe(true);
  });

  it('GET /api/billing returns 400 for invalid provider', async () => {
    const res = await request(app).get('/api/billing?provider=INVALID');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('ValidationError');
  });

  // ─── Anomalies ──────────────────────────────────────────────────────

  it('POST /api/anomalies/detect runs detection and returns results', async () => {
    // Detection was already run in beforeAll — running again returns 0 new (deduped)
    expect(detectionResult).toBeDefined();
    expect(detectionResult).toHaveProperty('anomaliesDetected');
    expect(detectionResult).toHaveProperty('newAnomalies');
    expect(detectionResult).toHaveProperty('alertsCreated');
    expect(detectionResult.anomaliesDetected).toBeGreaterThanOrEqual(3);
  });

  it('GET /api/anomalies returns detected anomalies', async () => {
    const res = await request(app).get('/api/anomalies');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(3);
  });

  it('POST /api/anomalies/detect again does NOT create duplicate anomalies', async () => {
    const firstRes = await request(app).get('/api/anomalies');
    const firstCount = firstRes.body.total;

    // Run detection again
    const res = await request(app).post('/api/anomalies/detect');
    expect(res.body.anomaliesDetected).toBe(0); // all already detected

    const secondRes = await request(app).get('/api/anomalies');
    expect(secondRes.body.total).toBe(firstCount);
  });

  it('GET /api/anomalies returns 400 for invalid severity', async () => {
    const res = await request(app).get('/api/anomalies?severity=extreme');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('ValidationError');
  });

  // ─── Resources ──────────────────────────────────────────────────────

  it('GET /api/resources returns simulated resources', async () => {
    const res = await request(app).get('/api/resources');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.summary).toBeDefined();
    expect(res.body.summary.idle).toBeGreaterThan(0);
    expect(res.body.summary.unattached).toBeGreaterThan(0);
    expect(res.body.data.every((r: { simulated: boolean }) => r.simulated === true)).toBe(true);
  });

  // ─── Alerts ─────────────────────────────────────────────────────────

  it('GET /api/alerts returns alert history', async () => {
    const res = await request(app).get('/api/alerts');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0); // detection created alerts
    expect(res.body.data[0].deliveryStatus).toBe('simulated');
  });

  it('POST /api/alerts/test creates a simulated test alert', async () => {
    const res = await request(app)
      .post('/api/alerts/test')
      .send({ severity: 'medium', message: 'Testing alert system' });

    expect(res.status).toBe(201);
    expect(res.body.alert.type).toBe('test');
    expect(res.body.alert.severity).toBe('medium');
    expect(res.body.alert.deliveryChannel).toContain('simulated');
    expect(res.body.note).toContain('simulated');
  });

  it('POST /api/alerts/test returns 400 for invalid severity', async () => {
    const res = await request(app)
      .post('/api/alerts/test')
      .send({ severity: 'extreme' });

    expect(res.status).toBe(400);
  });

  // ─── Mock mode (no MongoDB) ─────────────────────────────────────────

  it('operates entirely without MongoDB', async () => {
    // Verify health shows mock mode
    const health = await request(app).get('/api/health');
    expect(health.body.dataMode).toBe('mock');

    // Verify readiness
    const ready = await request(app).get('/api/ready');
    expect(ready.body.ready).toBe(true);
    expect(ready.body.checks.dataStore.message).toContain('mock');

    // All critical endpoints work
    const dashboard = await request(app).get('/api/dashboard');
    expect(dashboard.status).toBe(200);

    const billing = await request(app).get('/api/billing');
    expect(billing.status).toBe(200);
  });

  // ─── 404 ────────────────────────────────────────────────────────────

  it('returns 404 for unknown endpoints', async () => {
    const res = await request(app).get('/api/nonexistent');
    expect(res.status).toBe(404);
  });
});
