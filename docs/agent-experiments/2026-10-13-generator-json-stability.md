# Ubuntu Generator JSON stability evaluation

## Change

- Agent: site review Generator
- Model: `metals-review:8b`
- Model digest: `31d06532b675cda40557d627cecffc03044718a5da7b88936977202fd76185dd`
- Prompt version: 1
- Date: 2026-10-13 JST
- Evaluation period: one isolated 10-run batch
- Task count: 10
- Change description: enforce the existing output shape with `response_format` JSON Schema, retain per-attempt diagnostics, and retry structured-output failures once.

The evaluation used one fixed local page response, the same checkout, and one prompt/context digest for all runs. It did not use the normal timer or production state.

## Baseline

The 2026-10-12 shadow experiment needed five Generator attempts to obtain three valid results. Two attempts failed with `Unterminated string`, giving an observed first-attempt success rate of 3/5 (60%). Raw model output and completion metadata were not retained for those failures.

## Result

- Prompt/context digest count: 1
- Final schema success: 10/10
- Initial success: 10/10
- Retry success: 0/0; no retry was needed
- Final failure: 0/10
- Required field validation: 10/10

| Run | Final | Initial | Retry | Duration | Findings | Required fields |
|---:|---|---|---:|---:|---:|---|
| 1 | success | success | 0 | 23.9s | 3 | valid |
| 2 | success | success | 0 | 18.1s | 3 | valid |
| 3 | success | success | 0 | 16.0s | 3 | valid |
| 4 | success | success | 0 | 12.8s | 3 | valid |
| 5 | success | success | 0 | 13.5s | 3 | valid |
| 6 | success | success | 0 | 14.8s | 3 | valid |
| 7 | success | success | 0 | 13.4s | 3 | valid |
| 8 | success | success | 0 | 12.5s | 3 | valid |
| 9 | success | success | 0 | 16.7s | 3 | valid |
| 10 | success | success | 0 | 16.2s | 3 | valid |

## Decision

The Issue #96 success metric passed: all 10 outputs matched the schema, at least 8 succeeded on the first attempt, and every run used the same prompt/context. This small sample does not establish the general failure rate. Proposal quality was outside this evaluation.
