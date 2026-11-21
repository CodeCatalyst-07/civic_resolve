# Phase 2.0: Project Scaffolding Complete

The foundational skeleton for **CivicResolve** is in place, strictly following the defined monorepo structure, TypeScript strict mode, security boundaries, and the Phase 2.0 Definition of Done.

---

## 1. Definition of Done Verification

### 1. `npm install` succeeds from a clean clone
Verified via an isolated clone test:
```bash
git clone /Users/arnav/Desktop/CivicResolve /tmp/civicresolve-clone-test
cd /tmp/civicresolve-clone-test && npm install
# Output: added 603 packages, and audited 607 packages in 2s
```

### 2. Root scripts (`lint`, `typecheck`, `test`, `build`) all pass
- **`npm run lint`**: ESLint 9 + TypeScript ESLint + `eslint-plugin-jsx-a11y` passed across the entire codebase with 0 errors and 0 warnings.
- **`npm run typecheck`**: Strict typechecking across `@civicresolve/api`, `@civicresolve/web`, `@civicresolve/shared`, and root serverless entry `api/index.ts` passed with 0 errors.
- **`npm run test`**: 35/35 tests passed across 5 test suites:
  - `@civicresolve/shared`: 14/14 unit tests passed (sanitization, length bounds, control character stripping, taxonomy enums, coordinates).
  - `@civicresolve/api`: 14/14 tests passed (9 unit tests for config validation + 5 Supertest integration tests for `/api/health`, `/api/meta`, 404 handler, 20kb body limit 413 rejection, and rate limiter).
  - `@civicresolve/web`: 7/7 tests passed (4 accessibility landmark & role toggle tests + 3 API client wrapper tests).
- **`npm run build`**: `@civicresolve/api` compiled via `tsc`, `@civicresolve/web` compiled and bundled via `vite build` (generated `apps/web/dist` in 768ms), and `@civicresolve/shared` compiled declarations.

### 3. `npm run dev` starts Web and API concurrently with dev proxy
- Started both servers with `npm run dev` (API on port `3001`, Vite on port `5173`).
- Requesting `/api/health` through the Vite dev proxy (`http://localhost:5173/api/health`):
```http
HTTP/1.1 200 OK
content-type: application/json; charset=utf-8
x-request-id: 989e9fbd-6f8d-4295-b635-49545b37df1e
ratelimit-limit: 100
ratelimit-remaining: 99

{"status":"ok","aiProvider":"mock","repoDriver":"memory","time":"2026-11-21T04:51:17.055Z"}
```
- Requesting `/api/meta` returns the taxonomy enums (`categories`, `urgencies`, `statuses`, `roles`).
- Opening `http://localhost:5173/` serves the web app shell containing the skip link, `DemoBanner` (`role="note"`), `RoleSwitcher`, and the four placeholder routes (`/`, `/report`, `/track`, `/authority`).

### 4. Domain Boundary ESLint Rule
Demonstrated by adding a forbidden import in `apps/api/src/domain/forbiddenTest.ts`:
```ts
import { createApiRouter } from '../http/routes/index.js';
```
Running `npm run lint` produced:
```text
/Users/arnav/Desktop/CivicResolve/apps/api/src/domain/forbiddenTest.ts
  2:1  error  '../http/routes/index.js' import is restricted from being used by a pattern.
  Architectural Boundary Violation: Domain layer must remain pure and cannot import from ai/, repo/, or http/ layers  no-restricted-imports
```
The demo file was then removed, restoring clean linting.

### 5. No secrets in repo & complete `.env.example`
- Checked repository with pattern matchers; zero API keys, private keys, or `.env` credential files are tracked in Git.
- [.env.example](./.env.example) documents all required and optional environment variables with comments and safe defaults.

---

## 2. Final Folder Tree

