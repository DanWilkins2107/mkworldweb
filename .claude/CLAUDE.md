# MkworldWeb

A web app for tracking Mario Kart World races and results among friends/coworkers.

## Layout

```
app/                          # React + Vite + TypeScript frontend
firebase/                     # Firebase config (RTDB rules, future functions)
  database.rules.json
firebase.json                 # references app/dist for hosting, firebase/database.rules.json for RTDB
.firebaserc                   # Firebase project: softwire-mkworld-tournament
package.json                  # root dev deps (firebase-tools)
```

## Architecture

- **Frontend:** React + Vite + TypeScript in `app/`.
- **Persistence:** Firebase Realtime Database. Data shape lives in a single source of truth (e.g. `app/src/db/schema.ts` describing the RTDB tree); reads/writes go through typed helpers, not raw `ref()` calls scattered across components.
- **Hosting:** Firebase Hosting, serving `app/dist`.
- Keep domain logic (scoring, race rules, leaderboard math) separate from UI components and from Firebase SDK calls so it can be reasoned about and tested independently.

## Commands

From repo root:
- `npx firebase deploy` — deploy hosting + RTDB rules
- `npx firebase emulators:start` — local emulators

From `app/`:
- `npm run dev` — Vite dev server
- `npm run build` — production build to `app/dist`
- `npm run lint` — ESLint
- `npx tsc --noEmit` — type check

## Testing

TBD — fill in once the first test lands.

## Style

- Terse responses. No trailing summaries of what was just done.
- Prefer editing existing files to creating new ones.
- Don't add features, error handling, or abstractions beyond what the task requires.
