# System Architecture — CivicResolve

## 1. Architectural Layer Diagram

```
+-------------------------------------------------------------------------+
|                              apps/web                                   |
|       (React 18, Vite, React Router, Tailwind CSS, shadcn/ui)           |
+-------------------------------------------------------------------------+
                                    |
                    HTTP / JSON API (Same-Origin /api)
                                    |
+-------------------------------------------------------------------------+
|                        apps/api (HTTP Layer)                            |
|        (Express 4, Helmet, RateLimiter, RequestId, Role Middleware)     |
+-------------------------------------------------------------------------+
                                    |
+-------------------------------------------------------------------------+
|                            Services Layer                               |
|              (TicketService, TriageService, Geocoding)                  |
+-------------------------------------------------------------------------+
            /                             |                          \
           /                              |                           \
+----------------------+      +----------------------+      +--------------------+
|       AI Layer       |      |     Domain Layer     |      |  Repository Layer  |
|  (Triage Providers)  |      |   (Pure Functions)   |      | (TicketRepository) |
|  - Jarvis (Gemma 4)  |      |   - Urgency Engine   |      |  - In-Memory Repo  |
|  - Gemini 3.5 Flash  |      |   - Department Rules |      |  - Firestore Repo  |
|  - Deterministic Mock|      |   - State Machine    |      +--------------------+
+----------------------+      +----------------------+
```

---

## 2. Decision Pipeline & Triage Flow

```
[ Citizen Report Input ] (Description, Location, User Context)
          |
          v
[ Input Sanitization ] (Strip control chars, length validation via Zod)
          |
          v
[ Spam & Validity Check ] (Short gibberish, repeated characters, promo links)
          |
         / \
 [Spam / Non-Civic]  [Valid Civic Text]
        /                     \
       v                       v
[Rejection Outcome]     [ AI Triage Suggestion ]
(With emergency notice   (Or fallback keyword classifier if AI is offline)
 if hazard detected)           |
                               v
                       [ Confidence & Completeness Check ]
                              /                 \
        [Confidence < 0.6 or Missing Info]   [Confidence >= 0.6]
                     |                                |
        [Follow-up Round < Max (2)?]                  |
                 /          \                         |
               Yes           No                       |
               /              \                       |
              v                v                      |
      [Follow-Up Outcome]  [Flag: needs_manual_triage]|
      (Targeted question)      \                     /
                                \                   /
                                 v                 v
                       [ Deterministic Rules Engine (applyRules) ]
                       - R1: Immediate Danger Floor (Critical)
                       - R2: Safety Floor (High)
                       - R3: Sensitive Site Proximity Boost (+1 level)
                       - R4: Duplicate Report Volume Boost (+1 level)
                                         |
                                         v
                       [ Department Lookup (resolveDepartment) ]
                       - Deterministic category-to-department table
                       - Injected ward override capability
                       - AI NEVER chooses the department
                                         |
                                         v
                       [ Confirmed Ticket Outcome ]
                                         |
                +------------------------+------------------------+
                |                                                 |
                v                                                 v
   [ Duplicate Detection ]                               [ SLA Lifecycle ]
   - Within 150m radius & 14 days                        - Compute due_at deadline
   - Jaccard token similarity ranking                    - Overdue auto-escalation (+1 level)
   - Increments duplicate count                          - Role-based transition guard
```

---

## 3. Triage Pipeline, AI Providers & Server-Side Geocoding

