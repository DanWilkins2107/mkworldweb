# MkworldWeb

A Slack bot for tracking Mario Kart World races and results among coworkers.

## Architecture

- **Domain logic is the product.** The Slack integration is a thin adapter; keep it that way. Anything race/user/scoring related lives in pure domain modules with no Slack types leaking in.
- **Persistence:** Postgres via Supabase. The domain depends on a repository interface; the Supabase client implements it.
- Layering: `domain/` (pure logic) → `repository/` (DB access) → `slack/` (adapter / handlers).

## Testing

- Tests run against a **real Postgres** instance (local Supabase via the Supabase CLI). No DB mocks.
- Test harness details (per-test transaction rollback vs. schema reset, fixtures) — TBD, fill in once the first test lands.

## Commands

TBD — fill in once `package.json` / scripts exist.

## Style

- Terse responses. No trailing summaries of what was just done.
- Prefer editing existing files to creating new ones.
- Don't add features, error handling, or abstractions beyond what the task requires.

## Command design

- Anything that requires non-obvious user input belongs in a **separate command**, not bundled into a parent command. E.g., `register` collects only what's derivable from Slack (slack_id, display name); setting in-game name, friend code, character, etc. each get their own `@Bot set-<thing>` command if implemented.