```text
civicresolve/
├── .github/
│   └── workflows/
│       └── ci.yml
├── api/
│   ├── index.ts                   # Vercel serverless entry point
│   └── tsconfig.json
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── ai/
│   │   │   │   └── README.md      # Placeholder: TriageProvider, Jarvis, Gemini (Phase 2.2)
│   │   │   ├── domain/
│   │   │   │   └── README.md      # Pure business rules placeholder (no ai/repo/http imports)
│   │   │   ├── http/
│   │   │   │   ├── middleware/
│   │   │   │   │   ├── errorHandler.ts
│   │   │   │   │   ├── notFoundHandler.ts
│   │   │   │   │   └── requestId.ts
│   │   │   │   └── routes/
│   │   │   │       └── index.ts   # GET /api/health and GET /api/meta
│   │   │   ├── lib/
│   │   │   │   └── logger.ts      # Structured logger with automatic secret redaction
│   │   │   ├── repo/
│   │   │   │   └── README.md      # Placeholder: TicketRepository (Phase 2.3)
│   │   │   ├── services/
│   │   │   │   └── README.md      # Placeholder: Application orchestrators
│   │   │   ├── app.ts             # createApp(config) factory
│   │   │   ├── config.ts          # Zod env parsing & validation
│   │   │   └── server.ts          # Local dev server entry
│   │   ├── tests/
│   │   │   ├── integration/
│   │   │   │   └── app.test.ts
│   │   │   └── unit/
│   │   │       └── config.test.ts
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── vitest.config.ts
│   └── web/
│       ├── src/
│       │   ├── app/
│       │   │   ├── pages/
│       │   │   │   ├── AuthorityPage.tsx
│       │   │   │   ├── HomePage.tsx
│       │   │   │   ├── ReportPage.tsx
│       │   │   │   └── TrackPage.tsx
│       │   │   ├── App.tsx
│       │   │   ├── Layout.test.tsx
│       │   │   └── Layout.tsx     # Landmarks: header, nav, main, footer
│       │   ├── components/
│       │   │   ├── ui/            # Pinned shadcn/ui components
│       │   │   │   ├── badge.tsx
│       │   │   │   ├── button.tsx
│       │   │   │   ├── card.tsx
│       │   │   │   ├── input.tsx
│       │   │   │   ├── label.tsx
│       │   │   │   ├── select.tsx
│       │   │   │   ├── separator.tsx
│       │   │   │   └── textarea.tsx
│       │   │   ├── DemoBanner.tsx # role="note"
│       │   │   ├── RoleSwitcher.tsx # Citizen / Authority in React state
│       │   │   └── SkipLink.tsx   # First focusable skip link
│       │   ├── features/
│       │   │   ├── authority/
│       │   │   │   └── README.md
│       │   │   └── citizen/
│       │   │       └── README.md
│       │   ├── lib/
│       │   │   ├── api.test.ts
│       │   │   ├── api.ts         # Typed fetch wrapper (no body logging)
│       │   │   └── utils.ts       # cn helper
│       │   ├── styles/
│       │   │   └── globals.css    # Inter font, design tokens, focus rings
│       │   ├── test/
│       │   │   └── setup.ts
│       │   └── main.tsx
│       ├── index.html
│       ├── package.json
│       ├── postcss.config.js
│       ├── tailwind.config.ts     # Civic design tokens (ink, primary, urgency)
│       ├── tsconfig.json
│       └── vite.config.ts
├── fixtures/
│   ├── .gitkeep
│   └── README.md
├── packages/
│   └── shared/
│       ├── src/
│       │   ├── index.test.ts
│       │   └── index.ts           # Enums, CreateReportInput schema, sanitization
│       ├── package.json
│       ├── tsconfig.json
│       └── vitest.config.ts
├── scripts/
│   ├── .gitkeep
│   └── README.md
├── .env.example
├── .gitignore
├── .prettierrc
├── ARCHITECTURE.md                # Layer boundaries & dependency rules
├── eslint.config.js               # ESLint 9 + domain boundary rule
├── package-lock.json
├── package.json                   # Root workspace orchestrator
├── README.md                      # Problem statement, criteria mapping, setup
├── SECURITY.md                    # Secret handling & responsible AI policies
├── tsconfig.base.json             # Base strict TypeScript configuration
├── tsconfig.json                  # Root project references
└── vercel.json                    # Single-project Vercel config & security headers
```

---

## 3. Summary of Dependencies Added and Why