### Complete Grievance Analysis Flow (Cheap First)
```text
Citizen Grievance Submission (description, location, ward)
    │
    ▼
1. Sanitize Input: strip ASCII control characters and normalize whitespace
    │
    ▼
2. Spam Check (looksLikeSpam):
    ├── If spam (repeated chars, emojis only, promotional URLs)
    │     └── Reject immediately without calling AI (ai_source: keyword_fallback, outcome: rejected)
    └── If legitimate text -> Proceed to Step 3
    │
    ▼
3. Cache Lookup (computeTriageCacheKey):
    ├── SHA-256(normalizedText + ward)
    ├── If cache hit: reuse cached TriageSuggestion (cached: true)
    └── If cache miss: proceed to Step 4
    │
    ▼
4. Daily Budget Check (budget.canConsume):
    ├── If budget exhausted: degrade gracefully to domain classifyByKeywords
    │     (ai_source: keyword_fallback, degraded: true, needs_manual_triage: true)
    └── If budget available: proceed to Step 5
    │
    ▼
5. AI Provider Execution (withResilience decorator):
    ├── Models: Gemma 4 via Jarvis Labs (default) OR Gemini via @google/genai OR MockProvider
    ├── Prompt Injection Defense: Delimited <complaint>...</complaint> with neutralized tags
    ├── Resilience Retries: 1 retry with exponential backoff on 429/5xx/timeout; 1 repair retry on schema parse error
    ├── On provider success: consume budget and store in LRU cache
    └── On provider failure: degrade gracefully to classifyByKeywords (degraded: true, needs_manual_triage: true)
    │
    ▼
6. Spatiotemporal Duplicate Evaluation (findDuplicateCandidates):
    ├── Evaluates open tickets matching category within 150m radius & 14 days
    ├── Computes composite score: 0.6 * distance_score + 0.4 * text_jaccard_similarity
    └── Passes duplicateCount to domain rules context
    │
    ▼
7. Domain Rules Engine (decideTriage / applyRules):
    ├── Evaluates R1 (immediate danger -> Critical floor, emergency_notice: 112)
    ├── Evaluates R2 (safety_critical -> at least High)
    ├── Evaluates R3 (sensitive site proximity -> +1 level)
    ├── Evaluates R4 (duplicate cluster >= 3 -> +1 level)
    └── Resolves municipal department deterministically
    │
    ▼
8. Outcome Generation (TriageOutcome):
    ├── "ticket": Confirmed grievance ticket (always filed when danger is detected)
    ├── "follow_up": Clarifying question round (bypassed if danger detected)
    └── "rejected": Non-civic issue guidance (never rejected if danger detected)
    │
    ▼
9. Privacy-Safe Metadata Logging:
    └── Logs provider name, outcome kind, cached/degraded flags, duration; NEVER logs complaint text or keys.
```

### Server-side Geocoding with Graceful Degradation
- **`GoogleGeocodingProvider`**: Connects to Google Maps Geocoding REST API with `region=in` bias, timeout from `GEOCODE_TIMEOUT_MS`, in-memory cache, and mainland India bounding box validation (6°N-38°N, 68°E-98°E).
- **`NullGeocodingProvider`**: Fallback provider when `GOOGLE_MAPS_SERVER_KEY` is omitted, returning `not_configured` while keeping all grievance triage capabilities 100% operational offline.

---

## 4. Persistence Layer & Ticket Service (Phase 2.3)

### Repository Layer (`apps/api/src/repo`)
A unified `TicketRepository` contract decouples business workflows from the database implementation:
- **`InMemoryTicketRepository`**: Deterministic, deep-cloned memory store with cursor pagination, multi-field filtering, and version checking. Used in tests, offline local development, and CI.
- **`FirestoreTicketRepository`**: Production driver backed by Google Cloud Firestore (`firebase-admin@14.5.1`). Implements optimistic concurrency inside atomic Firestore transactions (`transaction.get` -> verify `version === ticket.version` -> `transaction.set(..., { version: version + 1 })`).
- **Data Protection (`firestore.rules`)**: Client SDK direct access is completely disabled (`allow read, write: if false;`). All reads and writes must pass through the Express API backend via Firebase Admin SDK.
- **Optimized Indexes (`firestore.indexes.json`)**: Configured for sorting by urgency and `due_at` with compound filters (`status`, `ward`, `category`).

### Ticket Service (`apps/api/src/services/ticketService.ts`)
Encapsulates high-level lifecycle orchestrations:
1. **Allowlist DTO Projection**:
   - `toPublicTicket`: Citizen privacy projection. Strips raw descriptions, precise GPS coordinates, AI tokens, and administrative flags. Only returns non-sensitive fields (`id`, `status`, `category`, `urgency`, `department`, `summary`, `ward`, `due_at`, `overdue`, `duplicate_count`, `timeline`).
   - `toAuthorityTicket`: Full internal projection for municipal dispatchers.
2. **Community Support Escalation**:
   - Nearby citizens clicking "Add your voice" increment `duplicate_count`. The service dynamically re-runs domain rules. Invariant: Urgency can only increase, never decrease.
