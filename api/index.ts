import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Request, Response } from 'express';
import { createApp, createDegradedApp } from '@civicresolve/api/app';
import { loadConfig, type Config } from '@civicresolve/api/config';
import { buildContainer } from '@civicresolve/api/compose';

let appInstance: ReturnType<typeof createApp> | null = null;

function getApp(): ReturnType<typeof createApp> {
  if (appInstance) {
    return appInstance;
  }

  let config: Config;
  try {
    config = loadConfig();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[CivicResolve Configuration Startup Error]:', msg);
    appInstance = createDegradedApp('config_invalid', 'Invalid or missing environment configuration');
    return appInstance;
  }

  try {
    const container = buildContainer(config);
    appInstance = createApp(config, container);
    return appInstance;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[CivicResolve Repository Startup Error]:', msg);
    appInstance = createDegradedApp('repo_unavailable', 'Persistent repository failed to initialize');
    return appInstance;
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
      res.statusCode = 503;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          error: {
            code: 'service_unavailable',
            message: 'CivicResolve serverless function caught an unexpected runtime error.',
          },
        })
      );
    }
  }
}
