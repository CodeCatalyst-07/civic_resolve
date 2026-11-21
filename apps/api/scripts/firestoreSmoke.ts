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

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

async function main(): Promise<void> {
  const rawCreds = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (!rawCreds || rawCreds.trim() === '') {
    console.log('[SKIP] Skipping Firestore smoke test: FIREBASE_SERVICE_ACCOUNT_JSON is not configured.');
    process.exit(0);
  }

  console.log('\n========================================================================');
  console.log('CivicResolve Firestore Smoke Test');
  console.log('========================================================================\n');

  let parsed: Record<string, unknown>;
  try {
    try {
      parsed = JSON.parse(rawCreds);
    } catch {
      const decoded = Buffer.from(rawCreds, 'base64').toString('utf8');
      parsed = JSON.parse(decoded);
    }
  } catch {
    console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON: invalid JSON format');
    process.exit(1);
  }

  const projectId = parsed.project_id || 'unknown';
  console.log(`Target Firebase Project: ${projectId}`);

  const app = getApps().length > 0 ? getApps()[0]! : initializeApp({ credential: cert(parsed) });
  const db = getFirestore(app);

  const docId = `smoke_${Date.now()}`;
  const docRef = db.collection('_smoke').doc(docId);

  const startTime = Date.now();
  console.log(`Writing test document to _smoke/${docId}...`);
  await docRef.set({
    smoke: true,
    created_at: new Date().toISOString(),
    purpose: 'verification',
  });

  console.log('Reading test document back...');
  const snapshot = await docRef.get();
  if (!snapshot.exists || !snapshot.data()?.smoke) {
    console.error('❌ Verification failed: Document was not read back correctly.');
    process.exit(1);
  }

  console.log('Deleting test document from _smoke collection...');
  await docRef.delete();
  const latency = Date.now() - startTime;

  console.log(`\n✅ Firestore smoke test succeeded in ${latency}ms: write, read, and delete verified without error.`);
}

main().catch((err) => {
  console.error('❌ Firestore smoke test encountered unexpected error:', err.message || err);
  process.exit(1);
});
