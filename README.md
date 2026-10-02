# Workout Buddy

An Android-first workout tracker built with Expo (React Native + TypeScript). Log sets by typing a sentence ("Add a record for 60 jumping jacks in 5min 20 seconds") or filling a form, with rest timers, plate and warm-up calculators, a configurable dashboard, and an exercise library. AI coaching, photo progress and wearables are planned in later phases.

Status: **Phase 0 (shell)**. Typechecks, 82 tests pass (including real SQLite), and bundles for Android. It has not yet been run on a device or emulator.

## Run it

Requires Node 20+ (the SQLite integration tests use Node's built-in `node:sqlite`).

```bash
npm install
npx expo start          # scan the QR code with Expo Go on your Android phone
```

Other commands:

```bash
npm run android         # open on an emulator or connected device
npm run typecheck       # tsc --noEmit
npm test                # vitest (unit + SQLite integration)
```

If you add a package, use `npx expo install <package>` on your machine so the version matches the Expo SDK.

## Documentation

- [`ARCHITECTURE.md`](ARCHITECTURE.md): feature evaluation, architecture, phased plan, open decisions.
- [`CODE_WALKTHROUGH.md`](CODE_WALKTHROUGH.md): every file, class and method, and why it is written that way.
- [`CLAUDE.md`](CLAUDE.md): project context and standing rules for Claude Code sessions.

## Layout

```
app/        screens (expo-router: file path = route)
src/
  constants/  enums, routes, bootstrap values
  config/     config definitions + ConfigService
  db/         migrations + repositories (all SQL)
  domain/     pure logic: parser, stats, calculators, timer
  services/   application logic, Logger, ErrorReporter
  hooks/ features/ ui/   React layer
tests/      unit + integration tests
```
