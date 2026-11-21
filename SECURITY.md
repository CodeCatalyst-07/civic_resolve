# Security & Data Protection Architecture — CivicResolve

CivicResolve implements defense-in-depth across the API, persistence, AI processing, and network boundaries.

---

## 1. Secret Handling & Automated Scanning

### Credential Protection Rules
- **No Committed Secrets**: `.env` files, Firebase service account keys (`*firebase*.json`, `*service-account*.json`), and live API keys are strictly excluded via `.gitignore`.
- **Automated Pre-Commit & CI Scanning**:
  The `scripts/secretsCheck.mjs` tool is wired into `npm run secrets:check` and GitHub Actions CI (`.github/workflows/ci.yml`). It scans both tracked and staged files for:
  - Accidentally tracked `.env` files (excluding `.env.example`)
  - Tracked service account credential files
  - High-entropy credential signatures (Google API keys `AIza...`, PKCS/RSA private keys `-----BEGIN ... PRIVATE KEY-----`, etc.)
- **Safe Server-Side Logging**:
  The internal structured logger (`apps/api/src/services/logger.ts`) sanitizes logged arguments. Objects containing keys like `key`, `secret`, `token`, `password`, `auth`, `credential` are redacted. Raw complaint text, API keys, and model prompt outputs are never written to server logs.
- **Client Sanitization**:
  The web frontend (`apps/web`) receives no secrets. The only public environment variable is `VITE_GOOGLE_MAPS_BROWSER_KEY`, restricted by HTTP Referrer in the Google Cloud Console.
- **Browser Permissions-Policy**:
  In `vercel.json`, HTTP response headers configure `Permissions-Policy: camera=(), microphone=(), geolocation=(self)`. Hardware sensors (camera, microphone) are disabled completely, while the browser Geolocation API is constrained strictly to the first-party application origin (`self`) to allow opt-in citizen location pinning while preventing unauthorized cross-origin or third-party iframe access.

---

## 2. Demo Role Gate & Timing Attack Protection

### Hackathon Demo Protection
The application supports dual citizen and municipal authority roles. To protect authority endpoints (`/api/authority/*`) during public demos, a server-side gate is implemented:
- **`X-Demo-Role` Header**: Informs the server of the requested context (`citizen` or `authority`).
- **`X-Demo-Authority-Code` Header**: When `DEMO_AUTHORITY_CODE` is configured in the server environment, all authority actions require this token.

### Constant-Time Timing Attack Defense
String equality comparisons (`token === expected`) leak character-matching time differentials. CivicResolve mitigates timing side-channels via `safeCompareCodes`:
```ts
function safeCompareCodes(provided: string, expected: string): boolean {
  const hashA = crypto.createHash('sha256').update(provided).digest();
  const hashB = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}
```
By hashing both tokens with SHA-256 into uniform 32-byte buffers prior to comparison, string length leakage and execution time differentials are completely eliminated.

---

## 3. Privacy & Allowlist DTO Projections

To protect citizen privacy and municipal operational integrity, internal database records are never returned directly to clients.

### Public Ticket View (`toPublicTicket`)
Citizen tracking endpoints (`/api/tickets/:id`, `/api/reports`) project tickets through a strict allowlist:
- **Exposed Public Fields**: `id`, `status`, `category`, `urgency`, `department`, `summary`, `ward`, `created_at`, `due_at`, `overdue`, `duplicate_count`, `reasons`, `applied_rules`, `timeline`, `emergency_notice`.
- **Hidden Internal / Sensitive Fields**:
  - `description`: The raw citizen grievance text is stripped to prevent leaking phone numbers, names, or addresses entered in free text.
  - `location`: Exact GPS coordinates and street addresses are omitted; only the broad municipal `ward` is shown.
  - `ai_suggestion`: Raw AI model outputs, tokens, and confidences are stripped.
  - `internal flags`: `needs_manual_triage`, `escalated`, `reopen_count`, `version` are excluded.

### Authority Ticket View (`toAuthorityTicket`)
Authorized municipal officers receive the full investigation view (`description`, `location`, `ai_suggestion`, `ai_source`, `version`, `timeline`).

---

## 4. Database Security & Concurrency Controls

### Cloud Firestore Security Rules (`firestore.rules`)
```cel
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      // Disallow all direct client reads and writes.
      // All operations must route through the trusted Express backend via Firebase Admin SDK.
      allow read, write: if false;
    }
  }
}
```
Direct client access via Firebase Web SDK is 100% disabled. The database is reachable exclusively through the serverless backend using Firebase Admin SDK service account credentials.

### Optimistic Concurrency Protection
Every ticket contains an integer `version` property (initialized to 1). In `FirestoreTicketRepository`, updates execute inside atomic transactions:
1. Transaction reads existing ticket.
2. Asserts `stored.version === ticket.version`.
3. If versions mismatch, aborts with a typed `conflict` error (HTTP 409).
4. If versions match, writes update with `version: stored.version + 1`.

---

## 5. Input Sanitization & Payload Protection

- **Request Body Capping**: Express body parser is limited to `20kb` (`express.json({ limit: '20kb' })`). Attempts to flood the API with large payloads fail immediately with HTTP 413.
- **Control Character Stripping**: The pure domain helper `stripControlCharacters` cleans inputs before validation, removing null bytes (`\0`), escape codes, and terminal injection sequences.
- **Zod Schema Validation**: All request bodies, route params, and query strings are validated against strict Zod schemas before reaching service logic. Unrecognized parameters are stripped.
- **Input Length Caps**:
  - Grievance descriptions: 10 to 1,000 characters.
  - Status resolution notes: 1 to 500 characters.
  - Override reasons: 5 to 300 characters.

---

## 6. Multi-Tier Rate Limiting

Implemented via `express-rate-limit` using sliding window tracking:
- **Global API Protection**: 100 requests per 15-minute window per IP.
- **Grievance Triage Preview (`POST /api/reports/analyze`)**: 20 requests per minute per IP.
- **Grievance Submission (`POST /api/reports`)**: 10 requests per minute per IP.
- **Community Support (`POST /api/tickets/:id/support`)**: 30 requests per minute per IP.
- **Server Geocoding (`GET /api/geocode`)**: 30 requests per minute per IP.

---

## 7. Architectural Boundary Enforcement

ESLint boundary rules prevent structural violations:
- `domain/` is strictly pure: no network, no I/O, no `Date.now()`, no `Math.random()`.
- `repo/` cannot import `http/` or `ai/`.
- `services/` cannot import `http/` or concrete repository implementations (`repo/memory*`, `repo/firestore*`).
- `http/` cannot import `ai/` or `repo/` directly; all interactions must pass through `services/`.
