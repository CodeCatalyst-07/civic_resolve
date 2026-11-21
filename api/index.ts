import { createApp } from '../apps/api/src/app.js';
import { loadConfig } from '../apps/api/src/config.js';

const config = loadConfig();
const app = createApp(config);

export default app;
