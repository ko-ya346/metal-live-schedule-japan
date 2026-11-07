# LIVE NATION H.I.P. Disturbed collection check

## Run

- Date: 2026-11-08 JST
- Agent: candidate collection / event extraction
- Model: `metals-review:8b` (Ollama, CPU)
- Model digest: `31d06532b675cda40557d627cecffc03044718a5da7b88936977202fd76185dd`
- Input: three official pages from LIVE NATION H.I.P., J-WAVE, and Pia Arena MM
- Pages summarized: 3/3; retrieval failures: 0
- Model call: 558 seconds; candidates emitted: 1

## Open-weight model output

The model found one Disturbed show on 2027-05-19 at Pia Arena MM. It selected the LIVE NATION H.I.P. event page and excluded the two supporting pages as separate candidates.

It also emitted unsupported ticket data: it marked three price tiers sold out, repeated the venue event URL as each ticket URL, and labeled the venue prefecture as Tokyo. These fields were removed from the candidate.

## Codex fact check

The Japanese official promoter page identifies Disturbed as a heavy metal band and confirms the single 2027-05-19 date at Pia Arena MM in Yokohama. Yokohama is in Kanagawa. The page also advertised an official lottery pre-sale starting 2026-11-09, so the model's sold-out status was contradicted by the captured source. No additional Japan dates appeared on the checked event page.

The resulting candidate keeps the confirmed event details, uses Kanagawa, and leaves ticket purchase links and sale status unset pending an explicit ticket application source.

## Prompt change

The extraction prompt now requires direct ticket application URLs in captured page summaries and requires ticket availability to be explicitly stated there. It forbids inferring sold-out or not-started status from old or future dates. A local check asserts that both rules reach the model.

## Source coverage change and link-selection check

The existing H.I.P. watch target used an obsolete `hipjpn.co.jp` URL. The first real link-collector run with the replacement source showed that its five-link limit selected navigation and KATSEYE links but omitted Disturbed. The source was raised to high priority, which allows eight links. A second real collector run selected the Disturbed event detail URL from the current LIVE NATION H.I.P. schedule.

A separate code PR replaces the obsolete source, keeps broad discovery enabled for unfamiliar international artists, and gives H.I.P. pages a source-specific ranking in the page-budget selection. The link-collector check does not invoke the model.

## Evaluation

- Candidate discovery: passed for this known, confirmed show.
- Date and performer extraction: passed.
- Prefecture and ticket detail accuracy: failed on the raw model output; fixed by Codex verification.
- Duplicate handling across three official pages: passed.
- Runtime: 9m18s for three pages, too slow for routine hand-assisted batches.
- Next check: inspect the next scheduled collection report for H.I.P. link selection and unsupported ticket fields. Do not infer routine quality from this single sample.
