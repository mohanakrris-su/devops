import type { Request, Response } from 'express';
import { config } from '../utils/config';
import type { HealthResponse, ReadyResponse } from '../types';

const startTime = Date.now();

export function getHealth(_req: Request, res: Response): void {
  const response: HealthResponse = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: Math.round((Date.now() - startTime) / 1000),
    version: '1.0.0',
    dataMode: config.dataMode,
  };

  res.json(response);
}

export function getReady(_req: Request, res: Response): void {
  const checks: ReadyResponse['checks'] = {
    dataStore: {
      status: config.dataMode === 'mock' ? 'ok' : 'unavailable',
      message:
        config.dataMode === 'mock'
          ? 'In-memory mock store is ready'
          : 'MongoDB connection not configured in this phase',
    },
    anomalyEngine: {
      status: 'ok',
      message: 'Anomaly detection service is ready',
    },
    alertService: {
      status: 'ok',
      message: 'Alert service is ready (simulated delivery)',
    },
  };

  const ready = Object.values(checks).every((c) => c.status === 'ok');

  const response: ReadyResponse = { ready, checks };
  res.status(ready ? 200 : 503).json(response);
}
