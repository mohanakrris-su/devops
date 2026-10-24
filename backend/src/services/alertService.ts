/**
 * Alert Service
 *
 * Creates alerts for detected anomalies with deduplication.
 * Uses a simulated delivery provider — clearly labelled.
 */

import type { Alert, Anomaly, AlertSeverity, AlertType, DeliveryStatus } from '../types';
import { config } from '../utils/config';
import { mockStore } from '../data/mockStore';

let _alertSeq = 0;
function alertId(): string {
  return `alert-${String(++_alertSeq).padStart(4, '0')}`;
}

/**
 * Create an alert from an anomaly.
 * Returns null if a duplicate already exists within the dedup window.
 */
export function createAnomalyAlert(anomaly: Anomaly): Alert | null {
  if (mockStore.hasDuplicateAlert(anomaly.id, config.alert.dedupWindowHours)) {
    return null;
  }

  const alert: Alert = {
    id: alertId(),
    type: 'anomaly',
    severity: anomaly.severity,
    title: `Cost anomaly: ${anomaly.provider} ${anomaly.service}`,
    message:
      `Detected $${anomaly.detectedAmount.toFixed(2)} spending on ${anomaly.date} ` +
      `(baseline: $${anomaly.expectedBaseline.toFixed(2)}, +${anomaly.percentageDifference.toFixed(0)}%). ` +
      anomaly.explanation,
    source: anomaly.provider,
    timestamp: new Date().toISOString(),
    deliveryStatus: 'simulated' as DeliveryStatus,
    deliveryChannel: 'in-app (simulated)',
    anomalyId: anomaly.id,
    acknowledged: false,
  };

  mockStore.addAlert(alert);
  return alert;
}

/**
 * Create a test alert (for the POST /api/alerts/test endpoint).
 */
export function createTestAlert(
  severity: AlertSeverity = 'low',
  message?: string
): Alert {
  const alert: Alert = {
    id: alertId(),
    type: 'test' as AlertType,
    severity,
    title: 'Test alert',
    message: message || 'This is a simulated test alert created via the API.',
    source: 'CostWatch',
    timestamp: new Date().toISOString(),
    deliveryStatus: 'simulated' as DeliveryStatus,
    deliveryChannel: 'in-app (simulated)',
    acknowledged: false,
  };

  mockStore.addAlert(alert);
  return alert;
}

/**
 * Create alerts for a batch of anomalies, skipping duplicates.
 */
export function createAlertsForAnomalies(anomalies: Anomaly[]): Alert[] {
  const created: Alert[] = [];

  for (const anomaly of anomalies) {
    const alert = createAnomalyAlert(anomaly);
    if (alert) created.push(alert);
  }

  return created;
}
