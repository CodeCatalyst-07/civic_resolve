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
|             (Express, Helmet, RateLimiter, RequestId, CORS)             |
+-------------------------------------------------------------------------+
                                    |
+-------------------------------------------------------------------------+
|                            Services Layer                               |
|        (Grievance Submission Orchestrator, Audit Log Service)           |
+-------------------------------------------------------------------------+
            /                             |                          \
           /                              |                           \
+----------------------+      +----------------------+      +--------------------+
|       AI Layer       |      |     Domain Layer     |      |  Repository Layer  |
|  (Triage Providers)  |      |   (Pure Functions)   |      | (TicketRepository) |
|  - Jarvis (Gemma 4)  |      |   - Urgency Engine   |      |  - In-Memory Repo  |
|  - Gemini 1.5 Flash  |      |   - Department Rules |      |  - Firestore Repo  |
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

## 3. Phase 2.2: Triage Pipeline, AI Providers & Server-Side Geocoding

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

### Server-side Geocoding with Graceful Degradation
- **`GoogleGeocodingProvider`**: Connects to Google Maps Geocoding REST API with `region=in` bias, timeout from `GEOCODE_TIMEOUT_MS`, in-memory cache, and mainland India bounding box validation (6°N-38°N, 68°E-98°E).
- **`NullGeocodingProvider`**: Fallback provider when `GOOGLE_MAPS_SERVER_KEY` is omitted, returning `not_configured` while keeping all grievance triage capabilities 100% operational offline.
```

---

## 4. Shared Types & Contracts (`packages/shared`)
Both `apps/web` and `apps/api` share canonical types and Zod schemas from `@civicresolve/shared`:
- Enums: `Category`, `Urgency`, `Status`, `Role`, `Department`
- Schemas: `createReportInputSchema`, `triageSuggestionSchema`, `finalDecisionSchema`, `ticketSchema`
- Utilities: `stripControlCharacters`, `Result<T, E>` (`ok`, `err`)

---

## 5. Strict Layer Boundaries & Purity Enforcement
- **Domain (`apps/api/src/domain`)**: Pure TypeScript functions with zero external dependencies, no network, no I/O, no crypto. Injected time and randomness. Prohibited from importing `ai/`, `repo/`, or `http/`.
- **AI Layer (`apps/api/src/ai`)**: Prohibited from importing `http/` or `repo/`.
- **Services Layer (`apps/api/src/services`)**: Prohibited from importing `http/` or `repo/`.
- **Enforcement**: Statically verified via ESLint `no-restricted-imports`, `no-restricted-properties`, and `no-restricted-syntax`.

---

## 6. Hosting & Deployment Topology
- **Single Vercel Project**:
  - `apps/web` is built as static assets and served from CDN edge.
  - `api/index.ts` is deployed as a Vercel Serverless Function under `/api`.
  - Same-origin routing eliminates CORS overhead in production.
