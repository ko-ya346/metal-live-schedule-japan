# Ubuntu Generator Search Console context evaluation

## Change

- Agent: site review Generator
- Model: `metals-review:8b`
- Model digest: `31d06532b675cda40557d627cecffc03044718a5da7b88936977202fd76185dd`
- Prompt version: 1
- Date: 2026-10-15 JST
- Evaluation period: four manual iterations; timer remained disabled and inactive
- Final task count: five isolated runs
- Final context digest: `c8ddcc9890f19fca2a5e645719a5a222003a11c9395bb24b6ed0e2a5b863cfe2`
- Change description: provide the latest Search Console report as row-preserving JSON and suppress Search Console findings unless one input row's identifier and four metrics are quoted exactly.

The compact context contains summary metrics and at most five rows from each of `topQueries`, `lowCtrQueries`, `topPages`, and `lowCtrPages`. Its serialized size is capped at 3,000 characters. The source report covers 2026-09-12 through 2026-10-09.

## Iteration results

1. Passing the first 700 Markdown characters exposed only the report header and did not give the model usable query/page rows.
2. Passing selected Markdown tables exposed current data, but the model mixed adjacent rows. For example, it assigned Amenra's CTR to the Draconian query.
3. Passing row-preserving JSON stopped that row mixing in five trials, but the model often omitted the metrics and inferred that a corresponding page did not exist.
4. Stronger prompt instructions did not fix citation completeness in five trials. A separate `qwen3:8b` trial returned older repeated topics instead of the current low-CTR evidence.
5. A deterministic gate now requires one Search Console row's exact `query` or `page`, `clicks`, `impressions`, `ctr`, and `position` strings in the finding. Incomplete or mismatched findings are retained in `generator-suppressed.json` for diagnosis and excluded before `shouldCreateIssue` is calculated.

## Final evaluation

Each run copied the same production proposal history into an isolated state directory and used commit `b65fcf3`. GitHub notification was unavailable in the isolated states, so no Issue was created by the runner.

| Run | Generated findings | Exact citations kept | Citation failures suppressed | Human-facing findings | Initial schema success |
|---:|---:|---:|---:|---:|---|
| 1 | 3 | 0 | 3 | 0 | yes |
| 2 | 3 | 0 | 3 | 0 | yes |
| 3 | 3 | 0 | 3 | 0 | yes |
| 4 | 3 | 0 | 3 | 0 | yes |
| 5 | 3 | 0 | 3 | 0 | yes |

All 15 generated findings cited a low-CTR identifier but omitted the four exact metrics. They also inferred that a matching page might not exist without evidence. The gate suppressed all 15. The fixture suite separately verifies that a finding with one exact identifier and all four exact values remains eligible, and that a finding unrelated to Search Console is unaffected.

## Decision

The safety objective passed for this fixed-context sample: zero incomplete or mismatched Search Console claims reached human review. The usefulness objective did not pass: the model produced zero correctly cited findings in the final five runs. This change therefore reduces false-positive review work but does not establish that the Generator can yet turn Search Console data into useful proposals.

The gate detects Search Console findings from the terms `Search Console` or `サーチコンソール`. It checks exact source strings and does not validate whether a correctly quoted metric supports the model's hypothesis. A later experiment should improve proposal usefulness without relaxing this evidence boundary.
