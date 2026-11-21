import { Router } from 'express';
import { apiSuccess } from '@civicresolve/shared';
import { WARDS } from '../../data/wards.js';

export function createWardsRouter(): Router {
  const router = Router();

  /**
   * Returns municipal wards and their landmark reference points.
   */
  router.get('/', (_req, res) => {
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.status(200).json(apiSuccess(WARDS));
  });

  return router;
}
