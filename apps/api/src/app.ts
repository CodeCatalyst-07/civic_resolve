import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import type { Config } from './config.js';
import type { AppContainer } from './compose.js';
import { requestIdMiddleware } from './http/middleware/requestId.js';
import { notFoundHandler } from './http/middleware/notFoundHandler.js';
import { errorHandler } from './http/middleware/errorHandler.js';
import { createApiRouter } from './http/routes/index.js';

/**
 * Builds and configures the Express application with security, middleware, and routes.
 * Decoupled from app.listen so it can run both locally and as a Vercel serverless function.
 *
 * @param config - The frozen application configuration
 * @param container - Optional pre-built composition container (for test overrides or singleton re-use)
 * @returns Configured Express application instance
 */
export function createApp(config: Config, container?: AppContainer): express.Express {
  const app = express();

  // Trust proxy for reverse proxies / serverless deployment (Vercel)
  app.set('trust proxy', 1);

  // Security headers
  app.use(helmet());

  // Enforce JSON body limit of 20kb
  app.use(express.json({ limit: '20kb' }));

  // Attach unique request ID
  app.use(requestIdMiddleware);

  // Configure CORS only if ALLOWED_ORIGINS is provided (disabled when empty)
  if (config.ALLOWED_ORIGINS && config.ALLOWED_ORIGINS.trim().length > 0) {
    const allowed = config.ALLOWED_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0);

    if (allowed.length > 0) {
      app.use(cors({ origin: allowed, credentials: true }));
    }
  }

  // Rate limiting applied specifically on /api
  const apiLimiter = rateLimit({
    windowMs: config.RATE_LIMIT_WINDOW_MS,
    max: config.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
    },
  });
  app.use('/api', apiLimiter);

  // Mount API routes under /api
  app.use('/api', createApiRouter(config, container));

  // Catch-all 404 handler for undefined routes
  app.use(notFoundHandler);

  // Centralized error handler
  app.use(errorHandler);

  return app;
}
