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

  // Disable x-powered-by before helmet to avoid removeHeader compatibility errors in serverless
  app.disable('x-powered-by');

  // Security headers
  app.use(helmet({ xPoweredBy: false }));

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

  // Rate limiting applied specifically on /api with safe keyGenerator for serverless environments
  const apiLimiter = rateLimit({
    windowMs: config.RATE_LIMIT_WINDOW_MS,
    max: config.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: express.Request) => {
      const forwarded = req.headers['x-forwarded-for'];
      if (typeof forwarded === 'string' && forwarded.length > 0) {
        return forwarded.split(',')[0]?.trim() || '127.0.0.1';
      }
      return req.socket?.remoteAddress || '127.0.0.1';
    },
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

/**
 * Builds a resilient Express application for degraded operational states
 * (e.g. invalid environment configuration or unavailable persistent repository).
 * Responds to /api/health with a safe degraded diagnostic (no secrets)
 * and all other /api/* routes with a 503 Service Unavailable envelope.
 */
export function createDegradedApp(
  errorCode: 'config_invalid' | 'repo_unavailable',
  message: string
): express.Express {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(helmet({ xPoweredBy: false }));
  app.use(express.json({ limit: '20kb' }));
  app.use(requestIdMiddleware);

  const safeMessage = message
    .replace(/AIzaSy[A-Za-z0-9_-]+/g, '[REDACTED_KEY]')
    .replace(/-----BEGIN[A-Z\s]+-----[\s\S]+?-----END[A-Z\s]+-----/g, '[REDACTED_PEM]');

  const healthHandler: express.RequestHandler = (_req, res) => {
    res.status(200).json({
      status: 'degraded',
      error: {
        code: errorCode,
        message: safeMessage,
      },
      time: new Date().toISOString(),
    });
  };

  app.get('/api/health', healthHandler);
  app.get('/health', healthHandler);

  app.use((_req, res) => {
    res.status(503).json({
      error: {
        code: 'service_unavailable',
        message: `CivicResolve API is currently in degraded state (${errorCode}): ${safeMessage}. Inspect /api/health for diagnostic status.`,
      },
    });
  });

  return app;
}
