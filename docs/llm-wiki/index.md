# LLM Wiki

This file is the compact working context for LLM agents. Prefer reading this before opening longer docs.

## Project

Metals Calendar helps people find metal, hard rock, loud rock, metalcore, hardcore, and related heavy music live events in Japan.

The product direction is discovery:

- find upcoming shows by date, area, venue, artist, and international-tour status
- reduce missed events
- make official/ticket sources easy to reach
- help users discover nearby or related shows

Do not turn the site into a generic music news site.

## Current Architecture

- App: Next.js App Router under `src/app`
- Public event data: `src/data/events.ts`
- Candidate event data: `src/data/candidate_events.ts`
- Crawl targets: `src/data/crawlTargets.ts`
- Event utilities: `src/utils/events.ts`
- Date utilities: `src/utils/date.ts`
- Link/copy utilities: `src/utils/eventLinks.ts`
- Main styling: `src/app/page.module.css`

The site is still mostly static and file-based. Prefer static/file-based changes, but a database or external service is acceptable when it materially reduces operation cost or unlocks an important workflow. Explain the tradeoff first.

## Human Workflow

The operator should mostly use `/admin/candidates`.

Normal data flow:

1. Candidate events are added to `src/data/candidate_events.ts`.
2. Human reviews candidates in `/admin/candidates`.
3. Human publishes or ignores candidates.
4. Published events end up in `src/data/events.ts`.
5. Agent commits and pushes only when instructed.

Do not auto-publish crawled or LLM-generated data.

## Candidate Collection

Preferred sources:

1. Official promoter pages
2. Official venue schedules
3. Official band websites
4. Official ticket pages
5. Official SNS accounts

Preferred watch artists:

- SEX MACHINEGUNS
- 人間椅子
- アイリフドーパ
- FASTKILL

Also collect reliable candidates for visiting international and domestic heavy music events.

Quality rule:

- Prefer fewer reliable candidates over many weak candidates.
- Always include `sourceUrl`, `confidence`, and `reviewNotes`.
- Avoid duplicates with existing published events and existing candidates.

## UI Direction

Keep the UI dark, readable, and simple. Avoid heavy decoration.

Current design direction:

- readable black theme
- restrained red accents
- event discovery over marketing copy
- mobile readability first

New packages are allowed when they clearly improve roadmap progress, implementation quality, or maintainability. Keep the dependency count small and prefer established libraries.

## Copy Rules

Use shared labels from `src/utils/eventLinks.ts` for repeated public link text.

Run:

```bash
npm run copy:check
```

This prevents repeated labels such as ticket, official, YouTube, X share, and back links from drifting.

## Validation

For code or data changes, usually run:

```bash
npm run data:validate
npm run copy:check
npm run build
```

For docs-only changes, `git diff --check` is usually enough.

## Roadmap Pointers

Use `docs/project-roadmap.md` for product direction.

Current next priorities:

1. Strengthen homepage discovery paths.
2. Add genre pages after deciding genre normalization.
3. Keep candidate generation and review simple.
4. Improve originality through cross-linking, related shows, and source reachability.

## Avoid

- large crawler frameworks
- aggressive scraping
- unreviewed publishing
- thin SEO pages
- broad refactors
- adding packages without clear product or maintenance value
