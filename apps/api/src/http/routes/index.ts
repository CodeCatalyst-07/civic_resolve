import { Router } from 'express';
import { CATEGORIES, URGENCIES, STATUSES, ROLES } from '@civicresolve/shared';
import type { Config } from '../../config.js';

/**
 * Creates the primary API router for CivicResolve.
 *
 * @param config - The validated application configuration
 * @returns Express router configured with /health and /meta endpoints
 */
export function createApiRouter(config: Config): Router {
  const router = Router();

  /**
   * Health check endpoint exposing operational state without sensitive secrets.
   */
  router.get('/health', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      aiProvider: config.AI_PROVIDER,
      repoDriver: config.REPO_DRIVER,
      time: new Date().toISOString(),
    });
  });

  /**
   * Metadata endpoint exposing domain taxonomies and enums.
   */
  router.get('/meta', (_req, res) => {
    res.status(200).json({
      categories: CATEGORIES,
      urgencies: URGENCIES,
      statuses: STATUSES,
      roles: ROLES,
    });
  });

  return router;
}
