import type { Request, Response } from 'express';

/**
 * 404 Not Found handler returning a consistent, generic JSON response.
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found.',
  });
}
