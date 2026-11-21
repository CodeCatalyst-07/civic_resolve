import type { Request, Response, NextFunction } from 'express';
import { logger } from '../../lib/logger.js';

interface HttpError extends Error {
  status?: number;
  statusCode?: number;
  type?: string;
}

/**
 * Centralized error handler returning generic messages to clients while logging details server-side.
 */
export function errorHandler(
  err: HttpError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Handle payload too large from express.json limit
  if (err.type === 'entity.too.large' || err.status === 413) {
    logger.warn('Request payload exceeded size limit', {
      requestId: req.id,
      path: req.path,
      method: req.method,
    });
    res.status(413).json({
      error: 'Payload Too Large',
      message: 'Request payload exceeds the permitted 20kb limit.',
    });
    return;
  }

  // Handle malformed JSON body
  if (err instanceof SyntaxError && 'status' in err && err.status === 400) {
    logger.warn('Malformed JSON payload received', {
      requestId: req.id,
      path: req.path,
    });
    res.status(400).json({
      error: 'Bad Request',
      message: 'Malformed JSON payload.',
    });
    return;
  }

  // Generic internal server error for all other exceptions
  logger.error('Unhandled server error', {
    requestId: req.id,
    method: req.method,
    path: req.path,
    error: err,
  });

  res.status(500).json({
    error: 'Internal Server Error',
    message: 'An unexpected error occurred. Please try again later.',
  });
}
