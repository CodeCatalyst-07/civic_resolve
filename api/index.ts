import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Request, Response } from 'express';
import { createApp } from '@civicresolve/api/app';
import { loadConfig } from '@civicresolve/api/config';
import { buildContainer } from '@civicresolve/api/compose';

let appInstance: ReturnType<typeof createApp> | null = null;
let startupError: string | null = null;

function getApp(): ReturnType<typeof createApp> {
  if (appInstance) {
    return appInstance;
  }

  try {
    const config = loadConfig();
    const container = buildContainer(config);
    appInstance = createApp(config, container);
    return appInstance;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    startupError = msg;
    console.error('[CivicResolve API Startup Error]:', msg);

    // Safe fallback to in-memory mode so serverless function remains operational
    try {
      const fallbackConfig = loadConfig({
        NODE_ENV: 'production',
        REPO_DRIVER: 'memory',
        AI_PROVIDER: 'mock',
        AUTO_SEED: 'true',
      });
      const fallbackContainer = buildContainer(fallbackConfig);
      appInstance = createApp(fallbackConfig, fallbackContainer);
      return appInstance;
    } catch (fallbackErr: unknown) {
      const fallbackMsg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
      console.error('[CivicResolve Fallback Startup Critical Error]:', fallbackMsg);
      throw fallbackErr;
    }
  }
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    // Normalise incoming URL across Vercel rewrite headers
    const rawUrl = req.url || '/';
    const matched =
      (req.headers['x-matched-path'] as string | undefined) ||
      (req.headers['x-vercel-matched-path'] as string | undefined);

    if (typeof matched === 'string' && matched.startsWith('/api')) {
      req.url = matched;
    } else if (!rawUrl.startsWith('/api')) {
      req.url = `/api${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;
    }

    const app = getApp();
    return (app as unknown as (req: Request, res: Response) => void)(req as Request, res as Response);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[CivicResolve Serverless Handler Error]:', msg);

    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          error: 'Internal Server Error',
          message: msg,
          startupError,
        })
      );
    }
  }
}
