# Ubuntu Generator proposal-history evaluation

## Change

- Agent: site review Generator
- Model: `metals-review:8b`
- Model digest: `31d06532b675cda40557d627cecffc03044718a5da7b88936977202fd76185dd`
- Prompt version: 1
- Date: 2026-10-13 JST
- Evaluation period: three isolated manual batches; timer remained inactive
- Final task count: one seed run and five history-aware runs
- Change description: pass recent successful findings into the prompt, then suppress generated findings whose normalized observation exactly matches recent history.

The history is limited to six successful runs that contain findings and 18 findings total. Successful no-action runs do not evict older proposal history. The artifact contains only `title`, `category`, `observation`, and `evidence`. Each run stores the exact history artifact, its SHA-256 digest, and any suppressed findings.

## Baseline

In the earlier three-run experiment, `THE CROWN` and related-live themes appeared in all three runs. All nine candidates were rejected by the human reviewer.

## Iteration results

1. Prompt-only suppression failed: all 15 findings in the five history-aware runs repeated the seed findings.
2. Exact normalized `title + observation` filtering suppressed 14/15 repeats. One finding changed only its title while keeping the same observation and evidence.
3. Exact normalized `observation` filtering suppressed 15/15 repeats.

The iterations used separate isolated state directories. No evaluation result was posted to GitHub by the Ubuntu runner because `GH_TOKEN` was not provided.

## Final evaluation

| Run | History findings | Kept findings | Suppressed duplicates | Initial schema success | Retry |
|---:|---:|---:|---:|---|---:|
| 1 (seed) | 0 | 3 | 0 | yes | 0 |
| 2 | 3 | 0 | 3 | yes | 0 |
| 3 | 3 | 0 | 3 | yes | 0 |
| 4 | 3 | 0 | 3 | yes | 0 |
| 5 | 3 | 0 | 3 | yes | 0 |
| 6 | 3 | 0 | 3 | yes | 0 |

Runs 2-6 had the same prompt/context digest and history digest. The Generator still produced the repeated candidates, and the deterministic gate removed them before `shouldCreateIssue` was calculated.

## Decision

The Issue #98 success metric passed for this fixed-context sample: the five later runs retained zero proposals with the seed's problem and evidence. The first prompt-only hypothesis did not work; the passing behavior comes from the deterministic observation gate.

This gate only catches observations that become identical after Unicode, case, punctuation, symbol, and whitespace normalization. It does not claim semantic duplicate detection. A materially new observation remains eligible, while a useful update phrased with the exact same observation could be suppressed. Review `generator-suppressed.json` when diagnosing that case.
