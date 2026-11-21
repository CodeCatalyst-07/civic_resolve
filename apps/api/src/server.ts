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
import { createApp } from './app.js';
import { logger } from './lib/logger.js';

const config = loadConfig();
const app = createApp(config);

const server = app.listen(config.PORT, () => {
  logger.info(`CivicResolve API server running on port ${config.PORT}`, {
    port: config.PORT,
    environment: config.NODE_ENV,
    aiProvider: config.AI_PROVIDER,
    repoDriver: config.REPO_DRIVER,
  });
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received. Closing HTTP server.');
  server.close(() => {
    logger.info('HTTP server closed.');
    process.exit(0);
  });
});
