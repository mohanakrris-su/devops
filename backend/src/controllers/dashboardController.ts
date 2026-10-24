import type { Request, Response } from 'express';
import { mockStore } from '../data/mockStore';
import type { DashboardResponse, ServiceBreakdown } from '../types';

export function getDashboard(_req: Request, res: Response): void {
  const totalSpend = mockStore.getTotalSpend();
  const budgetTotal = mockStore.getBudgetTotal();
  const currentPeriodSpend = mockStore.getCurrentPeriodSpend();
  const anomalyCount = mockStore.getAnomalies({}).length;
  const activeAlerts = mockStore.getAlerts().filter((a) => !a.acknowledged).length;
  const resources = mockStore.getResources();
  const potentialSavings = resources.reduce((s, r) => s + r.potentialSavings, 0);

  const serviceRaw = mockStore.getServiceBreakdown();
  const serviceTotal = serviceRaw.reduce((s, r) => s + r.amount, 0);
  const serviceBreakdown: ServiceBreakdown[] = serviceRaw.map((s) => ({
    service: s.service,
    provider: s.provider as ServiceBreakdown['provider'],
    amount: Math.round(s.amount * 100) / 100,
    percentage: Math.round((s.amount / serviceTotal) * 10000) / 100,
  }));

  const response: DashboardResponse = {
    kpis: {
      totalSpend: Math.round(totalSpend * 100) / 100,
      currentPeriodSpend: Math.round(currentPeriodSpend * 100) / 100,
      budgetTotal,
      budgetUsedPercent: Math.round((currentPeriodSpend / budgetTotal) * 10000) / 100,
      anomalyCount,
      activeAlerts,
      potentialSavings: Math.round(potentialSavings * 100) / 100,
    },
    dailySpending: mockStore.getDailySpending(),
    serviceBreakdown,
  };

  res.json(response);
}
