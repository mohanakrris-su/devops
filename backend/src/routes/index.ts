import { Router } from 'express';
import { getHealth, getReady } from '../controllers/healthController';
import { getDashboard } from '../controllers/dashboardController';
import { getBilling } from '../controllers/billingController';
import { getAnomalies, runDetection } from '../controllers/anomalyController';
import { getResources } from '../controllers/resourceController';
import { getAlerts, postTestAlert } from '../controllers/alertController';

const router = Router();

// Health
router.get('/health', getHealth);
router.get('/ready', getReady);

// Dashboard
router.get('/dashboard', getDashboard);

// Billing
router.get('/billing', getBilling);

// Anomalies
router.get('/anomalies', getAnomalies);
router.post('/anomalies/detect', runDetection);

// Resources
router.get('/resources', getResources);

// Alerts
router.get('/alerts', getAlerts);
router.post('/alerts/test', postTestAlert);

export default router;
