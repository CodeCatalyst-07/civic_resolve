# CivicResolve

> AI-Assisted Civic Grievance Management — Built for Google PromptWars

[![CI](https://github.com/CodeCatalyst-07/civic_resolve/actions/workflows/ci.yml/badge.svg)](https://github.com/CodeCatalyst-07/civic_resolve/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## Live Demo & Operational Status

- **Live Deployed Web Application**: [https://civicresolve-chi.vercel.app/](https://civicresolve-chi.vercel.app/)
- **Live Health & Configuration Diagnostics**: [https://civicresolve-chi.vercel.app/api/health](https://civicresolve-chi.vercel.app/api/health)
- **Demo Mode Notice**: All data displayed in the live application is synthetic for hackathon evaluation purposes. The authority staff view is currently open in evaluation demo mode (`authorityGate: "open"`), allowing judges to inspect both citizen and authority workflows directly without requiring a separate access code.

---

## Judge Quick Start (60-Second Walkthrough)

1. **Report an Issue (Citizen Flow)**:
   - Visit [Report Page](https://civicresolve-chi.vercel.app/report).
   - Select a quick prompt (e.g. *"Large deep pothole on MG Road near City Hospital"*) or type an unstructured grievance.
   - Choose a location on the interactive map or ward picker.
   - Click **Analyze with AI** to view real-time triage recommendation.
2. **Review AI Result Card**:
   - Inspect the AI recommendation card displaying category, suggested urgency, recommended department, confidence score, safety hazard status, and plain-language reasoning.
3. **Submit and Track**:
   - Click **Submit Grievance** to generate a unique human-readable tracking ID (e.g. `BLR-RD-202611-ABCD`).
   - You are redirected to the [Track Page](https://civicresolve-chi.vercel.app/track), showing the citizen timeline, status progression, and demo target resolution time.
4. **Switch to Staff View (Authority Flow)**:
   - In the top-right header, click the role switcher icon and toggle from **Citizen** to **Authority**.
5. **Triage & Update Status**:
   - Navigate to the [Authority Dashboard](https://civicresolve-chi.vercel.app/authority).
   - Use the KPI tiles to filter by **Critical** or **Overdue** tickets.
   - Click any ticket to open the detail panel, review AI vs domain rule diffs, enter staff notes, and advance the status (e.g. `Under Review` -> `In Progress` -> `Resolved`).

---

## Problem Statement

Urban civic maintenance—including hazardous potholes, broken streetlights, sewer overflows, garbage accumulation, and water pipeline leaks—relies heavily on timely citizen reporting. However, traditional municipal grievance systems struggle with:
- Vague and fragmented complaint taxonomies that confuse citizens
- Lack of intelligent urgency prioritization, causing life-safety hazards to languish in backlogs
- Opaque tracking mechanisms that leave citizens uninformed about resolution progress
- Disconnected municipal dispatch routing between departments

**CivicResolve** addresses these challenges by uniting an accessible citizen reporting portal with explainable AI triage, deterministic domain safety floors, transparent public tracking, and an operational municipal authority queue.

---

## Problem Statement to Code

| Requirement | Implementation Feature | File / Route Reference |
| :--- | :--- | :--- |
| **Simple Reporting Interface** | 3-step accessible flow with plain language, quick prompts, location picker, and contrast guarantees | [apps/web/src/app/pages/ReportPage.tsx](apps/web/src/app/pages/ReportPage.tsx) |
| **AI Understands Grievances** | Multi-turn triage, plain summary generation, confidence scoring, and prompt injection defense | [apps/api/src/ai/jarvis.ts](apps/api/src/ai/jarvis.ts), [apps/api/src/ai/gemini.ts](apps/api/src/ai/gemini.ts) |
| **Categorisation & Taxonomies** | 6 municipal categories mapped to departments with multilingual keyword matching | [apps/api/src/domain/taxonomy.ts](apps/api/src/domain/taxonomy.ts), [packages/shared/src/index.ts](packages/shared/src/index.ts) |
| **Urgency & Safety Floors** | Deterministic domain rules, 112 emergency notice triggering, and monotonic urgency enforcement | [apps/api/src/domain/rules.ts](apps/api/src/domain/rules.ts), [apps/api/src/domain/emergency.ts](apps/api/src/domain/emergency.ts) |
| **Department Recommendation** | Objective dispatch assignment with demo target times (SLAs) per category | [apps/api/src/domain/sla.ts](apps/api/src/domain/sla.ts), [apps/api/src/services/ticketService.ts](apps/api/src/services/ticketService.ts) |
| **Submission to Tracking** | Public tracking with timeline, reopen action, community support counters, and public feed | [apps/api/src/http/routes/reports.ts](apps/api/src/http/routes/reports.ts), [apps/web/src/app/pages/TrackPage.tsx](apps/web/src/app/pages/TrackPage.tsx) |
| **Resolution & Authority Queue** | Filterable priority queue, KPI tiles, AI vs human decision diffs, status transition guards | [apps/api/src/http/routes/authority.ts](apps/api/src/http/routes/authority.ts), [apps/web/src/app/pages/AuthorityPage.tsx](apps/web/src/app/pages/AuthorityPage.tsx) |

---

## Architecture & Repository Map

```
┌────────────────────────────────────────────────────────┐
│               CivicResolve Web (Vite + React)          │
│   Citizen Portal  │  Track View  │  Authority Queue    │
└───────────────────────────┬────────────────────────────┘
                            │ HTTP / JSON
┌───────────────────────────▼────────────────────────────┐
│            CivicResolve API (Node + Express)           │
│   Rate Limiting  │  Zod Validation  │  Degraded Guard  │
└───────┬───────────────────┬────────────────────┬───────┘
        │                   │                    │
┌───────▼────────┐  ┌───────▼────────┐   ┌───────▼───────┐
│  Domain Rules  │  │  AI Providers  │   │  Persistence  │
│  • Emergency   │  │  • Gemma 4     │   │  • Firestore  │
│  • Proximity   │  │  • Gemini SDK  │   │  • In-Memory  │
│  • Duplicates  │  │  • Fallback    │   │               │
└────────────────┘  └────────────────┘   └───────────────┘
```

### Folder Map

```
├── .github/workflows/ci.yml       # Dual Node 20.x & 22.x CI matrix
├── apps/
│   ├── api/                       # Express serverless backend
│   │   ├── src/
│   │   │   ├── ai/                # Gemma 4 (Jarvis), Gemini SDK, Mock, Fallback
│   │   │   ├── domain/            # Pure domain rules, emergency, SLA, taxonomy
│   │   │   ├── http/              # Express routes, controllers, middleware
│   │   │   ├── repo/              # Firestore & In-Memory repository drivers
│   │   │   └── services/          # Triage, geocoding, cache, and ticket services
│   │   └── tests/                 # Unit & integration tests (337 passing)
│   └── web/                       # React frontend SPA
│       ├── src/
│       │   ├── app/               # Shell layout, routing, error boundaries
│       │   ├── features/
│       │   │   ├── citizen/       # Reporting stepper, tracking, map picker
│       │   │   └── authority/     # Priority queue, KPI tiles, detail drawer
│       │   └── styles/            # Design tokens & contrast test suite
│       └── src/test/              # RTL & vitest-axe accessibility tests (165 passing)
├── packages/
│   └── shared/                    # Shared Zod schemas, contracts, and DTOs (40 passing)
├── docs/                          # Architecture, UI, Accessibility & API guides
└── scripts/                       # Verification & security scanning tools
```

---

## Honest AI Disclosure

- **Default Production Model**: Google Gemma 4 (`gemma-4-31b-it`), hosted via Jarvis Labs OpenAI-compatible inference endpoint with thinking disabled to minimize response latency.
- **Official Google Gemini API**: Implemented via `@google/genai` (SDK v3.6.1), tested with SDK mocks in CI, and verified live via `npm run ai:smoke -- --provider gemini` when `GEMINI_API_KEY` is supplied.
- **Deterministic Mock Provider**: A fixture-backed provider utilizing `fixtures/complaints.json` for offline testing, local development, and reproducible CI test runs with zero network overhead.
- **Keyword Fallback**: If upstream AI calls timeout or the daily request budget is reached, the system gracefully degrades to multilingual keyword classification with `needs_manual_triage = true`. AI is never silently assumed to be Low urgency.
- **Monotonic Safety Invariant**: AI output is strictly an advisory suggestion. Deterministic domain rules ensure that urgency can only be raised (never lowered below safety floors). Critical hazards (e.g. fallen live wires) always trigger an immediate 112 emergency notice and assign a Critical grievance ticket.

---

## Google Services Integration

| Service | Live in Production | Implemented & Optional (Check `/api/health`) | Verified by Smoke Test Only |
| :--- | :---: | :---: | :---: |
| **Gemma 4** (`gemma-4-31b-it`) | YES (Default live provider via Jarvis Labs) | — | Verified in CI & live |
| **Google Cloud Firestore** | YES (Production repo driver via `firebase-admin@14.5.1` & `@google-cloud/firestore@9.4.1`) | — | Verified in live production |
| **Google Maps Geocoding API** | — | YES (Server geocoding via `GOOGLE_MAPS_GEOCODING_API_KEY`; falls back to ward centroids when unset) | `npm run geocode:smoke` |
| **Google Maps JavaScript API** | — | YES (Interactive client map via `VITE_GOOGLE_MAPS_BROWSER_KEY`; falls back to accessible coordinate picker when unset) | Component test verified |
| **Google Gemini API** (`@google/genai@3.6.1`) | — | Configurable via `AI_PROVIDER=gemini` & `GEMINI_API_KEY` | `npm run ai:smoke -- --provider gemini` |

---

## Hackathon Criteria & Verification Evidence

| Criteria | Implementation Strategy | Evidence Links |
| :--- | :--- | :--- |
| **Code Quality** | Monorepo structure, strict TypeScript, ESLint 9 architectural boundary rules, Prettier formatting | [ARCHITECTURE.md](ARCHITECTURE.md), [eslint.config.js](eslint.config.js), [tsconfig.base.json](tsconfig.base.json) |
| **Security** | Zero secrets in repo/client, Helmet, safe body limits, Zod control character stripping, constant-time demo gate, fixed-window rate limiting | [SECURITY.md](SECURITY.md), [scripts/secretsCheck.mjs](scripts/secretsCheck.mjs), [apps/api/src/app.ts](apps/api/src/app.ts) |
| **Efficiency** | Same-origin Vercel bundle (103.25 kB initial gzip JS, under 150 kB budget), LRU triage cache, fast Vitest execution | [apps/web/vite.config.ts](apps/web/vite.config.ts), [apps/api/src/services/cache.ts](apps/api/src/services/cache.ts) |
| **Testing** | 542 unit/integration/a11y tests, >90% coverage in API & Web, 0 a11y violations across 22 scenarios | [apps/api/tests](apps/api/tests), [apps/web/src/test](apps/web/src/test), [packages/shared/src/index.test.ts](packages/shared/src/index.test.ts) |
| **Accessibility** | Designed to WCAG 2.2 AA with automated contrast and axe checks (no manual screen-reader audit), keyboard skip-links, Radix focus traps | [docs/ACCESSIBILITY.md](docs/ACCESSIBILITY.md), [apps/web/src/test/a11y.test.tsx](apps/web/src/test/a11y.test.tsx) |
| **Google Services** | Gemma 4, Cloud Firestore, Maps Geocoding REST API, Maps JS API Loader, Gemini GenAI SDK | [apps/api/src/ai](apps/api/src/ai), [apps/api/src/repo/firestore.ts](apps/api/src/repo/firestore.ts) |
| **Problem Alignment** | Dual citizen/authority portal, operational priority queue, KPI tiles, AI vs human decision diffs, status transition guards | [docs/DEMO.md](docs/DEMO.md), [docs/UI.md](docs/UI.md), [docs/API.md](docs/API.md) |

---

## Local Development Setup

### Prerequisites
- Node.js `20.x` or `22.x` (matching GitHub Actions CI)
- npm `10.x` or later

### Installation & Execution
```bash
# 1. Clone repository
git clone https://github.com/CodeCatalyst-07/civic_resolve.git
cd civic_resolve

# 2. Install dependencies
npm ci

# 3. Configure environment
cp .env.example .env

# 4. Build shared contracts and packages
npm run build

# 5. Start development servers concurrently (API on 3001, Web on 5173)
npm run dev
```

### Full Verification Suite
```bash
# Runs secrets check, linting, typechecking, tests, and builds
npm run verify
```

---

## Seeding & Data Management

```bash
# Seed deterministic test tickets into In-Memory store
npm run seed -- --driver memory

# Seed into live Cloud Firestore
npm run seed -- --driver firestore

# Reset Firestore collection and re-seed (requires confirmation flag)
CONFIRM_RESET=yes npm run seed -- --driver firestore --reset
```

---

## Evaluator Sample Prompts (Real Output from `npm run demo:samples`)

*Note: The table below reflects the deterministic output generated by the mock provider and domain rules engine. Live outputs from a remote LLM may vary slightly in confidence scores and phrasing.*

| Scenario | Category | Urgency | Department | Outcome Kind | Emergency? | Applied Rules |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **Pothole near School (Location Boost)** | `pothole` | `critical` | Roads & Infrastructure | `ticket` | No | R4_DUPLICATE_BOOST |
| **Life-Safety Hazard (112 Emergency Notice)** | `public_hazard` | `critical` | Public Health & Safety | `ticket` | YES (112) | None |
| **Vague Complaint (Follow-up Question)** | `-` | `-` | None | `follow_up` | No | Follow-up question generated |
| **Non-Civic Spam (Instant Rejection)** | `-` | `-` | None | `rejected` | No | Rejection explanation provided |
| **Mixed Civic Grievance (Multi-issue Redressal)** | `garbage` | `high` | Sanitation & Waste Management | `ticket` | No | R4_DUPLICATE_BOOST |
| **Prompt Injection Defense (Maintains Hazard Floor)** | `public_hazard` | `critical` | Public Health & Safety | `ticket` | YES (112) | None |

---

## Deployment & Environment Variables

CivicResolve deploys as a unified monorepo application on Vercel:
- Frontend: Statically bundled by Vite into `apps/web/dist`
- Backend: Serverless Express function operating through `api/index.ts`

### Required Environment Variable Names (Values are secret)
- `NODE_ENV`
- `AI_PROVIDER`
- `JARVISLABS_API_KEY`
- `JARVIS_BASE_URL`
- `JARVIS_MODEL`
- `GEMINI_API_KEY` (optional)
- `GEMINI_MODEL` (optional)
- `REPO_DRIVER`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_SERVICE_ACCOUNT_JSON`
- `DEMO_AUTHORITY_CODE`
- `AUTO_SEED`
- `GOOGLE_MAPS_GEOCODING_API_KEY` (optional)
- `VITE_GOOGLE_MAPS_BROWSER_KEY` (optional)

---

## Known Limitations

- **Geocoding & Interactive Maps**: Requires active Google Cloud API keys with the Maps JavaScript API and Geocoding API enabled. In the absence of keys, the application falls back gracefully to Bangalore ward centroids and accessible coordinate/ward pickers.
- **Serverless In-Memory State**: Fixed-window rate limiting and daily AI budget tracking run in-memory per serverless container instance. In high-traffic multi-region production, these would be backed by Redis or edge middleware.
- **Authority Access in Demo**: For hackathon evaluation convenience, the authority dashboard operates with an open demo gate or shared access code rather than enterprise single sign-on (SSO).

---

## Future Work

- **Multimodal Photo Inspection**: Direct image upload enabling Gemma/Gemini vision models to assess pothole depth, garbage pile volume, and verify reported civic damage.
- **Enterprise Authentication**: Integration with Firebase Auth or municipal OAuth/SAML providers for granular, role-based departmental permissions.
- **Proactive Citizen Notifications**: Real-time status updates and SMS/WhatsApp notifications as grievance milestones are reached.
- **Geographic Clustering**: Heatmap aggregation and geospatial clustering for municipal authorities to identify infrastructure fault patterns.

---

## License

This project is licensed under the [MIT License](LICENSE).
