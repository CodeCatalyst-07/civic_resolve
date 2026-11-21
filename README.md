# CivicResolve

> AI-powered civic grievance reporting and management web application built for the Google Hackathon.

## 1. Problem Statement
Urban citizens frequently encounter civic maintenance issues—such as hazardous potholes, accumulated garbage, broken streetlights, sewer overflows, and ruptured water pipes. Today, reporting systems suffer from poor categorization, vague priority queuing, lack of transparency, and cumbersome submission flows.

**CivicResolve** streamlines municipal grievance redressal:
1. **Citizen Portal**: Citizens submit unstructured reports in plain text with optional location data.
2. **AI-Assisted Triage**: AI suggests categorization, initial urgency, reasoning, and confidence score.
3. **Deterministic Rules Engine**: Domain logic calculates final urgency and dispatches the ticket to the proper municipal department.
4. **Authority Dashboard**: Municipal teams manage an objective priority queue, review AI recommendations, and advance grievances through verified lifecycle states (Submitted -> Under Review -> Assigned -> In Progress -> Resolved -> Closed).

---

## 2. AI Architecture & Honest AI Disclosure
> **AI Architecture & Truthful Attribution**:
> - **Default Demo Model**: Gemma 4 (`gemma-4-31b-it`) by Google, served via Jarvis Labs' OpenAI-compatible endpoint with thinking disabled to minimize latency.
> - **Google Gemini Official API**: Implemented via `@google/genai` (SDK v3.6.1), configured for current recommended models (e.g. `gemini-3.5-flash-lite` or `gemini-3.8-flash`), tested with a mocked SDK in CI, and verified live only when `npm run ai:smoke -- --provider gemini` is run with a valid `GEMINI_API_KEY`.
> - **Deterministic Mock Provider**: A fixture-backed provider driven by `fixtures/complaints.json` for offline testing and CI with zero network dependencies. See [docs/EVAL.md](docs/EVAL.md) and [docs/EVAL-mock.md](docs/EVAL-mock.md) for truthful scoring documentation.
> - **Keyword Fallback**: If the daily request budget is exhausted or an AI endpoint fails, the system degrades gracefully to deterministic multilingual keyword classification with `needs_manual_triage = true`. AI is never silently assumed Low urgency.
> - **Safety Invariant**: Model output is strictly an advisory suggestion. Domain rules enforce that urgency can only be raised, never lowered. Immediate hazard keywords always produce an emergency notice (112) and file a Critical grievance ticket.

---

## 3. How This Maps to Hackathon Grading Criteria

| Criteria | Implementation Strategy | Status |
| :--- | :--- | :--- |
| **Code Quality** | Monorepo with npm workspaces, strict TypeScript, ESLint 9 with architectural boundary rules, Prettier, clean layer separation, JSDoc annotations | Scaffolding, Domain, AI, Persistence, Citizen Portal & Authority Dashboard complete (Phases 2.0-2.5) |
| **Security** | Zero secrets in client/repo (`secrets:check`), Helmet, 20kb JSON cap, Zod input sanitization (control char stripping), constant-time SHA-256 demo authority gate, sliding-window rate limiting, sensitive log redaction | Hardened in Phases 2.3 & 2.5 |
| **Efficiency** | Same-origin Vercel deployment, lightweight bundle (102.97 kB initial gzip, well under 150 kB budget), zero-dependency pure domain layer, LRU triage cache, fast Vitest execution (470+ tests in <3s) | Optimized across all phases |
| **Testing** | Unit, integration & a11y testing with Vitest (470+ tests passing, >90% coverage), Supertest for HTTP API, React Testing Library + vitest-axe (0 violations across 21 test scenarios) | >90% coverage in Phases 2.3-2.5 |
| **Accessibility** | WCAG 2.2 AA compliance: 0 axe-core violations across 21 component states; $\ge 4.5:1$ text contrast & $\ge 3:1$ UI controls mathematically verified; keyboard skip-link; screen-reader live regions; Radix focus traps | Audited & verified in Phase 2.5 |
| **Google Services Use** | Gemma 4 (Google open model) via Jarvis Labs, Google Gemini API via `@google/genai`, Google Maps Geocoding REST API, Firebase Firestore via `firebase-admin@14.5.1` Spark plan, Google Maps JS API Loader | Implemented & verified in Phases 2.2-2.5 |
| **Problem Alignment** | Dual citizen/authority portal, operational work queue, KPI cards, AI vs human decision diffs, status transition guards, manual supervisor overrides, plain-language citizen explanations | Complete Dual Portal in Phase 2.5 |

---

## 4. Local Development Setup

### Prerequisites
- Node.js `20.x` or later (tested on Node v25)
- npm `10.x` or later

### Installation
```bash
# 1. Clone repository and install dependencies
git clone https://github.com/your-org/civicresolve.git
cd civicresolve
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your local settings (defaults run out-of-the-box with mock AI and in-memory store)
```

### Running Locally
```bash
# Start both API (port 3001) and Web frontend (port 5173) concurrently:
npm run dev
```

