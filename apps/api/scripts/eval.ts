import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { loadConfig } from '../src/config.js';
import { createTriageProvider } from '../src/ai/factory.js';
import { createTriageService } from '../src/services/triageService.js';
import { urgencyToLevel } from '../src/domain/rules.js';
import type { Category, Urgency } from '@civicresolve/shared';

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

interface ComplaintFixture {
  id: string;
  text: string;
  expectedCategory: Category;
  minUrgency: Urgency;
  expectedOutcome: 'ticket' | 'follow_up' | 'rejected';
  emergency: boolean;
  language: string;
}

interface EvalRow {
  id: string;
  categoryMatch: boolean;
  urgencyMet: boolean;
  outcomeMatch: boolean;
  emergencyMatch: boolean;
  latencyMs: number;
  degraded: boolean;
  outcomeKind: string;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  let providerChoice = 'mock';
  let shouldWrite = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--provider' && args[i + 1]) {
      providerChoice = args[i + 1]!;
      i++;
    } else if (args[i] === '--write') {
      shouldWrite = true;
    }
  }

  const rawConfig = {
    ...process.env,
    AI_PROVIDER: providerChoice,
  };

  const config = loadConfig(rawConfig);
  const provider = createTriageProvider(config);
  const triageService = createTriageService({ provider });

  const fixturesUrl = new URL('../../../fixtures/complaints.json', import.meta.url);
  const fixtures = JSON.parse(readFileSync(fixturesUrl, 'utf-8')) as ComplaintFixture[];

  const rows: EvalRow[] = [];
  let totalLatency = 0;

  console.log(`\n========================================================================`);
  console.log(`CivicResolve AI Triage Benchmark Evaluation`);
  console.log(`Provider: ${providerChoice.toUpperCase()} (${provider.model})`);
  console.log(`Test Fixtures: ${fixtures.length} complaints`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`========================================================================\n`);

  for (const fixture of fixtures) {
    const start = Date.now();
    const result = await triageService.analyze({
      description: fixture.text,
      round: 0,
      now: new Date('2026-11-21T10:00:00.000Z'),
    });
    const latency = Date.now() - start;
    totalLatency += latency;

    const outcome = result.outcome;
    let actualCategory: Category = 'other_civic';
    let actualUrgency: Urgency = 'low';
    let emergencyDetected = false;

    if (outcome.kind === 'ticket') {
      actualCategory = outcome.decision.category;
      actualUrgency = outcome.decision.urgency;
      emergencyDetected = outcome.emergency_notice;
    } else if (outcome.kind === 'rejected') {
      actualCategory = 'not_civic';
      actualUrgency = 'low';
      emergencyDetected = outcome.emergency_notice;
    }

    const categoryMatch =
      outcome.kind === 'follow_up'
        ? outcome.kind === fixture.expectedOutcome
        : actualCategory === fixture.expectedCategory;
    const urgencyMet = urgencyToLevel(actualUrgency) >= urgencyToLevel(fixture.minUrgency);
    const outcomeMatch = outcome.kind === fixture.expectedOutcome;
    const emergencyMatch = emergencyDetected === fixture.emergency;

    rows.push({
      id: fixture.id,
      categoryMatch,
      urgencyMet,
      outcomeMatch,
      emergencyMatch,
      latencyMs: latency,
      degraded: result.meta.degraded,
      outcomeKind: outcome.kind,
    });
  }

  const n = rows.length;
  const catMatches = rows.filter((r) => r.categoryMatch).length;
  const urgMatches = rows.filter((r) => r.urgencyMet).length;
  const outcomeMatches = rows.filter((r) => r.outcomeMatch).length;
  const emergMatches = rows.filter((r) => r.emergencyMatch).length;
  const degradedCount = rows.filter((r) => r.degraded).length;
  const avgLatency = Math.round(totalLatency / n);

  const catAcc = Math.round((catMatches / n) * 100);
  const urgAcc = Math.round((urgMatches / n) * 100);
  const outcomeAcc = Math.round((outcomeMatches / n) * 100);
  const emergAcc = Math.round((emergMatches / n) * 100);

  console.log(`Results Summary:`);
  console.log(`- Category Accuracy:    ${catAcc}% (${catMatches}/${n})`);
  console.log(`- Urgency >= Minimum:   ${urgAcc}% (${urgMatches}/${n})`);
  console.log(`- Outcome Match:        ${outcomeAcc}% (${outcomeMatches}/${n})`);
  console.log(`- Emergency Detection:  ${emergAcc}% (${emergMatches}/${n})`);
  console.log(`- Degraded Inferences:  ${degradedCount}/${n}`);
  console.log(`- Average Latency:      ${avgLatency} ms\n`);

  if (shouldWrite) {
    const fileName = `EVAL-${providerChoice.toLowerCase()}.md`;
    const docPath = new URL(`../../../docs/${fileName}`, import.meta.url);
    mkdirSync(dirname(docPath.pathname), { recursive: true });

    const disclaimer =
      providerChoice === 'mock'
        ? '> [!NOTE]\n> **Honest Disclosure**: This evaluation uses the deterministic `mock` triage provider derived from test fixtures. It verifies plumbing, prompt schema parsing, error recovery, and domain rule wiring; it is **NOT** a benchmark of live AI model accuracy.\n'
        : '> [!NOTE]\n> **Live Provider Benchmark**: This evaluation ran against a live AI model provider.\n';

    const markdownReport = `# CivicResolve Model Benchmark Results (${providerChoice.toUpperCase()})

Last Updated: ${new Date().toISOString()}
Provider Tested: \`${providerChoice}\` (Model: \`${provider.model}\`)

${disclaimer}
## Metrics Summary
| Metric | Result | Benchmark Target |
| :--- | :---: | :---: |
| **Category Accuracy** | **${catAcc}%** | $\\ge 90\\%$ |
| **Urgency Floor ($\\ge$ Min)** | **${urgAcc}%** | $100\\%$ |
| **Outcome Match** | **${outcomeAcc}%** | $100\\%$ |
| **Emergency Hazard Detection** | **${emergAcc}%** | $100\\%$ |
| **Degraded Count** | **${degradedCount}** | $0$ (offline mode) |
| **Average Latency** | **${avgLatency} ms** | $< 2500$ ms |

## Fixture Evaluation Breakdown
| Fixture ID | Outcome | Category | Urgency | Emergency | Latency |
| :--- | :---: | :---: | :---: | :---: | :---: |
${rows
  .map(
    (r) =>
      `| \`${r.id}\` | ${r.outcomeMatch ? '✅' : '❌'} \`${r.outcomeKind}\` | ${
        r.categoryMatch ? '✅' : '❌'
      } | ${r.urgencyMet ? '✅' : '❌'} | ${r.emergencyMatch ? '✅' : '❌'} | ${r.latencyMs}ms |`
  )
  .join('\n')}
`;

    writeFileSync(docPath, markdownReport, 'utf-8');
    console.log(`Successfully wrote evaluation report to docs/${fileName}\n`);
  }

  // If running with mock provider, enforce 100% accuracy for CI safety
  if (providerChoice === 'mock') {
    if (catAcc < 100 || urgAcc < 100 || outcomeAcc < 100 || emergAcc < 100) {
      console.error('❌ Mock provider evaluation failed: expected 100% accuracy across all benchmarks.');
      process.exit(1);
    }
  }

  console.log('✅ Evaluation completed successfully.');
}

main().catch((err) => {
  console.error('Evaluation run failed:', err);
  process.exit(1);
});
