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
