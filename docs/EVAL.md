# CivicResolve Model Benchmark Index

This directory contains evaluation benchmarks across supported triage providers in CivicResolve.

## Evaluation Methodology & Honest Disclosure

> [!IMPORTANT]
> **Mock Provider vs. Live Model Benchmarks**:
> - **Mock Provider ([EVAL-mock.md](file:///Users/arnav/Desktop/CivicResolve/docs/EVAL-mock.md))**: Evaluates pipeline wiring, request envelope validation, JSON repair resilience, cache lookups, and deterministic domain rules against the 20 multilingual fixtures. It proves architectural correctness and safety properties; it is **NOT** a measurement of live LLM accuracy.
> - **Jarvis Labs Gemma 4 ([EVAL-jarvis.md](file:///Users/arnav/Desktop/CivicResolve/docs/EVAL-jarvis.md))**: Live endpoint benchmark measuring Gemma 4 31B IT inference on Jarvis Labs infrastructure.
> - **Google Gemini ([EVAL-gemini.md](file:///Users/arnav/Desktop/CivicResolve/docs/EVAL-gemini.md))**: Live endpoint benchmark measuring official Google Gemini API inference.

## Provider Benchmark Reports

- [EVAL-mock.md](file:///Users/arnav/Desktop/CivicResolve/docs/EVAL-mock.md) — Deterministic mock provider evaluation (CI baseline: 100% required)
- [EVAL-jarvis.md](file:///Users/arnav/Desktop/CivicResolve/docs/EVAL-jarvis.md) — Live Gemma 4 31B IT benchmark
- [EVAL-gemini.md](file:///Users/arnav/Desktop/CivicResolve/docs/EVAL-gemini.md) — Live Gemini model benchmark

## Running Evaluations

```bash
# Mock provider (offline, 100% CI pass)
npm run eval --workspace=@civicresolve/api -- --provider mock --write

# Live Jarvis Labs (requires JARVISLABS_API_KEY)
npm run eval --workspace=@civicresolve/api -- --provider jarvis --write

# Live Google Gemini (requires GEMINI_API_KEY)
npm run eval --workspace=@civicresolve/api -- --provider gemini --write
```
