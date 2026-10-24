import type { Request, Response } from 'express';
import { mockStore } from '../data/mockStore';
import type { BillingFilters, CloudProvider, BillingStatus } from '../types';

const validProviders = new Set<CloudProvider>(['AWS', 'Azure', 'GCP']);
const validStatuses = new Set<BillingStatus>(['processed', 'pending', 'estimated']);

export function getBilling(req: Request, res: Response): void {
  const { startDate, endDate, provider, service, status, page, limit } = req.query;

  // Validate
  if (provider && !validProviders.has(provider as CloudProvider)) {
    res.status(400).json({
      error: 'ValidationError',
      message: `Invalid provider. Must be one of: ${[...validProviders].join(', ')}`,
      statusCode: 400,
    });
    return;
  }
  if (status && !validStatuses.has(status as BillingStatus)) {
    res.status(400).json({
      error: 'ValidationError',
      message: `Invalid status. Must be one of: ${[...validStatuses].join(', ')}`,
      statusCode: 400,
    });
    return;
  }

  const filters: BillingFilters = {
    startDate: startDate as string | undefined,
    endDate: endDate as string | undefined,
    provider: provider as CloudProvider | undefined,
    service: service as string | undefined,
    status: status as BillingStatus | undefined,
    page: page ? parseInt(page as string, 10) : 1,
    limit: limit ? Math.min(parseInt(limit as string, 10), 100) : 20,
  };

  const result = mockStore.getBilling(filters);
  res.json(result);
}
