import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { apiError, apiSuccess } from '@civicresolve/shared';
import type { AppContainer } from '../../compose.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

export function createGeocodeRouter(container: AppContainer): Router {
  const router = Router();

  const geocodeLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: apiError('rate_limited', 'Geocoding request rate limit exceeded (max 30/min).'),
  });

  router.use(geocodeLimiter);

  /**
   * Geocodes an address string to geographic coordinates using Google Maps or null fallback.
   */
  router.get(
    '/',
    asyncHandler(async (req, res) => {
      const address = typeof req.query.address === 'string' ? req.query.address.trim() : '';

      if (!address) {
        res.status(400).json(apiError('validation_failed', 'Query parameter "address" is required.'));
        return;
      }

      const isGeocodingAvailable =
        typeof container.geocoding.isAvailable === 'function'
          ? container.geocoding.isAvailable()
          : false;

      if (!isGeocodingAvailable) {
        res.status(200).json(
          apiSuccess({
            available: false,
            message: 'Server-side Google Maps geocoding is not configured.',
          })
        );
        return;
      }

      const result = await container.geocoding.geocode(address);
      if (!result.ok) {
        if (result.error.kind === 'not_found') {
          res.status(404).json(apiError('not_found', result.error.message));
          return;
        }
        if (result.error.kind === 'rate_limited') {
          res.status(429).json(apiError('rate_limited', result.error.message));
          return;
        }
        res.status(502).json(apiError('internal_error', result.error.message));
        return;
      }

      res.status(200).json(
        apiSuccess({
          available: true,
          location: result.value,
        })
      );
    })
  );

  return router;
}
