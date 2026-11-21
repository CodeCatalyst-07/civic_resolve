import type { Request, Response } from 'express';
import { createApp } from '../apps/api/src/app.js';
import { loadConfig } from '../apps/api/src/config.js';
import { buildContainer } from '../apps/api/src/compose.js';

let appInstance: ReturnType<typeof createApp> | null = null;
let initError: Error | null = null;

function getApp() {
  if (appInstance) return appInstance;
  if (initError) throw initError;

  try {
    const config = loadConfig();
    const container = buildContainer(config);
    appInstance = createApp(config, container);
    return appInstance;
  } catch (err: unknown) {
    initError = err instanceof Error ? err : new Error(String(err));
    console.error('[CivicResolve API Startup Error]:', initError);
    throw initError;
  }
}

export default function handler(req: Request, res: Response): void {
  try {
    const app = getApp();
    app(req, res);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: `CivicResolve API failed to initialize: ${message}`,
    });
  }
}

