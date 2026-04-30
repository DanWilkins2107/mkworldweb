# MkworldWeb

A web app for tracking Mario Kart World races and results among friends/coworkers.

## Architecture

- **Frontend:** web app (framework TBD — pick when first feature lands).
- **Persistence:** Firebase Realtime Database. Data shape lives in a single source of truth (e.g. `src/db/schema.ts` describing the RTDB tree); reads/writes go through typed helpers, not raw `ref()` calls scattered across components.
- **Hosting:** Firebase Hosting.
- Keep domain logic (scoring, race rules, leaderboard math) separate from UI components and from Firebase SDK calls so it can be reasoned about and tested independently.

## Testing

TBD — fill in once the first test lands.

## Commands

TBD — fill in once `package.json` / scripts exist.

## Style

- Terse responses. No trailing summaries of what was just done.
- Prefer editing existing files to creating new ones.
- Don't add features, error handling, or abstractions beyond what the task requires.
