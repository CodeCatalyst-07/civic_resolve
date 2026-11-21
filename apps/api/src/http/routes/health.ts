import { Router } from 'express';
import type { AppContainer } from '../../compose.js';

export function createHealthRouter(container: AppContainer): Router {
  const router = Router();

  /**
   * Health check endpoint exposing runtime configuration and driver readiness without secrets.
   */
  router.get('/', (_req, res) => {
    const hasAuthorityCode = Boolean(
      container.config.DEMO_AUTHORITY_CODE &&
        container.config.DEMO_AUTHORITY_CODE.trim().length > 0
    );

    res.status(200).json({
      status: 'ok',
      aiProvider: container.config.AI_PROVIDER,
      aiModel: container.aiProvider.model,
      repoDriver: container.config.REPO_DRIVER,
      geocoding: typeof container.geocoding.isAvailable === 'function' ? container.geocoding.isAvailable() : false,
      authorityGate: hasAuthorityCode ? 'code' : 'open',
      time: new Date().toISOString(),
    });
  });

  return router;
}
