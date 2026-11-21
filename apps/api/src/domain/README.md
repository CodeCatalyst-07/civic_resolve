# Domain Layer (Placeholder)

This directory contains pure business logic and deterministic rule engines.

### Architectural Boundary Rules
- **Pure Functions Only**: Zero side-effects, deterministic outputs.
- **Strict Boundary**: Must **NOT** import from `ai/`, `repo/`, or `http/`.
- Enforced at compile/lint time via ESLint `no-restricted-imports`.
- Business rules arriving in later phases:
  - Urgency promotion/demotion matrix
  - Department routing rules
  - Ticket lifecycle state machine transitions
