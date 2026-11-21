import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createDegradedApp } from '../../../src/app.js';
import { createRepository } from '../../../src/repo/factory.js';
import { loadConfig } from '../../../src/config.js';

describe('Non-Opaque Degraded Operational Modes', () => {
  describe('createDegradedApp - config_invalid', () => {
    const app = createDegradedApp(
      'config_invalid',
      'Configuration failed: AI_KEY AIzaSyDummyFakeKey123 was invalid'
    );

    it('answers /api/health with status degraded and safe error code without secrets', async () => {
      const res = await request(app).get('/api/health');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('degraded');
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('config_invalid');
      expect(res.body.error.message).toContain('[REDACTED_KEY]');
      expect(res.body.error.message).not.toContain('AIzaSyDummyFakeKey123');
      expect(res.body.time).toBeDefined();
    });

    it('answers /api/stats with 503 service_unavailable envelope', async () => {
      const res = await request(app).get('/api/stats');

      expect(res.status).toBe(503);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('service_unavailable');
      expect(res.body.error.message).toContain('config_invalid');
    });

    it('answers /api/reports with 503 service_unavailable envelope', async () => {
      const res = await request(app)
        .post('/api/reports')
        .send({ text: 'Broken pipeline test' });

      expect(res.status).toBe(503);
      expect(res.body.error.code).toBe('service_unavailable');
    });
  });

  describe('createDegradedApp - repo_unavailable', () => {
    const app = createDegradedApp(
      'repo_unavailable',
      'Persistent repository connection timed out'
    );

    it('answers /api/health with status degraded and repo_unavailable code', async () => {
      const res = await request(app).get('/api/health');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('degraded');
      expect(res.body.error.code).toBe('repo_unavailable');
    });

    it('answers /api/authority/tickets with 503 envelope', async () => {
      const res = await request(app).get('/api/authority/tickets');

      expect(res.status).toBe(503);
      expect(res.body.error.code).toBe('service_unavailable');
    });
  });

  describe('Production repository failure behavior', () => {
    it('throws in production when Firestore cannot initialize instead of silently falling back to in-memory', () => {
      const prodConfig = loadConfig({
        NODE_ENV: 'production',
        REPO_DRIVER: 'firestore',
        FIREBASE_SERVICE_ACCOUNT_JSON: JSON.stringify({
          type: 'service_account',
          client_email: 'test@example.com',
          private_key: 'INVALID_PEM_KEY_FORMAT',
        }),
      });

      expect(() => createRepository(prodConfig)).toThrow(
        /Firestore repository initialization failed in production/
      );
    });

    it('falls back to in-memory store in development with warning log', () => {
      const devConfig = loadConfig({
        NODE_ENV: 'development',
        REPO_DRIVER: 'firestore',
        FIREBASE_SERVICE_ACCOUNT_JSON: JSON.stringify({
          type: 'service_account',
          client_email: 'test@example.com',
          private_key: 'INVALID_PEM_KEY_FORMAT',
        }),
      });

      // Should not throw in development
      const repo = createRepository(devConfig);
      expect(repo).toBeDefined();
    });
  });
});
