import type { Request, Response } from 'express';
import { mockStore } from '../data/mockStore';

export function getResources(_req: Request, res: Response): void {
  const resources = mockStore.getResources();
  const idle = resources.filter((r) => r.status === 'idle');
  const unattached = resources.filter((r) => r.status === 'unattached');
  const active = resources.filter((r) => r.status === 'active');
  const totalSavings = resources.reduce((s, r) => s + r.potentialSavings, 0);

  res.json({
    data: resources,
    total: resources.length,
    summary: {
      idle: idle.length,
      unattached: unattached.length,
      active: active.length,
      potentialMonthlySavings: Math.round(totalSavings * 100) / 100,
      note: 'All resources and savings estimates are simulated.',
    },
  });
}
