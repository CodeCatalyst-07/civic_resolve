import crypto from 'node:crypto';
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import { apiError, Role } from '@civicresolve/shared';
import type { Config } from '../../config.js';

/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Express {
    interface Request {
      demoRole?: Role;
    }
  }
}
/* eslint-enable @typescript-eslint/no-namespace */

/**
 * Constant-time comparison between two strings.
 * Hashes both strings with SHA-256 to guarantee equal-length 32-byte buffers
 * before invoking crypto.timingSafeEqual, preventing any timing leaks based on string length.
 */
export function safeCompareCodes(provided: string, expected: string): boolean {
  const hashProvided = crypto.createHash('sha256').update(provided).digest();
  const hashExpected = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(hashProvided, hashExpected);
}

/**
 * Middleware that extracts the demo role from X-Demo-Role header.
 * Defaults to 'citizen' if missing. Rejects unrecognized values with 400.
 */
export function demoRoleMiddleware(req: Request, res: Response, next: NextFunction): void {
  const roleHeader = req.header('X-Demo-Role');

  if (!roleHeader || roleHeader.trim() === '') {
    req.demoRole = Role.CITIZEN;
    next();
    return;
  }

  const normalized = roleHeader.trim().toLowerCase();
  if (normalized === 'citizen') {
    req.demoRole = Role.CITIZEN;
    next();
  } else if (normalized === 'authority') {
    req.demoRole = Role.AUTHORITY;
    next();
  } else {
    res.status(400).json(
      apiError('validation_failed', 'Invalid X-Demo-Role header. Must be "citizen" or "authority".')
    );
  }
}

/**
 * Route-level guard enforcing that the request has authority privileges.
 * If DEMO_AUTHORITY_CODE is configured in environment, validates X-Demo-Authority-Code in constant time.
 */
export function requireAuthority(config: Config): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.demoRole !== Role.AUTHORITY) {
      res.status(403).json(
        apiError('forbidden', 'Authority role required to access this endpoint.')
      );
      return;
    }

    if (config.DEMO_AUTHORITY_CODE && config.DEMO_AUTHORITY_CODE.trim() !== '') {
      const codeHeader = req.header('X-Demo-Authority-Code');
      if (!codeHeader || !safeCompareCodes(codeHeader, config.DEMO_AUTHORITY_CODE)) {
        res.status(403).json(
          apiError('forbidden', 'Invalid or missing authority access code.')
        );
        return;
      }
    }

    next();
  };
}
