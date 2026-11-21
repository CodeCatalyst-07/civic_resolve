# Triage & Integration Services (`apps/api/src/services`)

The services layer orchestrates AI providers, domain decision engines, cache layers, budget trackers, and server-side geocoding.

## Architectural Boundaries
- Permitted imports: `ai/`, `domain/`, `packages/shared`.
- Strictly forbidden imports: `http/`, `repo/`. Enforced by ESLint.

## Modules Overview
- **`cache.ts`**: In-memory LRU with TTL keyed by SHA-256 of normalized text and ward.
- **`budget.ts`**: In-memory UTC daily request quota manager (`AI_DAILY_BUDGET`).
- **`triageService.ts`**: Cheap-first grievance triage orchestrator:
  1. Spam check (`looksLikeSpam`) skips model.
  2. Cache hit returns saved suggestion.
  3. Budget exhaustion or AI error gracefully degrades to domain keyword fallback with `needs_manual_triage = true` (never silently Low).
  4. Candidate duplicate detection evaluates spatial and lexical proximity.
  5. Deterministic domain rules finalize category, department, and urgency floor.
  6. Privacy-safe logging audits latency, outcome, and provider name without storing complaint text.
- **`geocoding/`**: Gracefully degraded server-side geocoding with Google Maps REST API bias (`region=in`), India bounding box enforcement, and fallback `NullGeocodingProvider`.