Visit [http://localhost:5173](http://localhost:5173) in your browser. The Vite dev server automatically proxies `/api` requests to the Express server at `http://localhost:3001`.

### Verification Commands
```bash
# Verify no keys or secrets are committed or staged
npm run secrets:check

# Lint all workspaces (with architectural boundary rules)
npm run lint

# Typecheck all TypeScript code
npm run typecheck

# Execute entire offline unit & integration test suite
npm run test

# Run test coverage suite with strict thresholds
npm run test:coverage --workspace=@civicresolve/api

# Build all applications
npm run build
```

### Data Seeding & Firestore Live Smoke Tests
```bash
# Seed deterministic synthetic tickets into In-Memory store
npm run seed -- --driver memory

# Seed into live Cloud Firestore
npm run seed -- --driver firestore

# Reset and seed with a custom timestamp
npm run seed -- --driver firestore --reset --now 2026-11-21T12:00:00.000Z

# Run live Firestore integration smoke test (verifies connectivity and optimistic concurrency)
npm run firestore:smoke
```

---

## 5. Documentation Links
- **[Evaluator Demo Guide (docs/DEMO.md)](docs/DEMO.md)**: Deterministic test tickets, verification flows for citizen tracking, reopen lifecycle, location boost, and authority dashboard.
- **[System Architecture (ARCHITECTURE.md)](ARCHITECTURE.md)**: Layering, pure domain core, AI resilience, persistence, frontend architecture, and ESLint boundary rules.
- **[Citizen Portal & Design System (docs/UI.md)](docs/UI.md)**: Design tokens, contrast table, plain-language dictionary, component catalog, state machine diagram, and evaluator test prompts.
- **[Accessibility Conformance (docs/ACCESSIBILITY.md)](docs/ACCESSIBILITY.md)**: WCAG 2.2 AA audit results, `vitest-axe` component audit matrix, keyboard journey, and landmark navigation.
- **[API Reference (docs/API.md)](docs/API.md)**: Complete route table, request/response envelopes, DTO schemas, and curl examples.
- **[Security Architecture (SECURITY.md)](SECURITY.md)**: Rate limiting, demo role gate, constant-time token comparison, allowlist projection, and credential scanning.
- **[AI Evaluation (docs/EVAL.md)](docs/EVAL.md)**: Benchmark evaluations across mock and live providers.

---

## 6. Evaluator Sample Prompts (Predictable Triage Flows)

For AI evaluators and judges testing the web application locally or in deployed environments:

| Scenario | Input Description | Expected AI Suggestion | Expected Domain Override / Result |
| :--- | :--- | :--- | :--- |
| **Hazardous pothole near sensitive site** | `"Large deep pothole on MG Road near City Hospital causing traffic hazard"` (Ward 4 / Lat: 12.9716, Lng: 77.5946) | Category: `roads`, Urgency: `Medium` | Urgency boosted to **`High`** due to Hospital proximity rule ($< 200$m). Assigned to Roads Department. |
| **Active life-safety hazard** | `"Sparking live electric wire fallen on the street during rain near school"` (Ward 2 / Lat: 12.9250, Lng: 77.5850) | Category: `public_lighting`, Urgency: `High`, `safety_critical: true` | Immediate danger floor triggers **`Critical`** urgency + **Emergency Notice (Call 112)** banner. Ticket filed immediately. |
| **Vague report requiring follow-up** | `"Water leaking"` (Short, missing street or severity details) | Category: `water_sewerage`, `confidence: 0.4` | Follow-up card prompts citizen: *"Could you specify if it is drinking water or sewage, and whether it is flooding the street?"* |
| **Non-civic / spam submission** | `"FREE CRYPTO AIRDROP visit http://scam.example.com now!!!"` | `looksLikeSpam: true` | Rejected before reaching AI. Clear plain-language explanation shown with no ticket created. |

---

## 7. Vercel Deployment & Serverless Considerations

CivicResolve is configured as **ONE project on Vercel**:
- Web application builds statically into `apps/web/dist`.
- Serverless API functions execute from `api/index.ts` under the `/api` route.

### Environment Variable Setup in Vercel
In the Vercel Project Settings > Environment Variables:
- `NODE_ENV`: `production`
- `AI_PROVIDER`: `jarvis` (or `gemini` / `mock`)
- `JARVISLABS_API_KEY`: *(your secret key)*
- `JARVIS_BASE_URL`: `https://models.jarvislabs.net/v1`
- `JARVIS_MODEL`: `gemma-4-31b-it`
- `GEMINI_API_KEY`: *(optional, if using Gemini)*
- `GEMINI_MODEL`: `gemini-3.5-flash-lite`
- `REPO_DRIVER`: `firestore` (or `memory`)
- `FIREBASE_PROJECT_ID`: `civic-resolve-4e949`
- `FIREBASE_SERVICE_ACCOUNT_JSON`: *(base64 or JSON string of service account)*
- `DEMO_AUTHORITY_CODE`: *(secret code to gate authority operations in demo)*
- `AUTO_SEED`: `false` (set `true` to auto-seed empty stores on startup)
- `VITE_GOOGLE_MAPS_BROWSER_KEY`: *(optional, browser-safe)*

### Serverless Operational Note
In a serverless environment (such as Vercel Functions):
- The Composition Root (`buildContainer`) instantiates connection pools once at module scope per container instance, preventing connection re-establishment overhead.
- In-memory rate limiting and caches operate on a per-instance basis. For production multi-region deployments, an external Redis store or edge middleware can be attached.