3. **Lazy SLA Escalation**:
   - Reads dynamically check if `due_at < now` and trigger auto-escalation (+1 urgency level) if not already escalated, persisting the change immediately.
4. **Citizen Reopen Control**:
   - Enforces business rule: Resolved tickets can be reopened by citizens strictly once (`reopen_count <= 1`).

---

## 5. Composition Root & HTTP API

### Composition Root Pattern (`apps/api/src/compose.ts`)
- Pure dependency injection container.
- `buildContainer(config, overrides?)` instantiates repositories, AI providers, geocoding, caches, budget managers, clock, and randomness generators.
- `createApp(config, container?)` accepts an optional container for test isolation.
- In Vercel serverless deployment (`api/index.ts`), the container is instantiated **once at module scope** across invocations, reusing database connection pools and AI client instances.

### Security & Rate Limiting
- **Demo Role Gate**: `X-Demo-Role` (`citizen` or `authority`). If `DEMO_AUTHORITY_CODE` is set, authority operations require `X-Demo-Authority-Code` compared via SHA-256 constant-time comparison (`safeCompareCodes`) to prevent timing attacks.
- **Sliding-Window Rate Limiting**:
  - Global: 100 requests / 15 minutes.
  - Grievance analysis (`/api/reports/analyze`): 20 requests / minute.
  - Grievance submission (`/api/reports`): 10 requests / minute.
  - Community support (`/api/tickets/:id/support`): 30 requests / minute.
  - Server-side geocoding (`/api/geocode`): 30 requests / minute.
- **Payload Protection**: Express JSON body size strictly capped at 20KB (`limit: '20kb'`).

---

## 6. Shared Types & Contracts (`packages/shared`)
Both `apps/web` and `apps/api` share canonical types and Zod schemas from `@civicresolve/shared`:
- **Enums**: `Category`, `Urgency`, `Status`, `Role`, `Department`, `AiSource`
- **Domain Schemas**: `createReportInputSchema`, `triageSuggestionSchema`, `finalDecisionSchema`, `ticketSchema`
- **DTO Views**: `publicTicketViewSchema`, `authorityTicketViewSchema`
- **Request Schemas**: `analyzeReportInputSchema`, `submitReportInputSchema`, `statusUpdateInputSchema`, `overrideInputSchema`, `ticketQuerySchema`
- **API Helpers**: `apiSuccess<T>`, `apiError(code, message)`

---

## 7. Strict Layer Boundaries & Architectural Purity
Layer integrity is statically verified by custom ESLint boundary rules:
- **`domain/`**: Pure functions only. Zero I/O, no network, no dates without parameters, no crypto. Cannot import `ai/`, `repo/`, `services/`, or `http/`.
- **`ai/`**: Cannot import `repo/`, `services/`, or `http/`.
- **`repo/`**: Cannot import `ai/`, `services/`, or `http/`.
- **`services/`**: Banned from importing `http/` or concrete repo implementations (`repo/memory*`, `repo/firestore*`). Only imports `repo/types.js`.
- **`http/`**: Banned from importing `ai/` or `repo/` directly. All operations route through `services/` and the composition root.

---

## 8. Deterministic Seed Data
- Pure generator `generateSeedTickets(now, randomBytes)` generates 39 realistic municipal grievance tickets across 8 synthetic wards.
- Covers varied categories, statuses, overdue tickets, 2 duplicate clusters, and an active safety hazard.
- CLI script `apps/api/scripts/seed.ts` supports seeding into both in-memory and live Cloud Firestore instances (`npm run seed -- --driver firestore`).

---

## 9. Frontend Architecture & Citizen Portal (Phase 2.4)

### Component Hierarchy & Route Layout
```text
Layout (Semantic header, nav, SkipLink, DemoBanner, RoleSwitcher, main, footer)
  │
  ├── /               -> HomePage (Hero, How It Works, PublicStatsStrip, RecentReportsList, TrackBox)
  ├── /report         -> ReportPage (Multi-Step Report Flow state machine)
  │                        ├── Step 1: StepDescribe (Char counter 10-1000, live region, prompt chips)
  │                        ├── Step 2: StepLocation (Ward selector, GPS geolocate, LocationMap)
  │                        ├── Step 3: StepReview (TriageCard, SimilarReportsPanel, Category Override)
  │                        └── Step 4: StepConfirmation (Crockford Base32 8-char code receipt, CopyButton)
  ├── /track          -> TrackPage (Search & validation input for Crockford Base32 ticket codes)
  ├── /track/:id      -> TrackPage (Public allowlist DTO view, Timeline, Support Button, ReopenDialog)
  ├── /authority      -> AuthorityPage (AuthorityGate when citizen; AuthorityQueuePage when authority)
  └── /authority/map  -> AuthorityMapPage (Spatial dispatch overview with shape + color markers)
```

