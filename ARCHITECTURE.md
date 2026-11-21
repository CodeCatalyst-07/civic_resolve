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

## 3. Shared Types & Contracts (`packages/shared`)
Both `apps/web` and `apps/api` share canonical types and Zod schemas from `@civicresolve/shared`:
- Enums: `Category`, `Urgency`, `Status`, `Role`, `Department`
- Schemas: `createReportInputSchema`, `triageSuggestionSchema`, `finalDecisionSchema`, `ticketSchema`
- Utilities: `stripControlCharacters`, `Result<T, E>` (`ok`, `err`)

---

## 4. Strict Domain Layer Boundary & Purity Enforcement
The `domain/` directory (`apps/api/src/domain`) encapsulates core civic grievance business logic:
- **Zero External Dependencies**: Pure TypeScript functions with zero network, filesystem, or database I/O.
- **Strict Boundary**: `domain/` is strictly prohibited from importing from `ai/`, `repo/`, or `http/`.
- **Injected Non-Determinism**: Time (`now: Date`) and randomness (`randomBytes: Uint8Array`) are strictly injected. Direct calls to `Date.now()`, parameterless `new Date()`, `Math.random()`, and `crypto` imports are banned.
- **Enforcement**: Enforced at compile and lint time via ESLint `no-restricted-imports`, `no-restricted-properties`, and `no-restricted-syntax`.

---

## 5. Hosting & Deployment Topology
- **Single Vercel Project**:
  - `apps/web` is built as static assets and served from CDN edge.
  - `api/index.ts` is deployed as a Vercel Serverless Function under `/api`.
  - Same-origin routing eliminates CORS overhead in production.
