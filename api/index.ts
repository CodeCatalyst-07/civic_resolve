import { createApp } from '../apps/api/src/app.js';
import { loadConfig } from '../apps/api/src/config.js';
import { buildContainer } from '../apps/api/src/compose.js';

let app: ReturnType<typeof createApp>;

try {
  const config = loadConfig();
  const container = buildContainer(config);
  app = createApp(config, container);
} catch (err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  console.error('[CivicResolve API Startup Error]:', msg);

  // Fallback to safe memory container so Vercel function never crashes
  const fallbackConfig = loadConfig({
    NODE_ENV: 'production',
    REPO_DRIVER: 'memory',
    AI_PROVIDER: 'mock',
    AUTO_SEED: 'true',
  });
  const fallbackContainer = buildContainer(fallbackConfig);
  app = createApp(fallbackConfig, fallbackContainer);
}

export default app;


