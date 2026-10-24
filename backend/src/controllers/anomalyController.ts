import type { Request, Response } from 'express';
import { mockStore } from '../data/mockStore';
import { detectAnomalies } from '../services/anomalyDetection';
import { createAlertsForAnomalies } from '../services/alertService';
import type { AnomalyFilters, AlertSeverity, CloudProvider, DetectionResult } from '../types';

const validSeverities = new Set<AlertSeverity>(['low', 'medium', 'high']);
const validProviders = new Set<CloudProvider>(['AWS', 'Azure', 'GCP']);

export function getAnomalies(req: Request, res: Response): void {
  const { startDate, endDate, provider, service, severity } = req.query;

  if (severity && !validSeverities.has(severity as AlertSeverity)) {
    res.status(400).json({
      error: 'ValidationError',
      message: `Invalid severity. Must be one of: ${[...validSeverities].join(', ')}`,
      statusCode: 400,
    });
    return;
  }
  if (provider && !validProviders.has(provider as CloudProvider)) {
    res.status(400).json({
      error: 'ValidationError',
      message: `Invalid provider. Must be one of: ${[...validProviders].join(', ')}`,
      statusCode: 400,
    });
    return;
  }

  const filters: AnomalyFilters = {
    startDate: startDate as string | undefined,
    endDate: endDate as string | undefined,
    provider: provider as CloudProvider | undefined,
    service: service as string | undefined,
    severity: severity as AlertSeverity | undefined,
  };

  const anomalies = mockStore.getAnomalies(filters);
  res.json({ data: anomalies, total: anomalies.length });
}

export function runDetection(_req: Request, res: Response): void {
  const newAnomalies = detectAnomalies();

  // Persist new anomalies
  for (const anomaly of newAnomalies) {
    mockStore.addAnomaly(anomaly);
  }

  // Create alerts (with dedup)
  const alerts = createAlertsForAnomalies(newAnomalies);

  const result: DetectionResult = {
    anomaliesDetected: newAnomalies.length,
    newAnomalies,
    alertsCreated: alerts.length,
    message:
      newAnomalies.length > 0
        ? `Detected ${newAnomalies.length} anomalies and created ${alerts.length} alerts.`
        : 'No new anomalies detected. Spending is within normal thresholds.',
    timestamp: new Date().toISOString(),
  };

  res.status(newAnomalies.length > 0 ? 201 : 200).json(result);
}
