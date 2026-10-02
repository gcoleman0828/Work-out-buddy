# CLAUDE.md — Work-out-buddy

Repo: https://github.com/gcoleman0828/Work-out-buddy (owner: gcoleman0828)

## Project

Name: **Work-out-buddy**
Purpose: Android-first workout tracker (log sets by typed/spoken sentence, rest timers,
plate/warm-up calculators, configurable dashboard, exercise library; AI coaching,
photo progress and wearables in later phases).
Stack: Expo SDK 57, React Native 0.86, React 19, TypeScript (strict), expo-router,
expo-sqlite, vitest.
Docs: `ARCHITECTURE.md` (decisions and phased plan), `CODE_WALKTHROUGH.md` (file-by-file why).

## Commands

- `npm install` then `npx expo start` (Expo Go) or `npm run android`
- `npm run typecheck` and `npm test` must both pass before committing
- Add packages with `npx expo install <pkg>` locally. In the Claude cloud session
  it is blocked by the proxy; use the versions in
  `node_modules/expo/bundledNativeModules.json` with npm.

## Layout and dependency direction

`app/` screens -> `src/{features,ui,hooks}` -> `src/services` -> `src/domain` (pure) and
`src/db` (all SQL) -> SQLite. `src/domain` must never import React Native or the DB.
Shared identifiers live in `src/constants/`; tunable values in `src/config/`.

## How the standing rules apply here

- Rule 1: defaults are declared once in `src/config/configDefinitions.ts`; user overrides
  live only in the SQLite `config` table and are edited in Settings. A new key appears in
  Settings automatically. Secrets never go in that table (use expo-secure-store).
- Rule 2: enums in `src/constants/enums.ts`, paths in `routes.ts`. No inline strings for
  ids, routes, or enum-like values.
- Rule 3: use `errorReporter.guard()` / `report()` in UI handlers, never an empty `catch`.
  Throw `AppError` with a friendly `userMessage` for expected failures. Logs go to the
  `app_logs` table (Settings > Diagnostics log).
- Storage units are kg and meters; convert only at the UI edge. Timestamps are epoch ms.
- Schema changes: append a migration in `src/db/migrations.ts`; never edit a shipped one.

## Environment notes (verified 2026-10-01)

- Repo was private; it was made public to allow Claude to attach it.
- Attaching the repo, shallow clone, and branch push all work from a Claude
  cloud session after GitHub was reconnected in Claude's connector settings.
  A test push to a new branch (`claude/push-test`) succeeded.
- Deleting a remote branch from the Claude cloud session failed with HTTP 403
  (`git push origin --delete`). Delete branches on GitHub directly.
- The session clone is shallow and tracks only `main`. After pushing a new
  branch, a stop hook may report "unpushed commits / no remote branch" even
  though the push succeeded. Verify with `git ls-remote --heads origin <branch>`
  before pushing again.
- Work on a branch and open a PR. Do not push directly to `main`.

## Standing rules (restated from user preferences; Claude Code cannot see Project Instructions)

1. **Config-driven values.** Thresholds, timeouts, URLs/endpoints, secrets,
   API keys, credentials, and any value that may change must live in a config
   file or config table, never hardcoded, so changing them needs no code
   deploy or container rebuild. Never commit secrets.
2. **No magic strings.** Any identifier or literal used in more than one place
   is defined once (enum or constants module) and referenced everywhere else.
   This is separate from rule 1: a shared identifier may be a constant in code,
   while a changeable value belongs in config. Some values need both.
3. **Never fail silently.** Every project has a log collector. Errors are
   logged for later debugging, and the user sees a friendly error message.
4. **No destructive or paid action on an inferred claim.** Data loss, reset,
   deletion, uninstall, or spend requires a verified source cited in the same
   response. If it can't be cited, say it is unverified and stop short.
5. **Don't assert UI navigation or menu paths from memory.** Ask what is on
   screen.
6. **Circuit breaker.** After two failed attempts at the same sub-goal, stop.
   State what was assumed, what the evidence suggests is wrong, and what a
   different approach would be. If no different premise can be named, say so
   and stop.
