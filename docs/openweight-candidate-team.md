# open-weight candidate operations team

Status: approved by the human owner on 2026-10-15. This is the source of truth for the routine role of Ubuntu open-weight agents.

## Mission

The open-weight team keeps Metal Calendar's event coverage fresh and reviewable. Its normal output is candidate event data backed by official or highly reliable sources.

The team is an operations team. It does not decide product direction, propose UI/SEO features, implement application code, or review application PRs as part of routine operation.

## Roles

### Source Scout

- Check `src/data/watchTargets.ts`, official promoter pages, venue schedules, band sites, ticket pages, and the required manual SNS list.
- Record source URLs, retrieval time, retrieval failures, and possible tour/multi-date signals.
- Do not interpret a failed fetch as evidence that no event exists.

### Event Extractor

- Extract artist, event name, date, venue, prefecture, ticket/official URLs, status, and source from captured evidence.
- Leave unknown fields unknown. Do not infer a date, venue, URL, or tour stop.
- Create one candidate per confirmed date and state whether the full Japan schedule was checked.

### Candidate Validator

- Independently compare every material field with the captured source.
- Check existing public events, new-event candidates, and update candidates for duplicates.
- Check tour-like announcements for other Japan dates.
- Return `PASS`, `REJECT`, or `NEEDS_HUMAN`. It must not rewrite weak evidence into a confident fact.

### Queue Writer

- Use deterministic code to normalize and append validated new events to `src/data/candidate_events.ts`.
- Keep published-event updates in `src/data/event_update_candidates.ts`.
- Create a candidate PR and notification. Never publish an event or merge a PR.

### Coverage Retrospective

- Review human accept/ignore decisions, unsupported fields, duplicate candidates, missed tour dates, failed sources, and time to candidate.
- Propose changes only to candidate-source coverage, extraction prompts, validation rules, or scheduling.
- Prompt and workflow changes still require a reviewed PR and human merge.

## Workflow

```text
official source watch
→ captured evidence
→ event extraction
→ independent field validation
→ deterministic duplicate/tour checks
→ candidate PR
→ /admin/candidates
→ human decision and merge
```

GitHub Issues are notifications or pipeline-change proposals. They are not a second candidate review queue.

## Boundaries

The open-weight team does not routinely perform:

- Product Analyst or Product Manager work
- UI, SEO, growth, or monetization proposals
- application code implementation
- application PR review
- SNS publishing
- automatic candidate publication
- final merge or production configuration

Human and Codex handle product decisions, UI/SEO work, application implementation, and reviews of candidate-pipeline changes. Routine candidate extraction and first-pass data validation should not call Codex.

## Working memory

Working memory may contain:

- last successful check per source
- failed/retryable source fetches
- unconfirmed tour dates
- possible newly discovered artists or venues
- recurring extraction mistakes and human rejection reasons
- next source checks

GitHub and the candidate data files remain the source of truth. Compress old memory and do not turn unverified notes into candidates.

## Quality metrics

- human candidate acceptance rate
- unsupported material-field rate
- duplicate rate
- missed Japan tour-date rate
- official announcement to candidate latency
- source check success rate
- human review time per batch

Issue count, proposal count, and prose quality are not primary metrics.

## Rollout

The current scheduled GitHub Actions candidate collection remains active until the local open-weight path passes a fixed benchmark. This avoids a collection gap.

The next experiment is limited to:

1. make `scripts/research-candidates.mjs` support a localhost OpenAI-compatible endpoint without requiring an API key;
2. compare the current path and open-weight extraction on the same 20 saved official-source examples;
3. score field accuracy, unsupported facts, duplicates, tour completeness, and human review time.

Only after that benchmark passes may a separate PR add an Ubuntu candidate worker and switch off the overlapping schedule. The existing site-review timer remains disabled.
