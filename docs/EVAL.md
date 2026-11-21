# CivicResolve Model Benchmark Results

Last Updated: 2026-11-21T05:45:09.604Z
Provider Tested: `mock` (`mock-triage-v1`)

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
| `cmp-01-pothole-school` | ✅ `ticket` | ✅ | ✅ | ✅ | 24ms |
| `cmp-02-vague-road` | ✅ `follow_up` | ✅ | ✅ | ✅ | 0ms |
| `cmp-03-multi-issue` | ✅ `ticket` | ✅ | ✅ | ✅ | 0ms |
| `cmp-04-spam` | ✅ `rejected` | ✅ | ✅ | ✅ | 0ms |
| `cmp-05-live-wire-emergency` | ✅ `ticket` | ✅ | ✅ | ✅ | 1ms |
| `cmp-06-abusive-real` | ✅ `ticket` | ✅ | ✅ | ✅ | 0ms |
| `cmp-07-hindi` | ✅ `ticket` | ✅ | ✅ | ✅ | 19ms |
| `cmp-08-marathi` | ✅ `ticket` | ✅ | ✅ | ✅ | 0ms |
| `cmp-09-hinglish` | ✅ `ticket` | ✅ | ✅ | ✅ | 1ms |
| `cmp-10-prompt-injection` | ✅ `ticket` | ✅ | ✅ | ✅ | 0ms |
| `cmp-11-very-long` | ✅ `ticket` | ✅ | ✅ | ✅ | 0ms |
| `cmp-12-empty` | ✅ `rejected` | ✅ | ✅ | ✅ | 0ms |
| `cmp-13-emoji-only` | ✅ `rejected` | ✅ | ✅ | ✅ | 0ms |
| `cmp-14-garbage-overflow` | ✅ `ticket` | ✅ | ✅ | ✅ | 0ms |
| `cmp-15-streetlight-broken` | ✅ `ticket` | ✅ | ✅ | ✅ | 0ms |
| `cmp-16-water-leakage` | ✅ `ticket` | ✅ | ✅ | ✅ | 0ms |
| `cmp-17-sewer-overflow` | ✅ `ticket` | ✅ | ✅ | ✅ | 0ms |
| `cmp-18-fallen-tree` | ✅ `ticket` | ✅ | ✅ | ✅ | 0ms |
| `cmp-19-open-manhole-emergency` | ✅ `ticket` | ✅ | ✅ | ✅ | 0ms |
| `cmp-20-non-civic-tax` | ✅ `rejected` | ✅ | ✅ | ✅ | 0ms |
