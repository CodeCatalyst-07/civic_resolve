# Security Policy — CivicResolve

## 1. Secret Handling Rules
- **No Committed Credentials**: `.env` files, Firebase service account keys, and API tokens must never be committed to version control. Strict `.gitignore` rules prevent accidental inclusion.
- **Environment Isolation**: In production, secrets are injected exclusively via Vercel Project Environment Variables.
- **Safe Server-Side Logging**: The internal logger scrubs objects matching sensitive patterns (`key`, `secret`, `token`, `password`, `auth`, `credential`). Log outputs never print raw API keys, bearer tokens, or user PII.
- **Client Sanitization**: The web frontend (`apps/web`) receives no secrets. The only public environment variable is `VITE_GOOGLE_MAPS_BROWSER_KEY`, strictly restricted by HTTP Referrer in the Google Cloud Console.

## 2. Demo Mode Role Switcher Notice
- The in-app `RoleSwitcher` toggle between **Citizen** and **Authority** is a UX testing convenience designed for hackathon evaluators.
- **It is NOT an authentication or authorization boundary.** Role state exists purely in memory within the client application.
- In demo mode, no access control tokens are exchanged and no cryptographic guarantees exist.

## 3. Production Authentication Path
For production municipal deployment:
1. **Authentication**: Integration with Firebase Authentication or OIDC/OAuth 2.0 (Google Workspace / e-Governance SSO).
2. **Role Verification**: Server-side JWT verification with custom claims (e.g. `role: 'authority'`, `department: 'sanitation'`, `ward: 14`).
3. **Immutable Audit Trail**: All status transitions, department reassignments, and urgency overrides logged with user identity, timestamp, and client IP in an append-only audit log.
4. **Data Isolation**: Firestore Security Rules enforcing strict tenant and department-level boundary controls.

## 4. Responsible AI Principles
- **AI Suggests, Humans & Deterministic Rules Decide**:
  The AI triage layer (Gemma 4 via Jarvis Labs or Gemini API) provides structured advisory suggestions:
  - Suggested category
  - Suggested urgency
  - Rationale and reasoning
  - Confidence score
- Final urgency categorization and municipal department dispatching are governed by **deterministic domain rules** and **human municipal officers**.
- AI is never permitted to autonomously reject or close a citizen grievance without human supervisor oversight.
