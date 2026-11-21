import { generateKeyPairSync } from 'node:crypto';
import { describe, it, expect } from 'vitest';
import { createRepository } from '../../../src/repo/factory.js';
import { InMemoryTicketRepository } from '../../../src/repo/memory.js';
import { FirestoreTicketRepository } from '../../../src/repo/firestore.js';
import { loadConfig } from '../../../src/config.js';

describe('Repository Factory (createRepository)', () => {
  it('creates InMemoryTicketRepository when REPO_DRIVER is "memory"', () => {
    const config = loadConfig({ REPO_DRIVER: 'memory' });
    const repo = createRepository(config);
    expect(repo).toBeInstanceOf(InMemoryTicketRepository);
  });

  it('creates FirestoreTicketRepository when REPO_DRIVER is "firestore" and credentials exist', () => {
    // Generate valid PKCS8 PEM in memory for test
    const { privateKey } = generateKeyPairSync('rsa', {
      modulusLength: 1024,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    const fakeServiceAccount = JSON.stringify({
      type: 'service_account',
      project_id: 'test-project',
      client_email: 'test@test-project.iam.gserviceaccount.com',
      private_key: privateKey,
    });

    const config = loadConfig({
      REPO_DRIVER: 'firestore',
      FIREBASE_SERVICE_ACCOUNT_JSON: fakeServiceAccount,
    });

    const repo = createRepository(config);
    expect(repo).toBeInstanceOf(FirestoreTicketRepository);
  });

  it('throws readable error when REPO_DRIVER is firestore and credentials are missing', () => {
    // Pass raw config object where FIREBASE_SERVICE_ACCOUNT_JSON is undefined
    const badConfig = {
      ...loadConfig({ REPO_DRIVER: 'memory' }),
      REPO_DRIVER: 'firestore' as const,
      FIREBASE_SERVICE_ACCOUNT_JSON: '',
    };

    expect(() => createRepository(badConfig)).toThrow(
      /FIREBASE_SERVICE_ACCOUNT_JSON is required when REPO_DRIVER is set to "firestore"/
    );
  });
});
