import { Router } from 'express';
import { apiSuccess, apiError } from '@civicresolve/shared';
import type { AppContainer } from '../../compose.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

export function createStatsRouter(container: AppContainer): Router {
  const router = Router();

  /**
   * Public system statistics endpoint cached for 30 seconds.
   */
  router.get(
    '/',
    asyncHandler(async (_req, res) => {
      res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=30');

      const result = await container.ticketService.getStats();
      if (!result.ok) {
        res.status(500).json(apiError('internal_error', result.error.message));
        return;
      }

      res.status(200).json(apiSuccess(result.value));
    })
  );

  return router;
}
