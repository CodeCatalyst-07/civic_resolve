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
  console.log('\nStatus Breakdown:');
  let statusSum = 0;
  for (const [status, count] of Object.entries(result.value.statusCounts)) {
    console.log(`  - ${status.padEnd(14)}: ${count}`);
    statusSum += count;
  }
  console.log(`\nStatus Count Sum: ${statusSum} / ${result.value.inserted} (exact match: ${statusSum === result.value.inserted})`);

  // Print Evaluator Demo Tickets Table
  const allTicketsRes = await repo.query({ limit: 100 });
  if (allTicketsRes.ok) {
    const tickets = allTicketsRes.value.tickets;

    const demoItems = [
      {
        scenario: 'Emergency Life-Safety Hazard (112 notice)',
        ticket: tickets.find((t) => t.final_decision.emergency_notice),
        detail: 'Urgency Critical; 112 emergency callout active',
      },
      {
        scenario: 'Duplicate Cluster Primary (4 duplicates)',
        ticket: tickets.find((t) => t.duplicate_count === 4),
        detail: 'Indiranagar School pothole cluster; duplicate count 4',
      },
      {
        scenario: 'Overdue Grievance (SLA Exceeded & Escalated)',
        ticket: tickets.find((t) => t.escalated && t.status !== 'resolved' && t.status !== 'closed'),
        detail: 'Whitefield streetlights; SLA 72h exceeded, escalated',
      },
      {
        scenario: 'Reopened Grievance (Citizen Reopened)',
        ticket: tickets.find((t) => t.status === 'reopened'),
        detail: 'Sector 1 road trench; reopen audit event recorded',
      },
      {
        scenario: 'Resolved Grievance (Eligible for Citizen Reopen)',
        ticket: tickets.find((t) => t.status === 'resolved'),
        detail: 'Defense Colony pothole; ready to test citizen reopen',
      },
      {
        scenario: 'Rejected Matter (Non-Civic Jurisdictional Outlier)',
        ticket: tickets.find((t) => t.status === 'rejected'),
        detail: 'Private billboard dispute; civil guidance provided',
      },
    ];

    console.log('\n========================================================================');
    console.log('Evaluator Demo Tickets (Deterministic IDs for UI & API Testing)');
    console.log('========================================================================\n');
    console.log('| Scenario | Ticket ID | Status | Urgency | Category | Verification Details |');
    console.log('| :--- | :--- | :--- | :--- | :--- | :--- |');
    for (const item of demoItems) {
      if (item.ticket) {
        console.log(
          `| **${item.scenario}** | \`${item.ticket.id}\` | \`${item.ticket.status}\` | \`${item.ticket.urgency}\` | \`${item.ticket.category}\` | ${item.detail} |`
        );
      }
    }
    console.log('\n');
  }
}

main().catch((err) => {
  console.error('Fatal seeding error:', err);
  process.exit(1);
});
