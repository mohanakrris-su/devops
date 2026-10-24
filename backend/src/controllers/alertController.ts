import type { Request, Response } from 'express';
import { mockStore } from '../data/mockStore';
import { createTestAlert } from '../services/alertService';
import type { AlertSeverity } from '../types';

const validSeverities = new Set<AlertSeverity>(['low', 'medium', 'high']);

export function getAlerts(_req: Request, res: Response): void {
  const alerts = mockStore.getAlerts();
  res.json({ data: alerts, total: alerts.length });
}

export function postTestAlert(req: Request, res: Response): void {
  const severity = (req.body?.severity as AlertSeverity) || 'low';
  const message = req.body?.message as string | undefined;

  if (!validSeverities.has(severity)) {
    res.status(400).json({
      error: 'ValidationError',
      message: `Invalid severity. Must be one of: ${[...validSeverities].join(', ')}`,
      statusCode: 400,
    });
    return;
  }

  const alert = createTestAlert(severity, message);
  res.status(201).json({
    alert,
    note: 'This is a simulated test alert. No real notification was sent.',
  });
}
