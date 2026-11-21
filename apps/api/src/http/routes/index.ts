import { Router } from 'express';
import type { Config } from '../../config.js';
import { type AppContainer, buildContainer } from '../../compose.js';
import { demoRoleMiddleware } from '../middleware/role.js';
import { createHealthRouter } from './health.js';
import { createMetaRouter } from './meta.js';
import { createWardsRouter } from './wards.js';
import { createGeocodeRouter } from './geocode.js';
import { createReportsRouter } from './reports.js';
import { createTicketsRouter } from './tickets.js';
import { createStatsRouter } from './stats.js';
import { createAuthorityRouter } from './authority.js';

/**
 * Creates the primary API router for CivicResolve and mounts all modular sub-routers.
 *
 * @param config - The validated application configuration
 * @param container - Composition container (built if not provided)
 * @returns Express router configured with all CivicResolve endpoints
 */
export function createApiRouter(config: Config, container?: AppContainer): Router {
  const effectiveContainer = container ?? buildContainer(config);
  const router = Router();

  // Attach demo role middleware to resolve X-Demo-Role on all /api requests
  router.use(demoRoleMiddleware);

  // Mount sub-routers
  router.use('/health', createHealthRouter(effectiveContainer));
  router.use('/meta', createMetaRouter());
  router.use('/wards', createWardsRouter());
  router.use('/geocode', createGeocodeRouter(effectiveContainer));
  router.use('/reports', createReportsRouter(effectiveContainer));
  router.use('/tickets', createTicketsRouter(effectiveContainer));
  router.use('/stats', createStatsRouter(effectiveContainer));
  router.use('/authority', createAuthorityRouter(effectiveContainer));

  return router;
}