| Package | Version | Package Scope | Purpose |
| :--- | :--- | :--- | :--- |
| **`zod`** | `3.24.2` | `shared`, `apps/api` | Runtime schema validation for report inputs and strict environment variables |
| **`express`** | `4.22.3` | `apps/api` | Web API server framework (patched release fixing `qs`/`body-parser` advisories) |
| **`helmet`** | `8.0.0` | `apps/api` | Essential HTTP security headers (HSTS, nosniff, frameguard) |
| **`express-rate-limit`** | `7.5.0` | `apps/api` | IP-based request throttling on `/api` routes |
| **`cors`** | `2.8.5` | `apps/api` | Cross-origin resource sharing for local development (disabled when empty) |
| **`react`**, **`react-dom`** | `18.3.1` | `apps/web` | UI component library (fixed React 18 requirement) |
| **`react-router-dom`** | `6.30.6` | `apps/web` | Client-side routing with layout shells (patched against open redirect advisory) |
| **`lucide-react`** | `0.460.0` | `apps/web` | Accessible SVG icons for landmarks, role switcher, and urgency indicators |
| **`@fontsource/inter`** | `5.1.0` | `apps/web` | Self-hosted Inter font asset (tabular numbers, official typography) |
| **`clsx`**, **`tailwind-merge`** | `2.1.1`, `2.5.5` | `apps/web` | Utility function (`cn`) for deterministic Tailwind class merging |
| **`class-variance-authority`** | `0.7.1` | `apps/web` | Type-safe variant management for shadcn components (button, badge) |
| **`@radix-ui/*`** | Exact pinned | `apps/web` | Unstyled accessible primitives: `react-slot`, `react-label`, `react-select`, `react-separator` |
| **`tailwindcss`**, **`postcss`**, **`autoprefixer`** | `3.4.17`, `8.5.33`, `10.4.20` | `apps/web` | CSS utility styling engine and vendor prefixing (PostCSS patched against CVE) |
| **`vitest`** | `2.1.9` | `shared`, `api`, `web` | Monorepo test runner |
| **`supertest`** | `7.1.3` | `apps/api` | HTTP integration test harness for Express |
| **`@testing-library/react`**, **`@testing-library/jest-dom`**, **`@testing-library/user-event`** | Exact pinned | `apps/web` | DOM testing utilities and accessible user interaction simulation |
| **`typescript`** | `5.6.3` | All workspaces | TypeScript compiler across the entire project |
| **`eslint`**, **`typescript-eslint`**, **`eslint-plugin-jsx-a11y`**, **`eslint-plugin-react-hooks`** | Exact pinned | Root dev | Code quality, accessibility verification, and architectural import boundary enforcement |
| **`concurrently`** | `9.1.0` | Root dev | Runs `apps/api` and `apps/web` concurrently via `npm run dev` |
| **`tsx`** | `4.19.3` | `apps/api` | Zero-compile local execution and watch mode for `server.ts` |
| **`prettier`** | `3.4.2` | Root dev | Automated code formatting |

---

## 4. Decisions Made and Warnings

1. **Patched Dependencies Selected**:
   As required by the prompt ("If a package has a known recent security advisory, choose the patched version"), `express` was pinned to `4.22.3`, `supertest` to `7.1.3`, `react-router-dom` to `6.30.6`, `postcss` to `8.5.33`, and `eslint` to `9.39.5` to resolve known upstream vulnerabilities in transitive dependencies (`qs`, `body-parser`, `path-to-regexp`, `minimatch`, and `@eslint/plugin-kit`).
2. **Serverless Port Isolation in Sandbox Tests**:
   `supertest` binds an ephemeral loopback socket (`127.0.0.1`) during integration testing. When running in environments with network restrictions, tests that open network sockets need permission to connect to loopback interfaces. All unit tests (`config.test.ts`, `index.test.ts`, `Layout.test.tsx`, `api.test.ts`) run without any network access.
3. **Phase 2.1 Boundary Respect**:
   No business logic, AI providers, Firestore queries, or real grievance data was introduced. All placeholders have dedicated `README.md` files documenting their upcoming implementation phases.
