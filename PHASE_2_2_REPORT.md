# Phase 2.2: AI Provider Layer, Triage Service & Geocoding — Complete

Phase 2.2 of **CivicResolve** is complete. The AI provider integration layer ([apps/api/src/ai](file:///Users/arnav/Desktop/CivicResolve/apps/api/src/ai)), the resilient triage orchestration service ([apps/api/src/services](file:///Users/arnav/Desktop/CivicResolve/apps/api/src/services)), synthetic geographic reference data ([apps/api/src/data](file:///Users/arnav/Desktop/CivicResolve/apps/api/src/data)), server-side geocoding, and offline evaluation harnesses have been implemented, tested, verified, and committed.

No HTTP routes, Firestore implementations, or UI components were added or modified in this phase.

---

## 1. Quality & Verification Commands

All quality gates pass cleanly across workspaces:

```bash
# 1. Monorepo ESLint (includes AI and Services architectural boundary rules)
npm run lint

# 2. Strict TypeScript typecheck across all workspaces and root serverless target
npm run typecheck

# 3. Comprehensive test suite across all packages (303 tests total)
npm run test

# 4. Production build across all packages (shared, api, web)
npm run build

# 5. Vitest V8 code coverage on apps/api (>= 90% domain, >= 85% ai & services)
npm run test:coverage

# 6. Evaluation harness benchmark on 20 multilingual complaints
npm run eval --workspace=@civicresolve/api -- --provider mock
```

---

## 2. Test Suite & Coverage Report

Vitest V8 coverage enforces $\ge 90\%$ thresholds for domain and $\ge 85\%$ for ai and services:

```text
 % Coverage report from v8
-------------------|---------|----------|---------|---------|-------------------
File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
-------------------|---------|----------|---------|---------|-------------------
All files          |   97.73 |    91.52 |   98.75 |   97.73 |                   
 ai                |   95.02 |    87.85 |     100 |   95.02 |                   
  factory.ts       |     100 |      100 |     100 |     100 |                   
  gemini.ts        |   93.51 |    84.84 |     100 |   93.51 | 55-61             
  jarvis.ts        |   96.15 |       90 |     100 |   96.15 | 136-139           
  mock.ts          |   96.29 |    93.75 |     100 |   96.29 | 47-48             
  parse.ts         |   90.76 |    79.31 |     100 |   90.76 | 15-16,27,29,59-60 
  prompts.ts       |   94.11 |    85.71 |     100 |   94.11 | 90-91             
  resilience.ts    |   96.29 |    93.75 |     100 |   96.29 | 42-43             
 data              |     100 |      100 |     100 |     100 |                   
  sites.ts         |     100 |      100 |     100 |     100 |                   
  wards.ts         |     100 |      100 |     100 |     100 |                   
 domain            |   98.29 |    94.91 |     100 |   98.29 |                   
  config.ts        |     100 |      100 |     100 |     100 |                   
  duplicates.ts    |   96.47 |     87.5 |     100 |   96.47 | 219-223           
  emergency.ts     |     100 |      100 |     100 |     100 |                   
  fallback.ts      |   97.05 |     93.1 |     100 |   97.05 | 94-95             
  geo.ts           |     100 |      100 |     100 |     100 |                   
  messages.ts      |     100 |      100 |     100 |     100 |                   
  rules.ts         |     100 |      100 |     100 |     100 |                   
  sla.ts           |     100 |      100 |     100 |     100 |                   
  status.ts        |   96.07 |    93.75 |     100 |   96.07 | 69-70             
  taxonomy.ts      |   95.58 |    93.75 |     100 |   95.58 | 90-92             
  ticketId.ts      |     100 |      100 |     100 |     100 |                   
  triage.ts        |     100 |      100 |     100 |     100 |                   
 domain/data       |     100 |      100 |     100 |     100 |                   
  keywords.ts      |     100 |      100 |     100 |     100 |                   
 services          |   99.55 |    94.33 |     100 |   99.55 |                   
  budget.ts        |     100 |      100 |     100 |     100 |                   
  cache.ts         |   98.11 |    94.44 |     100 |   98.11 | 76                
  triageService.ts |     100 |    90.47 |     100 |     100 | 82,188            
 ...ices/geocoding |   94.93 |    86.04 |   85.71 |   94.93 |                   
  factory.ts       |     100 |      100 |     100 |     100 |                   
  google.ts        |   93.93 |    84.61 |      80 |   93.93 | ...48-149,179-182 
  null.ts          |     100 |      100 |     100 |     100 |                   
-------------------|---------|----------|---------|---------|-------------------
```

- **Domain:** 98.29% Stmts, 94.91% Branch, 100% Funcs, 98.29% Lines ($\ge 90\%$ threshold)
- **AI:** 95.02% Stmts, 87.85% Branch, 100% Funcs, 95.02% Lines ($\ge 85\%$ threshold)
- **Services:** 99.55% Stmts, 94.33% Branch, 100% Funcs, 99.55% Lines ($\ge 85\%$ threshold)
- **Total Monorepo Tests:** **303 passing** (265 in `@civicresolve/api`, 31 in `@civicresolve/shared`, 7 in `@civicresolve/web`).

---

## 3. Benchmark Evaluation Results

Running the evaluation harness on the multilingual 20-complaint fixture set ([fixtures/complaints.json](file:///Users/arnav/Desktop/CivicResolve/fixtures/complaints.json)) produces **100% accuracy** across all benchmark dimensions without any degraded inferences:

```text
========================================================================
CivicResolve AI Triage Benchmark Evaluation
Provider: MOCK (mock-triage-v1)
Test Fixtures: 20 complaints
========================================================================
Results Summary:
- Category Accuracy:    100% (20/20)
- Urgency >= Minimum:   100% (20/20)
- Outcome Match:        100% (20/20)
- Emergency Detection:  100% (20/20)
- Degraded Inferences:  0/20
- Average Latency:      2 ms

✅ Evaluation completed successfully.
```

The evaluation report is automatically generated and maintained at [docs/EVAL.md](file:///Users/arnav/Desktop/CivicResolve/docs/EVAL.md).

---

## 4. Part 0 Carry-Over Findings & Fixes

### A. Emergency Outcome Guarantee
- **Before:** When immediate danger was detected (e.g. live wire, gas leak, open manhole), the domain logic previously returned `{ kind: "rejected", reason: "immediate_danger", emergency_notice: true }` or bypassed ticket creation if the text contained vague or non-civic phrases.
- **Now:** In [apps/api/src/domain/triage.ts](file:///Users/arnav/Desktop/CivicResolve/apps/api/src/domain/triage.ts#L61-L86), detecting immediate danger **ALWAYS guarantees a confirmed ticket**. It overrides downstream rejection and follow-up paths, setting:
  - `urgency: "critical"`
  - `category: suggestion.category` (or `"other"` fallback)
  - `department: "public_health_safety"`
  - `emergency_notice: true`
  - Applied rule: `"CRIT-01" / "Immediate life safety hazard detected"`
  Citizens receive the life-safety emergency notice (112) AND their grievance is filed immediately with municipal emergency response teams.

### B. 5D Urgency Invariant Proof
- Expanded the exhaustive Cartesian product invariant test in [apps/api/tests/unit/domain/rules.test.ts](file:///Users/arnav/Desktop/CivicResolve/apps/api/tests/unit/domain/rules.test.ts#L104-L146) from 4 dimensions (64 states) to **5 dimensions (192 states)**:
  $$4 \text{ base urgencies} \times 2 \text{ safety\_critical flags} \times 2 \text{ sensitive sites} \times 6 \text{ duplicate counts} \times 2 \text{ danger states} = 192\text{ combinations}$$
  Every single combination mathematically proves that deterministic domain rules can **only raise urgency, never lower it**.

### C. Duplicate Scoring Weights
- Refactored composite duplicate calculation in [apps/api/src/domain/duplicates.ts](file:///Users/arnav/Desktop/CivicResolve/apps/api/src/domain/duplicates.ts#L182-L218) to use frozen constants in `DOMAIN_CONFIG`:
  $$\text{compositeScore} = 0.6 \times \text{distanceScore} + 0.4 \times \text{textSimilarityScore}$$
- Confirmed candidates are sorted descending by score with candidate threshold $= 0.5$.

### D. `ai_source` Attribution
- Added `AiSource` enum (`jarvis_gemma`, `gemini`, `mock`, `keyword_fallback`) in [packages/shared/src/index.ts](file:///Users/arnav/Desktop/CivicResolve/packages/shared/src/index.ts).
- Added optional `ai_source` field to `FinalDecision` with full Zod schema validation and unit tests.

---

## 5. Architectural Boundaries & Security

### A. ESLint Layer Boundary Enforcement
The ESLint boundaries in [eslint.config.js](file:///Users/arnav/Desktop/CivicResolve/eslint.config.js) restrict imports:
- `apps/api/src/ai/**` and `apps/api/src/services/**` are strictly forbidden from importing from `http/` or `repo/`.
- Tested and verified: Attempting to import Express `Request` or repository types into `ai/` or `services/` triggers ESLint errors and fails the build.

### B. Prompt Injection Neutralization
In [apps/api/src/ai/prompts.ts](file:///Users/arnav/Desktop/CivicResolve/apps/api/src/ai/prompts.ts), complaints are wrapped in `<complaint>...</complaint>` delimiters. Any occurrence of `<complaint>` or `</complaint>` in user text is automatically neutralized before string formatting. The cache-friendly system prompt explicitly instructs the model that the complaint block is untrusted user data.

### C. Zero-Leak Credential Security
All provider adapters ([jarvis.ts](file:///Users/arnav/Desktop/CivicResolve/apps/api/src/ai/jarvis.ts), [gemini.ts](file:///Users/arnav/Desktop/CivicResolve/apps/api/src/ai/gemini.ts), [google.ts](file:///Users/arnav/Desktop/CivicResolve/apps/api/src/services/geocoding/google.ts)) catch authentication and network errors, returning typed `AiError` objects with generic messages (`"AI service authentication failed"`). API keys, authorization tokens, and raw complaint text are **never** logged or returned in error payloads.

### D. 100% In-Memory Offline Unit Testing
All tests in `tests/unit/ai/` and `tests/unit/services/` use dependency injection (`fetchFn`, `GeminiClient`, `TriageCache`, `DailyAiBudget`). They execute without making network calls or requiring active API keys.

---

## 6. Phase 2.2 Files Committed

| Category | Files | Description |
| :--- | :--- | :--- |
| **Shared Contracts** | [packages/shared/src/index.ts](file:///Users/arnav/Desktop/CivicResolve/packages/shared/src/index.ts)<br>[packages/shared/src/index.test.ts](file:///Users/arnav/Desktop/CivicResolve/packages/shared/src/index.test.ts) | Added `AiSource` enum and `ai_source` field to `FinalDecision` schema. |
| **Domain Fixes** | [apps/api/src/domain/triage.ts](file:///Users/arnav/Desktop/CivicResolve/apps/api/src/domain/triage.ts)<br>[apps/api/src/domain/duplicates.ts](file:///Users/arnav/Desktop/CivicResolve/apps/api/src/domain/duplicates.ts)<br>[apps/api/src/domain/config.ts](file:///Users/arnav/Desktop/CivicResolve/apps/api/src/domain/config.ts)<br>[apps/api/src/domain/README.md](file:///Users/arnav/Desktop/CivicResolve/apps/api/src/domain/README.md) | Guaranteed emergency ticket filing; composite duplicate scoring formula; updated documentation. |
| **AI Layer** | [apps/api/src/ai/types.ts](file:///Users/arnav/Desktop/CivicResolve/apps/api/src/ai/types.ts)<br>[apps/api/src/ai/prompts.ts](file:///Users/arnav/Desktop/CivicResolve/apps/api/src/ai/prompts.ts)<br>[apps/api/src/ai/parse.ts](file:///Users/arnav/Desktop/CivicResolve/apps/api/src/ai/parse.ts)<br>[apps/api/src/ai/jarvis.ts](file:///Users/arnav/Desktop/CivicResolve/apps/api/src/ai/jarvis.ts)<br>[apps/api/src/ai/gemini.ts](file:///Users/arnav/Desktop/CivicResolve/apps/api/src/ai/gemini.ts)<br>[apps/api/src/ai/mock.ts](file:///Users/arnav/Desktop/CivicResolve/apps/api/src/ai/mock.ts)<br>[apps/api/src/ai/resilience.ts](file:///Users/arnav/Desktop/CivicResolve/apps/api/src/ai/resilience.ts)<br>[apps/api/src/ai/factory.ts](file:///Users/arnav/Desktop/CivicResolve/apps/api/src/ai/factory.ts)<br>[apps/api/src/ai/index.ts](file:///Users/arnav/Desktop/CivicResolve/apps/api/src/ai/index.ts)<br>[apps/api/src/ai/README.md](file:///Users/arnav/Desktop/CivicResolve/apps/api/src/ai/README.md) | Full AI provider layer with Jarvis Labs Gemma, Google Gemini, and Mock adapters, prompt-injection defense, JSON repair, and retry resilience. |
| **Triage Services** | [apps/api/src/services/cache.ts](file:///Users/arnav/Desktop/CivicResolve/apps/api/src/services/cache.ts)<br>[apps/api/src/services/budget.ts](file:///Users/arnav/Desktop/CivicResolve/apps/api/src/services/budget.ts)<br>[apps/api/src/services/triageService.ts](file:///Users/arnav/Desktop/CivicResolve/apps/api/src/services/triageService.ts)<br>[apps/api/src/services/index.ts](file:///Users/arnav/Desktop/CivicResolve/apps/api/src/services/index.ts)<br>[apps/api/src/services/README.md](file:///Users/arnav/Desktop/CivicResolve/apps/api/src/services/README.md) | LRU cache, UTC daily budget tracker, resilient multi-stage triage orchestration pipeline. |
| **Geocoding & Data** | [apps/api/src/services/geocoding/](file:///Users/arnav/Desktop/CivicResolve/apps/api/src/services/geocoding)<br>[apps/api/src/data/wards.ts](file:///Users/arnav/Desktop/CivicResolve/apps/api/src/data/wards.ts)<br>[apps/api/src/data/sites.ts](file:///Users/arnav/Desktop/CivicResolve/apps/api/src/data/sites.ts) | Server-side Google geocoding with bounding box validation; 8 synthetic wards and 12 sensitive sites. |
| **Eval & Smoke** | [apps/api/scripts/eval.ts](file:///Users/arnav/Desktop/CivicResolve/apps/api/scripts/eval.ts)<br>[apps/api/scripts/aiSmoke.ts](file:///Users/arnav/Desktop/CivicResolve/apps/api/scripts/aiSmoke.ts)<br>[apps/api/scripts/geocodeSmoke.ts](file:///Users/arnav/Desktop/CivicResolve/apps/api/scripts/geocodeSmoke.ts)<br>[docs/EVAL.md](file:///Users/arnav/Desktop/CivicResolve/docs/EVAL.md) | Offline benchmark evaluation script and live smoke test harnesses. |
| **Unit Tests** | `apps/api/tests/unit/ai/*`<br>`apps/api/tests/unit/services/*`<br>`apps/api/tests/unit/data/*` | 56 new unit tests across 12 test suites, reaching 100% pass rate. |
