import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { loadConfig } from '../../src/config.js';

describe('API Integration Tests', () => {
  const baseConfig = loadConfig({
    AI_PROVIDER: 'mock',
    REPO_DRIVER: 'memory',
    ALLOWED_ORIGINS: 'http://localhost:5173',
  });

  const app = createApp(baseConfig);

  it('GET /api/health returns 200 and contains no secrets', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('aiProvider', 'mock');
    expect(res.body).toHaveProperty('repoDriver', 'memory');
    expect(res.body).toHaveProperty('time');
    expect(res.headers).toHaveProperty('x-request-id');

    // Ensure no secrets or API keys are leaked
    expect(res.body).not.toHaveProperty('JARVISLABS_API_KEY');
    expect(res.body).not.toHaveProperty('GEMINI_API_KEY');
    expect(res.body).not.toHaveProperty('FIREBASE_SERVICE_ACCOUNT_JSON');
    expect(res.text).not.toContain('secret');
  });

  it('GET /api/meta returns taxonomy enums from packages/shared', async () => {
    const res = await request(app).get('/api/meta');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('categories');
    expect(res.body).toHaveProperty('urgencies');
    expect(res.body).toHaveProperty('statuses');
    expect(res.body).toHaveProperty('roles');

    expect(Array.isArray(res.body.categories)).toBe(true);
    expect(res.body.categories).toContain('pothole');
    expect(res.body.urgencies).toContain('critical');
    expect(res.body.statuses).toContain('submitted');
    expect(res.body.roles).toContain('citizen');
  });

  it('returns 404 with generic JSON error on undefined routes', async () => {
    const res = await request(app).get('/api/undefined-endpoint-xyz');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: 'Not Found',
      message: 'The requested resource was not found.',
    });
  });

  it('rejects oversized JSON payload (>20kb) with 413', async () => {
    // Generate a payload exceeding 20kb
    const largePayload = {
      content: 'x'.repeat(25 * 1024), // 25kb
    };

    const res = await request(app)
      .post('/api/health') // any endpoint
      .send(largePayload)
      .set('Content-Type', 'application/json');

    expect(res.status).toBe(413);
    expect(res.body).toHaveProperty('error', 'Payload Too Large');
    expect(res.body.message).toContain('20kb limit');
  });

  it('enforces rate limit when threshold is exceeded', async () => {
    // App with tight rate limit: max 2 requests
    const rateLimitedConfig = loadConfig({
      RATE_LIMIT_WINDOW_MS: '60000',
      RATE_LIMIT_MAX: '2',
    });
    const rateLimitedApp = createApp(rateLimitedConfig);

    const res1 = await request(rateLimitedApp).get('/api/health');
    expect(res1.status).toBe(200);

    const res2 = await request(rateLimitedApp).get('/api/health');
    expect(res2.status).toBe(200);

    // 3rd request should hit rate limit
    const res3 = await request(rateLimitedApp).get('/api/health');
    expect(res3.status).toBe(429);
    expect(res3.body).toHaveProperty('error', 'Too Many Requests');
  });
});
