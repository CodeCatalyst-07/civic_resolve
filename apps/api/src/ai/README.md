# AI Provider Layer (`apps/api/src/ai`)

The AI provider layer is responsible for translating untrusted citizen grievance text into strongly-typed `TriageSuggestion` suggestions conforming to shared Zod schemas.

## Architecture & Principles
1. **Model Output is Strictly a Suggestion**: AI suggestions are never final. They must pass strict Zod parsing and domain rules engine evaluation before altering system state.
2. **Honest Attribution**: Every decision is tagged with `ai_source` (`jarvis_gemma`, `gemini`, `mock`, or `keyword_fallback`).
3. **Prompt Injection Defense**: Citizen input is delimited within `<complaint>...</complaint>` with opening/closing tags escaped. The system prompt instructs the model to treat the block as untrusted passive data and ignore role overrides.
4. **Resilience**: The `withResilience` decorator implements one exponential backoff retry for transient network/rate-limit issues and one JSON repair retry for schema validation errors.
5. **Zero Secrets in Code or Logs**: Keys are read strictly from validated `config` and never logged or exposed in client bundles.
