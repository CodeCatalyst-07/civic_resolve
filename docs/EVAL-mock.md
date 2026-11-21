# CivicResolve Model Benchmark Results (MOCK)

Last Updated: 2026-11-21T06:33:41.413Z
Provider Tested: `mock` (Model: `mock-triage-v1`)

> [!NOTE]
> **Honest Disclosure**: This evaluation uses the deterministic `mock` triage provider derived from test fixtures. It verifies plumbing, prompt schema parsing, error recovery, and domain rule wiring; it is **NOT** a benchmark of live AI model accuracy.

## Metrics Summary
| Metric | Result | Benchmark Target |
| :--- | :---: | :---: |
| **Category Accuracy** | **100%** | $\ge 90\%$ |
| **Urgency Floor ($\ge$ Min)** | **100%** | $100\%$ |
| **Outcome Match** | **100%** | $100\%$ |
| **Emergency Hazard Detection** | **100%** | $100\%$ |
| **Degraded Count** | **0** | $0$ (offline mode) |
| **Average Latency** | **2 ms** | $< 2500$ ms |

## Fixture Evaluation Breakdown
| Fixture ID | Outcome | Category | Urgency | Emergency | Latency |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `cmp-01-pothole-school` | ✅ `ticket` | ✅ | ✅ | ✅ | 22ms |
| `cmp-02-vague-road` | ✅ `follow_up` | ✅ | ✅ | ✅ | 0ms |
| `cmp-03-multi-issue` | ✅ `ticket` | ✅ | ✅ | ✅ | 0ms |
| `cmp-04-spam` | ✅ `rejected` | ✅ | ✅ | ✅ | 0ms |
| `cmp-05-live-wire-emergency` | ✅ `ticket` | ✅ | ✅ | ✅ | 0ms |
| `cmp-06-abusive-real` | ✅ `ticket` | ✅ | ✅ | ✅ | 0ms |
| `cmp-07-hindi` | ✅ `ticket` | ✅ | ✅ | ✅ | 15ms |
| `cmp-08-marathi` | ✅ `ticket` | ✅ | ✅ | ✅ | 0ms |
| `cmp-09-hinglish` | ✅ `ticket` | ✅ | ✅ | ✅ | 0ms |
| `cmp-10-prompt-injection` | ✅ `ticket` | ✅ | ✅ | ✅ | 0ms |
| `cmp-11-very-long` | ✅ `ticket` | ✅ | ✅ | ✅ | 1ms |
| `cmp-12-empty` | ✅ `rejected` | ✅ | ✅ | ✅ | 0ms |
| `cmp-13-emoji-only` | ✅ `rejected` | ✅ | ✅ | ✅ | 0ms |
| `cmp-14-garbage-overflow` | ✅ `ticket` | ✅ | ✅ | ✅ | 0ms |
| `cmp-15-streetlight-broken` | ✅ `ticket` | ✅ | ✅ | ✅ | 0ms |
| `cmp-16-water-leakage` | ✅ `ticket` | ✅ | ✅ | ✅ | 0ms |
| `cmp-17-sewer-overflow` | ✅ `ticket` | ✅ | ✅ | ✅ | 0ms |
| `cmp-18-fallen-tree` | ✅ `ticket` | ✅ | ✅ | ✅ | 0ms |
| `cmp-19-open-manhole-emergency` | ✅ `ticket` | ✅ | ✅ | ✅ | 0ms |
| `cmp-20-non-civic-tax` | ✅ `rejected` | ✅ | ✅ | ✅ | 0ms |
