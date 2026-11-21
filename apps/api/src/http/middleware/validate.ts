import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { type ZodType, ZodError } from 'zod';
import { apiError } from '@civicresolve/shared';

function formatZodError(error: ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.join('.') || 'input';
      return `${path}: ${issue.message}`;
    })
    .join('; ');
}

/**
 * Express middleware that validates req.body against a Zod schema.
 * Replaces req.body with the sanitized and stripped output on success.
 * Returns 400 with a standard API error envelope on failure.
 */
export function validateBody<T>(schema: ZodType<T>): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json(apiError('validation_failed', formatZodError(result.error)));
      return;
    }
    req.body = result.data;
    next();
  };
}

/**
 * Express middleware that validates req.query against a Zod schema.
 * Replaces req.query with the sanitized output on success.
 */
export function validateQuery<T>(schema: ZodType<T>): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      res.status(400).json(apiError('validation_failed', formatZodError(result.error)));
      return;
    }
    req.query = result.data as unknown as Request['query'];
    next();
  };
}

/**
 * Express middleware that validates req.params against a Zod schema.
 */
export function validateParams<T>(schema: ZodType<T>): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      res.status(400).json(apiError('validation_failed', formatZodError(result.error)));
      return;
    }
    req.params = result.data as unknown as Request['params'];
    next();
  };
}
