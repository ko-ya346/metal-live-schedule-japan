# Ubuntu Generator Search Console reference-grounding evaluation

## Change

- Issue: #104
- Agent: site review Generator
- Model: `metals-review:8b`
- Model digest: `31d06532b675cda40557d627cecffc03044718a5da7b88936977202fd76185dd`
- Date: 2026-10-15 JST
- Final commit evaluated: `65f18a3`
- Final task count: five isolated manual runs
- Timer: disabled and inactive
- Human review: one candidate accepted in two minutes

The experiment adds an opt-in `reference` mode. The model selects an identifier, while deterministic code matches it against `lowCtrQueries` or `lowCtrPages` and constructs the finding from that source row. Model-written metrics, hypothesis, and Issue body are discarded. The default remains `exact-citation`.

## Iterations

1. The initial implementation passed local fixtures, but the Ubuntu wrapper did not forward `SITE_REVIEW_SEARCH_CONSOLE_GROUNDING`; five remote runs therefore remained in `exact-citation` mode and were discarded.
2. The wrapper now forwards the mode and records it in `finished.json`. A wrapper fixture verifies propagation.
3. The first valid reference-mode batch also promoted `metal church 来日` from `topQueries`, despite its 5.0% CTR exceeding the report-wide 4.6%. Reference matching was restricted to low-CTR tables and that batch was superseded.
4. The final five runs used only low-CTR rows and a deterministic summary.

## Final evaluation

| Run | Grounded findings | Unmatched selections suppressed | Incorrect metrics | Unsupported claims in grounded findings |
|---:|---:|---:|---:|---:|
| 1 | 1 | 2 | 0 | 0 |
| 2 | 2 | 1 | 0 | 0 |
| 3 | 1 | 1 | 0 | 0 |
| 4 | 2 | 1 | 0 | 0 |
| 5 | 2 | 1 | 0 | 0 |

The eight grounded findings reduced to two unique candidates:

| Query | Source metrics | Runs selected | Codex review | Human review |
|---|---|---:|---|---|
| `evergrey 来日` | 0 clicks / 45 impressions / 0.0% CTR / 6.1 position | 5/5 | NEEDS HUMAN DECISION | accepted in 2 minutes |
| `carcass 来日` | 0 / 29 / 0.0% / 12.1 | 3/5 | REJECT: low volume and page-two average position | not requested |

One non-Search Console related-live finding passed through in run 3. It was outside this mode's transformation scope and Codex rejected it for missing evidence. This remains a separate general finding-quality limitation.

## Downstream investigation

The accepted Evergrey candidate became Issue #105. Query-page Search Console data showed the event page at 43 impressions / position 6.44 and the artist page at 38 / 7.92. The event page already had the correct date, venue, ticket link, metadata, canonical, and structured data, and the official artist schedule confirmed the event. Issue #105 concluded `NO ACTION` because the 45-query-impression sample did not support a specific SEO change.

## Decision

The evidence-integrity objective passed: all eight grounded findings used exact source-row metrics and contained no model-written absence claims. The human-triage objective passed at its two-minute boundary. The downstream value objective did not pass: the one accepted investigation produced no implementation action.

Keep the mode opt-in and the timer disabled. Do not enable it as the routine path until later samples show that grounded candidates lead to useful investigations often enough to justify human review time.

Post-evaluation Codex review fixed two bookkeeping issues without changing candidate construction: failed runs now retain the attempted grounding mode in `finished.json`, and the deterministic summary counts only grounded Search Console findings rather than unrelated passthrough findings. Fixtures cover the corrected behavior; the five model runs were not repeated because their candidate selection and grounding logic did not change.
