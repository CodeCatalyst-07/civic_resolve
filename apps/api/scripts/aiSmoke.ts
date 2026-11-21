import { loadConfig } from '../src/config.js';
import { createTriageProvider } from '../src/ai/factory.js';

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

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  let providerChoice = 'jarvis';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--provider' && args[i + 1]) {
      providerChoice = args[i + 1]!;
      i++;
    }
  }

  const rawConfig = {
    ...process.env,
    AI_PROVIDER: providerChoice,
  };

  // Check required credentials before proceeding
  if (providerChoice === 'jarvis') {
    if (!process.env.JARVISLABS_API_KEY || process.env.JARVISLABS_API_KEY.trim() === '') {
      console.log(`[SKIP] Skipping live smoke test for Jarvis Labs: JARVISLABS_API_KEY is not configured.`);
      process.exit(0);
    }
  } else if (providerChoice === 'gemini') {
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.trim() === '') {
      console.log(`[SKIP] Skipping live smoke test for Gemini: GEMINI_API_KEY is not configured.`);
      process.exit(0);
    }
    if (!process.env.GEMINI_MODEL || process.env.GEMINI_MODEL.trim() === '') {
      console.log(`[SKIP] Skipping live smoke test for Gemini: GEMINI_MODEL is not configured.`);
      process.exit(0);
    }
  }

  const config = loadConfig(rawConfig);
  const provider = createTriageProvider(config);

  const sampleComplaint =
    'Deep dangerous pothole right outside National Public School on 100ft Road, Ward 12. School buses and children are getting stuck.';

  console.log(`\n========================================================================`);
  console.log(`CivicResolve AI Smoke Test`);
  console.log(`Provider: ${providerChoice.toUpperCase()} (${provider.model})`);
  console.log(`========================================================================\n`);

  const startTime = Date.now();
  const res = await provider.triage({
    text: sampleComplaint,
    ward: 'Ward 12',
  });
  const latency = Date.now() - startTime;

  if (res.ok) {
    console.log(`✅ Success in ${latency}ms:`);
    console.log(JSON.stringify(res.value, null, 2));
  } else {
    console.error(`❌ Provider returned error (${res.error.kind}): ${res.error.message}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Smoke test failed with unexpected error:', err);
  process.exit(1);
});
