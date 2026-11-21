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

import { loadConfig } from '../src/config.js';
import { createGeocodingProvider } from '../src/services/geocoding/factory.js';

async function main(): Promise<void> {
  const address = process.argv[2] || '100ft road Indiranagar, Bengaluru';

  if (!process.env.GOOGLE_MAPS_SERVER_KEY || process.env.GOOGLE_MAPS_SERVER_KEY.trim() === '') {
    console.log(`[SKIP] Skipping Google Maps Geocoding smoke test: GOOGLE_MAPS_SERVER_KEY is not configured.`);
    process.exit(0);
  }

  const config = loadConfig(process.env);
  const provider = createGeocodingProvider(config);

  console.log(`\n========================================================================`);
  console.log(`CivicResolve Geocoding Smoke Test`);
  console.log(`Testing query: "${address}"`);
  console.log(`========================================================================\n`);

  const startTime = Date.now();
  const res = await provider.geocode(address);
  const latency = Date.now() - startTime;

  if (res.ok) {
    console.log(`✅ Geocoding succeeded in ${latency}ms:`);
    console.log(`Formatted Address: ${res.value.formatted_address}`);
    console.log(`Coordinates: (${res.value.lat}, ${res.value.lng})`);
  } else {
    console.error(`❌ Geocoding failed (${res.error.kind}): ${res.error.message}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Geocoding smoke test failed:', err);
  process.exit(1);
});
