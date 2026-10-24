import type { Request, Response, NextFunction } from 'express';
import type { ApiError } from '../types';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('[CostWatch Error]', err.message);

  const statusCode = (err as unknown as { statusCode?: number }).statusCode || 500;
  const response: ApiError = {
    error: err.name || 'InternalServerError',
    message: err.message || 'An unexpected error occurred',
    statusCode,
  };

  res.status(statusCode).json(response);
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({
    error: 'NotFound',
    message: 'The requested endpoint does not exist',
    statusCode: 404,
  } satisfies ApiError);
}
