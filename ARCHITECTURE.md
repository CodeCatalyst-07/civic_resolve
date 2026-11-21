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

## 2. Shared Types & Contracts (`packages/shared`)
Both `apps/web` and `apps/api` share canonical types and Zod schemas from `@civicresolve/shared`:
- Enums: `Category`, `Urgency`, `Status`, `Role`
- Schemas: `createReportInputSchema`, `locationInputSchema`
- Sanitization: `stripControlCharacters`

## 3. Strict Domain Layer Boundary
The `domain/` directory (`apps/api/src/domain`) encapsulates core civic grievance business logic:
- **Zero External Dependencies**: Pure TypeScript functions with zero network, filesystem, or database I/O.
- **Strict Boundary**: `domain/` is strictly prohibited from importing from `ai/`, `repo/`, or `http/`.
- **Enforcement**: This restriction is automatically enforced at compile and lint time via an ESLint `no-restricted-imports` rule in `eslint.config.js`. Violations fail the CI pipeline.

## 4. Hosting & Deployment Topology
- **Single Vercel Project**:
  - `apps/web` is built as static assets and served from CDN edge.
  - `api/index.ts` is deployed as a Vercel Serverless Function under `/api`.
  - Same-origin routing eliminates CORS overhead in production.
