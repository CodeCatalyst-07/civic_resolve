// Load .env if present (native Node.js 20+ feature)
try {
  process.loadEnvFile?.();
} catch {
  // ignore
}
try {
  process.loadEnvFile?.('.env');
} catch {
  // ignore
}
try {
  process.loadEnvFile?.('../.env');
} catch {
  // ignore
}
try {
  process.loadEnvFile?.('../../.env');
} catch {
  // ignore
}

import { loadConfig } from '../src/config.js';
import { createTicketRepository } from '../src/repo/factory.js';
import { seedTickets } from '../src/data/seedData.js';

interface CliArgs {
  driver: 'memory' | 'firestore';
  reset: boolean;
  now?: Date;
}

function parseArgs(args: string[]): CliArgs {
  let driver: 'memory' | 'firestore' =
    process.env.REPO_DRIVER === 'firestore' ? 'firestore' : 'memory';
  let reset = false;
  let now: Date | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--driver' && args[i + 1]) {
      const val = args[i + 1]?.toLowerCase();
      if (val === 'memory' || val === 'firestore') {
        driver = val;
      }
      i++;
    } else if (arg === '--reset') {
      reset = true;
    } else if (arg === '--now' && args[i + 1]) {
      const d = new Date(args[i + 1]!);
      if (!isNaN(d.getTime())) {
        now = d;
      }
      i++;
    }
  }

  return { driver, reset, now };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  console.log('\n========================================================================');
  console.log('CivicResolve Database Seeder');
  console.log('========================================================================\n');
  console.log(`Driver: ${args.driver}`);
  console.log(`Reset existing: ${args.reset}`);
  console.log(`Anchor time: ${args.now ? args.now.toISOString() : new Date().toISOString()}`);

  const config = loadConfig({
    ...process.env,
    REPO_DRIVER: args.driver,
  });

  const repo = createTicketRepository(config);

  if (args.reset && args.driver === 'firestore') {
    console.log('Clearing existing tickets from Firestore...');
    const listRes = await repo.query({ limit: 100 });
    if (listRes.ok) {
      console.log(`Found ${listRes.value.tickets.length} tickets to delete...`);
    }
  }

  console.log('Inserting seed tickets...');
  const result = await seedTickets(repo, {
    reset: args.reset,
    now: args.now,
  });

  if (!result.ok) {
    console.error(`❌ Seeding failed: ${result.error.message}`);
    process.exit(1);
  }

  console.log(`\n✅ Seeding complete: Successfully seeded ${result.value.inserted} tickets!`);
}

main().catch((err) => {
  console.error('Fatal seeding error:', err);
  process.exit(1);
});
