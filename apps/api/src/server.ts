// Load .env if present (native Node.js 20+ feature)
try {
  process.loadEnvFile?.();
} catch {
  try {
    process.loadEnvFile?.('../../.env');
  } catch {
    // Fall back to existing process.env
  }
}

import { loadConfig } from './config.js';
import { createApp, createDegradedApp } from './app.js';
import { buildContainer } from './compose.js';
import { logger } from './lib/logger.js';

let app;
let activePort = 3001;
let envMode = 'development';
let aiMode = 'mock';
let repoMode = 'memory';

try {
  const config = loadConfig();
  activePort = config.PORT;
  envMode = config.NODE_ENV;
  aiMode = config.AI_PROVIDER;
  repoMode = config.REPO_DRIVER;

  try {
    const container = buildContainer(config);
    app = createApp(config, container);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error('Repository failed to initialize, starting in degraded mode', { error: msg });
    app = createDegradedApp('repo_unavailable', 'Persistent repository failed to initialize');
  }
} catch (err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  logger.error('Configuration failed to load, starting in degraded mode', { error: msg });
  app = createDegradedApp('config_invalid', 'Invalid or missing environment configuration');
}

const server = app.listen(activePort, '0.0.0.0', () => {
  logger.info(`CivicResolve API server running on port ${activePort}`, {
    port: activePort,
    environment: envMode,
    aiProvider: aiMode,
    repoDriver: repoMode,
  });
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received. Closing HTTP server.');
  server.close(() => {
    logger.info('HTTP server closed.');
    process.exit(0);
  });
});
