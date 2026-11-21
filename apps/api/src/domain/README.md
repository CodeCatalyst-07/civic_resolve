# Domain Core — CivicResolve

The domain core (`apps/api/src/domain`) is the pure decision-making and business rule engine for CivicResolve.

## Modules Overview
- **`config.ts`**: Immutable, frozen `DOMAIN_CONFIG` containing all system tunables (thresholds, radii, SLA hours, emergency numbers).
- **`messages.ts`**: Centralized user-facing strings written in plain language (~8th-grade level, no "triage" jargon) for clarity and future localization.
- **`taxonomy.ts`**: Deterministic category-to-department routing matrix with Indian municipal equivalents (model never chooses the department).
- **`geo.ts`**: Pure mathematical Haversine calculations and sensitive site (schools, hospitals) proximity detection.
- **`emergency.ts`**: Unicode-aware hazard keyword detection establishing an immediate Critical urgency floor for public safety.
- **`rules.ts`**: Sequential deterministic rules engine evaluating hazard floors, safety criteria, landmark proximity, and duplicate volume.
- **`fallback.ts`**: Transparent multilingual keyword classifier and spam/gibberish detection for the AI-offline path.
- **`triage.ts`**: Top-level decision engine returning a discriminated union (`ticket`, `follow_up`, or `rejected`).
- **`duplicates.ts`**: Proximity and Jaccard token-overlap matching to identify and rank candidate duplicate complaints.
- **`sla.ts`**: Urgency-based resolution deadline calculations, overdue detection, and automatic escalation logic.
- **`status.ts`**: Complete grievance lifecycle state machine enforcing role-based transitions and resolution audit notes.
- **`ticketId.ts`**: Non-guessable public tracking identifier generator utilizing Crockford Base32 encoding.
- **`data/keywords.ts`**: Multilingual dictionary of emergency danger terms and category classification keywords (English, Hindi, Marathi, Hinglish).
- **`index.ts`**: Clean barrel export exposing the public API of the domain core.

## Non-Negotiable Architectural Invariants
1. **Purity & Zero Side-Effects**: All functions are strictly pure with no I/O, no network, and no global state. Time (`now: Date`) and randomness (`randomBytes: Uint8Array`) are explicitly injected as arguments. Enforced by ESLint.
2. **Rules Only Raise Urgency**: Domain rules may **only raise** urgency, never lower it. The AI model's urgency suggestion acts as a minimum floor.
3. **Citizen Never Blocked**: If confidence remains low after maximum follow-up rounds (`maxFollowUpRounds = 2`), a ticket is still created and flagged `needs_manual_triage = true`.
4. **Typed Results**: Expected business failures return a typed `Result<T, E>` (`{ ok: true, value }` or `{ ok: false, error }`), never throwing exceptions.
