# Project instructions

This is a Next.js app for a Japan heavy metal live event calendar.

## Goal

Build a small MVP for manually maintained live event data.

The app should prioritize:
- Simple implementation
- Readable code
- Learning-oriented explanations
- Small incremental changes

## Current MVP scope

Implement only:
- Event list
- Date sorting
- Prefecture filter
- Genre filter
- Date-grouped display
- Later: calendar UI

Do not implement yet:
- Database
- Authentication
- Admin screen
- Scraping
- Payment
- Full design system

## Coding policy

- Use TypeScript.
- Keep components small.
- Prefer simple React state over complex libraries.
- Do not introduce new packages unless necessary.
- Explain important changes after editing.
- After changes, tell me what command to run to verify.

## Important

I am learning implementation.
Do not rewrite everything at once.
Make small changes and explain the intent.

For deployment and testing:
- Target deployment is Vercel.
- Keep the app statically deployable for now.
- Do not add a database yet.
- Add only lightweight checks.
- Ensure `npm run build` passes before considering a change done.
- Do not introduce a test framework yet unless there is a clear need.

# Crawling policy

## Goal

Collect Japanese heavy metal live event information.

## Priorities

1. Reliability
2. Simple implementation
3. Easy maintenance

## Current scope

Only crawl:
- official band websites
- official event pages
- promoter pages

Do not crawl aggressively.

## Rules

- Respect robots.txt
- Add delays between requests
- Prefer RSS/API if available
- Store raw HTML for debugging
- Keep crawlers source-specific
- Do not build a generic crawler framework yet

## Data strategy

The project is currently semi-manual.

AI-generated or crawled data must be reviewable before publishing.

Keep candidate events in `src/data/candidate_events.ts` and do not publish them automatically.

When collecting candidate events, regularly check these preferred artists because they are important watch targets for the project:
- SEX MACHINEGUNS
- 人間椅子
- アイリフドーパ
- FASTKILL

Also collect reliable candidate events for visiting international metal, heavy rock, loud rock, metalcore, hardcore, and related heavy music artists. Do not limit collection to the preferred artist list.

## Discovery strategy

Potential future feature:
- discover related bands from co-performing events
- manually approve newly discovered bands before enabling crawling

## Event coverage policy

The goal of this project is not perfect global coverage.

Current priority:
- achieve high coverage for metal/heavy live events in Japan
- especially within the next 3 months

Expected coverage quality:
- next 3 months: high confidence / high coverage
- 3-6 months ahead: major tours and announced events only
- past 6 months: not guaranteed

## Collection priorities

Priority order for event collection:

1. Official promoter pages
2. Official venue schedules
3. Official band websites
4. Official ticket pages
5. Official SNS accounts
6. Related/co-performing bands

The project should support:
- international tours
- domestic bands
- independently organized events
- small venue events

Do not rely only on major promoters.

## Discovery strategy details

The system may discover new bands from:
- co-performing artists
- venue schedules
- event flyers/pages

However:
- newly discovered bands should be treated as candidate crawl targets
- do not aggressively expand crawling automatically
- prefer gradual/manual approval

## Publishing policy

Collected events can be published quickly if:
- source is official or highly reliable
- date and venue are clearly confirmed

Minor uncertainty is acceptable for early publication.

## Important philosophy

Coverage and freshness are more important than perfect metadata.

This project values:
- reducing missed events
- fast updates
- practical usability for metal fans

over:
- perfect normalization
- enterprise-grade data quality

## Operational simplicity

Prefer simple and maintainable solutions.

Avoid:
- large crawler frameworks
- over-engineered pipelines
- unnecessary abstractions

The project is currently operated by one person.

## Important

Keep implementations small and understandable.
