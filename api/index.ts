import { createApp } from '../apps/api/src/app.js';
import { loadConfig } from '../apps/api/src/config.js';
import { buildContainer } from '../apps/api/src/compose.js';

const config = loadConfig();
const container = buildContainer(config);
const app = createApp(config, container);

export default app;
