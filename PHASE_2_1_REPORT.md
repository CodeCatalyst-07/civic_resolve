# Phase 2.1: The Domain Core — Complete

Phase 2.1 of **CivicResolve** is complete. The pure TypeScript decision-making engine in [apps/api/src/domain](file:///Users/arnav/Desktop/CivicResolve/apps/api/src/domain) and the shared data contracts in [packages/shared/src](file:///Users/arnav/Desktop/CivicResolve/packages/shared/src) have been implemented, tested, verified, and committed.

---

## 1. Quality & Verification Commands

All quality gates pass cleanly across workspaces:

```bash
# 1. Monorepo ESLint (includes domain purity & architecture boundaries)
npm run lint

# 2. Strict TypeScript typecheck across all workspaces and root serverless target
npm run typecheck

# 3. Comprehensive test suite across all packages (234 tests total)
npm run test

# 4. Production build across all packages (shared, api, web)
npm run build

# 5. Vitest V8 code coverage on apps/api/src/domain/ (>= 90% threshold enforced)
npm run test:coverage
```

---

## 2. Test Suite & Coverage Report

Vitest V8 coverage enforces $\ge 90\%$ thresholds across lines, branches, functions, and statements for `apps/api/src/domain/**`:

```text
 % Coverage report from v8
----------------|---------|----------|---------|---------|-------------------
File            | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
----------------|---------|----------|---------|---------|-------------------
All files       |   98.59 |    93.33 |     100 |   98.59 |                   
 domain         |    98.2 |    93.33 |     100 |    98.2 |                   
  config.ts     |     100 |      100 |     100 |     100 |                   
  duplicates.ts |   97.74 |    86.48 |     100 |   97.74 | 209-211           
  emergency.ts  |     100 |      100 |     100 |     100 |                   
  fallback.ts   |   97.05 |    89.65 |     100 |   97.05 | 94-95             
  geo.ts        |     100 |      100 |     100 |     100 |                   
  messages.ts   |   95.91 |    66.66 |     100 |   95.91 | 73-74             
  rules.ts      |     100 |      100 |     100 |     100 |                   
  sla.ts        |     100 |      100 |     100 |     100 |                   
  status.ts     |   96.07 |    93.75 |     100 |   96.07 | 69-70             
  taxonomy.ts   |   95.58 |    93.75 |     100 |   95.58 | 90-92             
  ticketId.ts   |     100 |      100 |     100 |     100 |                   
  triage.ts     |     100 |      100 |     100 |     100 |                   
 domain/data    |     100 |      100 |     100 |     100 |                   
  keywords.ts   |     100 |      100 |     100 |     100 |                   
----------------|---------|----------|---------|---------|-------------------
```

- **Statements:** 98.59% (Threshold: 90%)
- **Branches:** 93.33% (Threshold: 90%)
- **Functions:** 100.00% (Threshold: 90%)
- **Lines:** 98.59% (Threshold: 90%)
- **Total Tests:** 234 passing across monorepo (198 in `@civicresolve/api`, 29 in `@civicresolve/shared`, 7 in `@civicresolve/web`).

---

## 3. Core Domain Safety Proofs

### A. Safety Invariant: Rules Only Raise Urgency, Never Lower It
Verified in [apps/api/tests/unit/domain/rules.test.ts](file:///Users/arnav/Desktop/CivicResolve/apps/api/tests/unit/domain/rules.test.ts#L104-L141).
An exhaustive 4D Cartesian product matrix ($4 \text{ base urgencies} \times 4 \text{ duplicate levels} \times 2 \text{ danger states} \times 2 \text{ sensitive site proximity states} = 64$ distinct states) proves:
$$\text{urgencyLevel}(\text{finalUrgency}) \ge \text{urgencyLevel}(\text{suggestionUrgency})$$

### B. Dependency Injection & Determinism Regression Test
Verified in [apps/api/tests/unit/domain/fixtures.test.ts](file:///Users/arnav/Desktop/CivicResolve/apps/api/tests/unit/domain/fixtures.test.ts#L48-L77).
All 20 multilingual complaints from [fixtures/complaints.json](file:///Users/arnav/Desktop/CivicResolve/fixtures/complaints.json) run through two separate invocations with injected timestamps `T1` and `T2` ($T2 = T1 + 30\text{ days}$) and identical random seeds. The test confirms:
1. When context timestamps match, outcomes are bitwise identical.
2. When context timestamps differ, SLA deadlines and candidate duplicate windows reflect the injected `now` without reading system clocks.

---

## 4. Demonstrated ESLint Boundary & Purity Enforcement

The scoped ESLint rules in [eslint.config.js](file:///Users/arnav/Desktop/CivicResolve/eslint.config.js#L54-L101) enforce that `apps/api/src/domain/**/*.{ts,tsx}`:
1. Cannot import from `ai/`, `repo/`, `http/`, or `node:crypto`.
2. Cannot call `Date.now()`, `Math.random()`, or `new Date()` without arguments.

During test validation, introducing violations produced:
```text
/Users/arnav/Desktop/CivicResolve/apps/api/src/domain/purity_demo.ts
  1:1  error  'crypto' import is restricted from being used by a pattern.
              Domain must be pure. Randomness must be injected (e.g. Uint8Array randomBytes)
  5:15 error  Date.now is restricted from being used.
              Domain functions must be pure. Inject 'now: Date' as a parameter
  6:18 error  'Math.random' is restricted from being used.
              Domain functions must be pure. Inject random bytes
  7:15 error  'new Date()' without arguments is forbidden in domain.
              Domain functions must be pure. Inject 'now: Date' as a parameter
```
The demo violation file was removed after verification.

---

## 5. Added & Modified Files Summary

### `packages/shared/src/`
- [packages/shared/src/index.ts](file:///Users/arnav/Desktop/CivicResolve/packages/shared/src/index.ts): Added `Department` enum & schema, `MISSING_INFO_FIELDS`, `TriageSuggestion`, `AppliedRule`, `FinalDecision`, `TicketEvent`, `TicketLocation`, `Ticket`, and `Result<T, E>` (`ok`, `err`).
- [packages/shared/src/index.test.ts](file:///Users/arnav/Desktop/CivicResolve/packages/shared/src/index.test.ts): 29 unit tests covering all enums, Zod schemas, boundary validations, and result helpers.

### `apps/api/src/domain/` (Pure Modules)
- [apps/api/src/domain/config.ts](file:///Users/arnav/Desktop/CivicResolve/apps/api/src/domain/config.ts): Frozen `DOMAIN_CONFIG` (thresholds, radii, SLA hours, emergency numbers).
- [apps/api/src/domain/messages.ts](file:///Users/arnav/Desktop/CivicResolve/apps/api/src/domain/messages.ts): Centralized user-facing plain language strings (no "triage" jargon) and follow-up question selector.
- [apps/api/src/domain/data/keywords.ts](file:///Users/arnav/Desktop/CivicResolve/apps/api/src/domain/data/keywords.ts): Multilingual danger & category keywords (English, Hindi, Marathi, Hinglish).
- [apps/api/src/domain/taxonomy.ts](file:///Users/arnav/Desktop/CivicResolve/apps/api/src/domain/taxonomy.ts): Category $\to$ Department mapping with Indian municipal equivalents and ward override capability.
- [apps/api/src/domain/geo.ts](file:///Users/arnav/Desktop/CivicResolve/apps/api/src/domain/geo.ts): Haversine distance, proximity checks, and sensitive site detection.
- [apps/api/src/domain/emergency.ts](file:///Users/arnav/Desktop/CivicResolve/apps/api/src/domain/emergency.ts): Regex Unicode-boundary matching for immediate life/safety threats.
- [apps/api/src/domain/rules.ts](file:///Users/arnav/Desktop/CivicResolve/apps/api/src/domain/rules.ts): Deterministic rule chain (`rule-01` to `rule-04`) enforcing monotonic urgency escalation.
- [apps/api/src/domain/fallback.ts](file:///Users/arnav/Desktop/CivicResolve/apps/api/src/domain/fallback.ts): Spam detection and rule-based keyword fallback when AI is unavailable.
- [apps/api/src/domain/triage.ts](file:///Users/arnav/Desktop/CivicResolve/apps/api/src/domain/triage.ts): Overall triage coordinator returning discriminated `TriageOutcome` (`emergency`, `rejected`, `follow_up`, `ticket`).
- [apps/api/src/domain/duplicates.ts](file:///Users/arnav/Desktop/CivicResolve/apps/api/src/domain/duplicates.ts): Spatiotemporal candidate duplicate detection (composite $0.6 \times \text{distance} + 0.4 \times \text{Jaccard text similarity}$).
- [apps/api/src/domain/sla.ts](file:///Users/arnav/Desktop/CivicResolve/apps/api/src/domain/sla.ts): Urgency-based SLA due dates and automated overdue escalation.
- [apps/api/src/domain/status.ts](file:///Users/arnav/Desktop/CivicResolve/apps/api/src/domain/status.ts): Role-based state machine enforcing legal transitions, event logging, and immutable updates.
- [apps/api/src/domain/ticketId.ts](file:///Users/arnav/Desktop/CivicResolve/apps/api/src/domain/ticketId.ts): Injected random-byte generator for Crockford Base32 IDs (`CR-XXXXXXXX`).
- [apps/api/src/domain/index.ts](file:///Users/arnav/Desktop/CivicResolve/apps/api/src/domain/index.ts): Domain barrel export.
- [apps/api/src/domain/README.md](file:///Users/arnav/Desktop/CivicResolve/apps/api/src/domain/README.md): Domain module documentation and pure architecture contracts.

### Fixtures & Tests (`apps/api/tests/unit/domain/`)
- [fixtures/complaints.json](file:///Users/arnav/Desktop/CivicResolve/fixtures/complaints.json): 20 realistic multilingual complaints covering all categories, edge cases, spam, and danger states.
- Unit test suites (198 tests):
  - `geo.test.ts` (5 tests)
  - `emergency.test.ts` (16 tests)
  - `taxonomy.test.ts` (11 tests)
  - `rules.test.ts` (12 tests)
  - `fallback.test.ts` (15 tests)
  - `triage.test.ts` (8 tests)
  - `duplicates.test.ts` (10 tests)
  - `sla.test.ts` (10 tests)
  - `status.test.ts` (71 tests)
  - `ticketId.test.ts` (5 tests)
  - `fixtures.test.ts` (21 tests)
  - `config.test.ts` (9 tests)
  - `app.test.ts` (5 integration tests)

### Documentation & Architecture
- [ARCHITECTURE.md](file:///Users/arnav/Desktop/CivicResolve/ARCHITECTURE.md): Updated with Phase 2.1 Domain Core architectural specifications and safety guarantees.

---

## 6. Deviations & Observations

- **Integration Test Socket Binding in Sandbox**: In standard sandbox mode without socket permissions, Express Supertest integration tests fail with `connect EPERM 127.0.0.1` because the sandbox disables local socket binding. Running `npm run test` with bypass sandbox confirms all integration and unit tests pass (234/234 passing). All domain unit tests run purely in-memory and require zero network access.
- **Strict Immutability**: All domain tests use strict mutable arrays for `events: []` and `missing_info: MissingInfoField[]` adhering to Zod-inferred types without `any`.
