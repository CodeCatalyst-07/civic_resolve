import { describe } from 'vitest';
import { FirestoreTicketRepository } from '../../../src/repo/firestore.js';
import { runRepositoryContractTests } from './repositoryContract.js';

const isEmulatorConfigured = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

describe.skipIf(!isEmulatorConfigured)(
  'FirestoreTicketRepository Contract Tests (Firebase Emulator)',
  () => {
    runRepositoryContractTests(
      'Firestore',
      () =>
        new FirestoreTicketRepository({
          collectionName: 'test_tickets_' + Date.now(),
        })
    );
  }
);