### Multi-Step State Machine Reducer (`features/citizen/state/reportFlow.ts`)
The citizen submission journey is governed by a pure, deterministic reducer:
- **`step`**: Sequential navigation (`describe` -> `location` -> `review` -> `confirmation`) with linear history backtracking.
- **`analyze` trigger**: Transitioning from `location` to `review` dispatches an asynchronous call to `/api/reports/analyze`.
- **Branching review screens**:
  - `ticket`: Shows `TriageCard` with plain-language department, SLA target, applied safety rules, and optional category override.
  - `follow_up`: Prompts citizen with targeted question and answer input field before resubmission.
  - `rejected`: Displays non-civic guidance with clear explanation.
  - `emergency`: Displays prominent 112 callout banner while maintaining ticket submission capability.
- **Similar Reports Shortcut**: In `review`, duplicate candidates detected by backend are listed in `SimilarReportsPanel`; citizen can click "Add my voice" to support an existing issue instead of filing a duplicate.

### Accessibility Architecture (WCAG 2.2 AA)
- **Token Mathematics**: Tinted background tokens for all 4 urgency levels and 8 statuses are verified in `apps/web/src/styles/contrast.test.ts` to guarantee $\ge 4.5:1$ contrast against body ink and tinted backgrounds.
- **Automated Axe Audits**: 21 distinct component and page permutations verified in `apps/web/src/test/a11y.test.tsx` with **0 violations**.
- **Keyboard Journey**: End-to-end keyboard tab/enter traversal verified with `@testing-library/user-event` in `keyboardJourney.test.tsx`.
- **Screen Reader Polish**: Character counters use `aria-live="polite"`; form submission errors render into an accessible `ErrorSummary` with `role="alert"`; skip-link targets `#main-content`.

### Performance & Bundle Size Budget
- Route-level code-splitting with `React.lazy` and `Suspense` ensures the initial JavaScript bundle is only **102.97 kB gzip** (under the 150 kB budget).
- The Google Maps JS API is lazily loaded on-demand only when Step 2 (`StepLocation`) or `/authority/map` mounts, falling back gracefully to coordinate/ward inputs when no API key is provided.

---

## 10. Authority Dashboard Architecture (Phase 2.5)

### Component & Hook Architecture
- **`AuthorityGate`**: Enforces client-side role guard. When active role is Citizen, renders educational gate card and executes zero authority API calls.
- **`AuthorityNav`**: Quiet underlined sub-navigation tabs ("Work queue" and optional "Map").
- **`KpiTiles`**: Real-time KPI summaries for open, critical, overdue, and 7-day resolved tickets with instant filter toggles and active state styling.
- **`FilterBar`**: Multi-dimensional search filters (Status, Category, Urgency, Ward, Overdue toggle) synchronized bidirectionally with URL query parameters via `toSearchParams` and `fromSearchParams`.
- **`QueueTable`**: Semantic HTML table (`<caption>`, `<th scope="col">`, tabular numerals) with row keyboard selection (`Enter`), highlight animations, and infinite cursor pagination with polite screen-reader announcements.
- **`TicketDetailSheet`**: Radix Dialog slide-over right-side panel (520px) displaying full investigation metadata, AI vs decision comparison table (`describeDecisionChange`), duplicate counts, transition-guarded lifecycle status updates (requiring resolution notes), supervisor overrides, and chronological audit trail.
- **`AuthorityMapPage`**: Spatial overview plotting up to 100 filtered tickets with distinctive shape + color urgency pins, interactive InfoWindows, and accessible text alternatives.
- **Pure Utility Layer**: Deterministic modules `filters.ts`, `formatters.ts` (`formatTarget`, `formatConfidence`, `describeDecisionChange`), and `transitions.ts` backed by 100% offline unit tests.

