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
> **AI Architecture Note**:
> Triage runs behind a provider interface. The default demo model is Gemma 4 (`gemma-4-31b-it`) from Google served through Jarvis Labs' OpenAI-compatible endpoint; a Gemini provider using the official Google SDK is switchable by environment variable.

*(Note: During Phase 2.0 scaffolding, the system runs with the deterministic `mock` provider by default. Provider implementations arrive in Phase 2.2).*

---

## 3. How This Maps to Hackathon Grading Criteria

| Criteria | Implementation Strategy | Status |
| :--- | :--- | :--- |
| **Code Quality** | Monorepo with npm workspaces, strict TypeScript, ESLint 9, Prettier, clean layer separation, JSDoc annotations | Scaffolding complete (Phase 2.0) |
| **Security** | Zero secrets in client, Helmet, 20kb JSON limit, input sanitization via Zod (control character stripping), rate limiting, sensitive log redaction | Scaffolding complete (Phase 2.0) |
| **Efficiency** | Same-origin Vercel deployment, lightweight bundle, zero-dependency domain layer, fast Vitest execution | TODO (Phase 2.2 / 2.3) |
| **Testing** | Unit & integration testing with Vitest, Supertest for API, React Testing Library for frontend, accessibility verification | Scaffolding complete (Phase 2.0) |
| **Accessibility** | WCAG 2.1 AA compliance: semantic landmarks (`header`, `nav`, `main`, `footer`), keyboard skip link, visible focus rings, high-contrast urgency badges with text and icons | Scaffolding complete (Phase 2.0) |
| **Google Services Use** | Gemma 4 (Google open model) via Jarvis Labs, Google Gemini API, Google Maps Platform, Firebase Firestore Spark plan | Config & architecture ready |
| **Problem Alignment** | Dual citizen/authority portal, deterministic urgency matrix, transparent status lifecycle | Core shell ready |

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
# Lint all workspaces
npm run lint

# Typecheck all TypeScript code
npm run typecheck

# Execute test suite
npm run test

# Build all applications
npm run build
```

---

## 5. Vercel Deployment & Serverless Considerations

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
- `GEMINI_MODEL`: `gemini-1.5-flash`
- `REPO_DRIVER`: `firestore` (or `memory`)
- `FIREBASE_SERVICE_ACCOUNT_JSON`: *(base64 or JSON string of service account)*
- `VITE_GOOGLE_MAPS_BROWSER_KEY`: *(optional, browser-safe)*

### Serverless Operational Note
In a serverless environment (such as Vercel Functions):
- Express rate limiting (`express-rate-limit`) and in-memory caches operate on a **per-instance (best effort)** basis. Cold starts create isolated execution instances.
- For production multi-instance rate limiting, an external Redis store (e.g. Upstash) or edge gateway rate limiter can be attached.
