# Code Walkthrough: what was built and why

This explains every file in the Phase 0 shell: what it is for, its classes and methods, and the reasoning behind the choices. Read section 1 first; it follows one sentence through the whole app, which makes the rest easier to place. For the bigger picture and the plan, see `ARCHITECTURE.md`.

Contents: 1 Request flow · 2 Folder map · 3 Project files · 4 Constants · 5 Config · 6 Errors and logging · 7 Database · 8 Domain (pure logic) · 9 Data · 10 Services · 11 Hooks · 12 Features · 13 UI components · 14 Screens (`app/`) · 15 Tests · 16 Recipes · 17 Things that bit us

---

## 1. One request, end to end

You type or dictate: **"Add a record for 60 jumping jacks in 5min 20 seconds"** on the Log tab and tap *Understand*.

1. `app/(tabs)/log.tsx` `onUnderstand()` calls `parseWorkoutCommand(text, { defaultWeightUnit })` from `domain/commandParser.ts`.
2. The parser lowercases, converts number words to digits (`replaceNumberWords`), strips the filler "add a record for", pulls out the duration (5 min + 20 s = 320 s), finds no weight/distance/sets, treats the leading "60" as reps, and what is left, "jumping jacks", is the exercise. It returns a `ParsedCommand` with `confidence: 1`.
3. Back in `onUnderstand()`: confidence (1) is at or above the config value `log.autoSaveMinConfidence` (0.85) and nothing is missing, so it skips the review form. Otherwise it would fill the form and ask you to confirm.
4. `requestFromParsed()` (in `WorkoutService.ts`) converts the parsed units to storage units (kg, meters) and produces a `LogRequest`.
5. `WorkoutService.log()` validates it, then calls `ExerciseLibraryService.resolveOrCreate("jumping jacks")`: the normalized key `jumping jack` equals the seeded "Jumping Jacks" entry, so the existing exercise is reused.
6. `log()` gets today's session id, loads that exercise's history, asks `isNewPersonalBest()` whether this beats it, and writes the row through `WorkoutRepository.insertSets()` in a transaction.
7. The screen shows the "Saved" card with live averages and best, reloads today's list, and starts the rest timer (because `timer.autoStartAfterSet` is on).
8. If anything in steps 4-7 throws, `errorReporter.guard()` logs it to `app_logs` **and** shows a friendly banner. Nothing fails silently.

---

## 2. Folder map

```
app/                  Screens. File path = URL (expo-router).
  _layout.tsx           root providers + stack
  (tabs)/               the five bottom tabs
  exercise/[id].tsx     exercise detail page (id or "new")
  set/[id].tsx          logged-set detail page
  manage/               dashboard-cards and logs pages
src/
  constants/            enums, routes, bootstrap-time values
  config/               config definitions + ConfigService
  errors/               AppError
  db/                   migrations + repositories (all SQL lives here)
  domain/               PURE logic (no React Native, no database)
  data/                 bundled content (exercise seed, affirmations)
  services/             application logic + Logger + ErrorReporter
  hooks/                React hooks
  features/             feature-specific UI (dashboard cards, timer, settings row)
  ui/                   shared components, theme, formatting
tests/                  unit + SQLite integration tests
```

The dependency rule: arrows point down only (screens, then services, then domain/db). `domain/` imports nothing from the app layers, which is why it can be tested in plain Node and reused later (for example in an AI summarizer).

---

## 3. Project files

| File | What / why |
|---|---|
| `package.json` | Dependencies are the exact SDK-57-compatible versions taken from `node_modules/expo/bundledNativeModules.json`. `main: "expo-router/entry"` tells Expo to start from the file-based router. Scripts: `start`, `android`, `typecheck`, `test`. `react-dom` is pinned to the React version because Expo packages declare it as a peer, and a mismatch broke installs. |
| `app.json` | App name, scheme, dark/light automatic theming, plugins `expo-router` and `expo-sqlite`, Android package `com.workoutbuddy.app` (**changeable until the first Play Store upload, then permanent**). |
| `tsconfig.json` | Extends Expo's base, `strict: true`, and the `@/*` path alias to `src/*` so imports read `@/domain/stats` instead of `../../../domain/stats`. (`baseUrl` is not used: TypeScript 6 deprecates it.) |
| `vitest.config.mts` | Test runner config. `.mts` so it loads as an ES module without a warning. Mirrors the `@` alias. |
| `.gitignore` | From the Expo template (ignores `node_modules`, `.expo`, `dist`, native folders, local env files). |
| `assets/` | Template icons and splash. Placeholders to replace. |

---

## 4. `src/constants/`

### `enums.ts`
The single source of truth for every identifier used in more than one place (your "no magic strings" rule). Values are stored in SQLite, so renaming a *value* later is a data migration; renaming a member name is free.

| Enum | Used for |
|---|---|
| `LogLevel`, `LogSource` | Classifying log lines; `LogSource` lets the log viewer filter by area. |
| `WeightUnit`, `DistanceUnit` | User display units (storage is always kg / meters). |
| `MuscleGroup`, `Equipment` | Library categorisation, rendered as chips. |
| `ExerciseSource` | How an exercise got in: `Seed`, `Manual`, `Auto`. |
| `EnrichmentStatus` | `Complete` or `NeedsReview` (the verification outcome). |
| `DashboardCardType` | Identifies each dashboard card; keys the card registry. |
| `AffirmationSource` | `Remote` or `Builtin`, so the card can say where text came from. |
| `SetKind` | `Strength`, `Reps`, `Distance`, `Duration`: what a set is "about", which decides how personal bests compare. |
| `TimerStatus` | `Idle`, `Running`, `Finished`. |
| `ParsedField` | What the parser reports as missing: `Exercise`, `Metric`, `Reps`. |
| `ErrorCode` | Machine-readable cause carried by `AppError`. |

### `routes.ts`
`Routes` is an object of path strings and small functions (`Routes.exercise(id)`, `Routes.set(id)`), plus `NEW_ID = 'new'`. Screens never build path strings inline, so renaming a route file is a one-line change and the compiler finds every caller.

### `bootstrap.ts`
Only values needed **before** the config table can be read: `DB_NAME`, `LOG_BUFFER_MAX` (log lines held in memory until the DB is open), and `GENERIC_ERROR_MESSAGE`. Anything tunable at runtime belongs in config instead, never here.

---

## 5. `src/config/`

### `configDefinitions.ts`
Declares all **30** tunable settings in one array, each with: key, type (`Number | Boolean | String | Json`), default (as the raw string that would be stored), settings group, label, description, optional `options` (rendered as chips) and an optional `validate` function.

- `ConfigKey` enum: the key strings (`'timer.restSeconds'`, ...). Code references `ConfigKey.TimerRestSeconds`, never the raw string.
- `CONFIG_DEFINITIONS`: the same data as a frozen `Record<ConfigKey, ConfigDefinition>` for lookup. `CONFIG_KEYS_IN_ORDER` preserves declaration order for the Settings screen.
- `validateConfigValue(key, raw)`: checks options, boolean/number/JSON well-formedness, then the custom rule. Returns an error message or `null`. Used by both `ConfigService.set()` and the Settings UI.
- Small validators (`positiveInt`, `fraction`, `numberArray`, `warmupScheme`, `urlTemplate`, `optionalUrl`) keep rules readable and reusable.

**Why defaults in code and overrides in the database?** The `config` table only holds values you changed. A new app version can add keys without a data migration, the table stays tiny, and "Reset to default" is just deleting a row. It also means you can change any value from Settings with no rebuild or redeploy, which is what the rule asks for.

**Secrets do not go here.** This is plain SQLite. API keys will live in `expo-secure-store` when AI arrives.

### `ConfigService.ts`
Typed, cached access to configuration.

| Method | Behavior and why |
|---|---|
| `load()` | Reads all overrides into an in-memory `Map` at startup. After this, reads are synchronous, so domain code and render functions can call config without `await`. |
| `getRaw(key)` | Override if present, else the default. |
| `getString / getNumber / getBoolean / getJson` | Typed readers. A corrupt stored value (hand-edited DB, old version) is **logged and the default is used**; it never crashes the app. |
| `isOverridden(key)` | Drives the "Reset to default" button. |
| `set(key, raw)` | Validates first (throws `AppError(Validation)` with a friendly message, e.g. "Default rest (seconds): Enter a whole number greater than 0."), writes to SQLite, **then** updates the cache, then notifies. Cache updates only on success, so memory never disagrees with disk. |
| `reset(key)` | Deletes the override. |
| `subscribe(listener)` | Returns an unsubscribe function. Screens re-render on change (see `useConfigRefresh`). |

---

## 6. Errors and logging (rule: never fail silently)

### `errors/AppError.ts`
- `AppError(code, userMessage, originalCause?)`: an error whose `userMessage` is safe to show on screen, while the technical cause is kept for the log. Throw it for anticipated problems ("This exercise has 3 logged sets, so it cannot be deleted").
- `describeError(error)`: turns any thrown value (Error, AppError, string, object) into readable text including stack and cause chain, for log storage.

### `services/Logger.ts`: the log collector
- `Logger` with `debug/info/warn/error(source, message, detail?)` and `log(level, ...)`.
- **Works before the database exists.** Until `attachSink()` is called, lines go into a bounded in-memory buffer (`LOG_BUFFER_MAX`); `attachSink` flushes them in order. So a crash during startup is still captured.
- `setMinLevel(level)`: driven by the `logging.minLevel` setting.
- **Never throws or recurses.** If the sink (SQLite) fails, it falls back to `console.error` rather than logging about logging.
- `export const logger`: an app-wide instance because logging must work outside React.

### `services/ErrorReporter.ts`: failure to log + friendly message
- `report(error, { source, what, userMessage? })`: logs the technical detail and publishes a friendly notice. If the error is an `AppError`, its own `userMessage` is shown; otherwise `userMessage` or the generic message.
- `guard(fn, ctx)`: runs an async function, and on failure reports it and returns `undefined`. This is the standard replacement for an empty `catch` in UI handlers.
- `notify(message)`: show a message without logging an error (validation hints like "Sets, reps, weight and distance must be plain numbers").
- `subscribe(listener)`: how the on-screen banner (`NoticeHost`) hears about notices without per-screen wiring.
- `installGlobalErrorHandlers()`: wraps React Native's global JS error handler so uncaught errors in timers and event handlers are logged and shown, then passes through to the original handler. **Known gap:** unhandled promise rejections are not intercepted; that is why async handlers use `guard()`.

Three layers of defence: `guard`/`report` for expected failures, `ErrorBoundary` for render crashes, the global handler for the rest. The Diagnostics screen (Settings > Diagnostics log) shows what was recorded.

---

## 7. `src/db/`

### `migrations.ts`
An ordered array of `{ version, name, sql }`. Version 1 creates all tables and indexes (see the schema in `ARCHITECTURE.md`). Rules written into the file: never edit a shipped migration, add a new one. Design choices: integer epoch-millisecond timestamps, short TEXT enums, **no image blobs** (only a `image_uri` file path), and only indexes the real queries need (`sets(exercise_id, created_at)`, `sets(session_id)`, `sets(created_at)`).

### `migrate.ts`: `migrateDatabase(db)`
Passed to `<SQLiteProvider onInit>`, so it runs before any screen renders.
- `PRAGMA foreign_keys = ON` **every connection**, because SQLite's foreign keys are per-connection and off by default; without it `ON DELETE RESTRICT` silently does nothing.
- `PRAGMA journal_mode = WAL` for faster writes and non-blocking reads.
- Reads `PRAGMA user_version`, applies each newer migration **inside a transaction together with its version bump**, so a crash midway can't leave a half-migrated database.

### Repositories (`db/repositories/`)
The only code that contains SQL. Each takes the database in its constructor and returns plain typed objects. They map `snake_case` columns to `camelCase` models with SQL `AS`.

| Class | Methods |
|---|---|
| `ConfigRepository` | `getAll()`, `set()` (an upsert), `remove()`. |
| `LogRepository` | `insert()`, `recent(limit)` (newest first), `purgeOlderThan()`, `clear()`. |
| `ExerciseRepository` | `listAll()`, `getById()`, `getByKey()`, `insert()`, `insertIfAbsent()` (used for idempotent seeding), `update(id, patch)`, `countSets()`, `delete()`. `update` builds its `SET` clause from a **whitelist map** (`PATCH_COLUMNS`), so SQL text is never assembled from caller-supplied names. |
| `WorkoutRepository` | `getOrCreateSessionId(dayKey)`, `insertSets()` (transactional: all or none), `getSet()`, `updateSet()`, `deleteSet()`, `setsForDay()`, `slimSetsForExercise()`, `slimSetsSince()`, `allSlimSets()`, `countWorkoutDaysSince()` (counts only days that really have sets). "Slim" sets carry only the columns statistics need. |
| `DashboardCardRepository` | `list()`, `insertIfAbsent()`, `setEnabled()`, `swapPositions()` (a transactional swap for move up/down). |

Why repositories? Keeping SQL in one layer means services don't care how data is stored, and the integration tests can swap the engine for a Node one without touching services.

---

## 8. `src/domain/`: pure logic

No React Native or database imports anywhere here, so every file is unit-tested in plain Node.

### `models.ts`
Types: `Exercise`, `WorkoutSet`, `WorkoutSetWithExercise`, `SlimSet`, `Session`, `DashboardCardConfig`, `ParsedWeight`, `ParsedDistance`, `ParsedCommand`. Weight is kg and distance meters in every stored model. A set may have any combination of reps/weight/duration/distance as `null` ("60 jumping jacks in 5:20" has no weight).

### `units.ts`
Conversion constants (`KG_PER_LB`, ...) and functions: `toKg/fromKg`, `toMeters/fromMeters`, `trimNumber` (drops trailing zeros), `formatWeight`, `formatDistance`, `formatDuration` (`320` becomes `5:20`), `parseDurationInput` (accepts `5:20` or `90`, returns `null` if invalid). Storing one canonical unit means statistics never mix units; conversion happens only at the screen edge.

### `text.ts`
- `replaceNumberWords("sixty jumping jacks")` gives `"60 jumping jacks"`; handles 0-999 including "one hundred and five" and "a hundred". Special case: **"one arm row" is left alone**, since "one" there is not a count.
- `normalizeNameKey(name)`: lowercase, strip punctuation, drop plural "s" per word (`Push-Ups` becomes `push up`). Used as the library's uniqueness key. Over-trimming ("abs" to "ab") is harmless because both sides of any comparison go through the same function.
- `titleCase`.

### `dates.ts`
`toDayKey` (local `YYYY-MM-DD`; one session per local day), `lastDayKeys(days, now)` (steps by calendar day, so daylight-saving changes don't shift buckets), `daysAgo`, `weekdayLabel`, `startOfDayKey`.

### `commandParser.ts`: `parseWorkoutCommand(raw, { defaultWeightUnit })`
The natural-language engine. Processing order matters, because each step *removes* what it recognised so later steps see less text:
1. Normalize: lowercase, number words to digits, `×` to `x`, strip punctuation (keeping decimals), strip filler prefixes ("add a record for", "I did", "log").
2. **Duration**: clock style `5:20` / `1:02:05`, plus `N hours/minutes/seconds` (summed, so "5min 20 seconds" = 320).
3. **Weight**: explicit unit (`135 lbs`, `100 kg`, `pounds`, `kilos`); otherwise a number after "at/with/@" using your default unit and flagged `assumedUnit`.
4. **Distance**: `km`, `miles/mi`, `meters/m`. Done after duration so `5min` isn't read as 5 meters.
5. **Sets/reps**: "3 sets of 10", "5x5", "3 sets", "10 reps", or a leading bare number meaning reps.
6. **Exercise name**: whatever words remain, with connector words trimmed from both ends.
7. **Confidence** (0 to 1): exercise present = 0.5; a complete metric (reps, time or distance) = 0.4, a weight alone only 0.2; an assumed unit forfeits the last 0.1. It also returns a `missing` list.

Why rules instead of an LLM: instant, free, offline in the gym, deterministic and testable. Honest limits: synonyms ("ran" vs "running") aren't resolved, and a bare trailing number ("bench press 135") stays in the name. Low confidence sends the user to the review form, and an LLM fallback can later plug in behind the same `ParsedCommand` shape.

### `exerciseMatcher.ts`
Fuzzy name matching. `nameSimilarity(a, b)` returns 0 to 1:
- identical normalized key, or identical once spaces are removed ("pushup" = "push up"): **1**
- otherwise 50% word-overlap (Jaccard) + 50% letter-pair overlap (Dice coefficient)
- a multi-word name fully contained in a longer one ("bench press" in "barbell bench press") scores at least 0.85. The 2-word minimum stops "press" from snapping to "bench press".
`findBestMatch` returns the top candidate (also checking aliases); `rankMatches` returns the top N above a minimum. The *decision thresholds* (reuse at >= 0.8, verified at >= 0.9) are config; the weights in the formula are algorithm constants.

### `stats.ts`
- `estimateOneRepMax(weightKg, reps, maxReps)`: Epley formula `w x (1 + reps/30)`; `null` when reps exceed the configured reliability cap.
- `scoreSet(set)`: classifies as strength (e1RM), reps, distance or duration.
- `personalBests(sets)`: best per exercise per kind, reduced to each exercise's most meaningful kind, newest first.
- `isNewPersonalBest(previous, candidate)`: strictly greater than all earlier sets **of the same exercise and kind**. The first-ever set is a baseline, not a PR. Uses a small epsilon so floating-point noise can't create fake PRs.
- `computeAverages(sets)`: averages only over sets that *have* the field (bodyweight sets don't drag down average weight); also total volume.
- `volumeByDay(sets, dayKeys)`: kg x reps per local day.

### `plates.ts`
`calculatePlates({ targetWeight, barWeight, plates })`: greedy from the heaviest plate you own, **per side**. Works in integer thousandths so 2.5 + 1.25 never gives 3.7500000000000004. Returns `perSide`, `achievedWeight`, `shortfall` (when your plates can't hit the target exactly), `belowBar`. Plates and bar come from config **per unit**, so a 45 lb plate is a 45 lb plate, not a lossy 20.4 kg conversion. `smallestIncrement(plates)` = twice the lightest plate.

### `warmup.ts`
`buildWarmup({ workingWeight, barWeight, scheme, increment })`: each scheme step is a fraction of working weight; rounds to the increment, lifts anything below the bar up to the bar, and **drops** steps that round to the working weight or repeat the previous weight, so the ladder is strictly increasing.

### `restTimer.ts`
Immutable state machine over **timestamps**: `startTimer`, `tickTimer`, `extendTimer`, `stopTimer`, `remainingMs`, `remainingSeconds` (rounds up so it reads 0:01 until it hits zero), `progress`. Why timestamps: JavaScript timers pause when the phone locks or the app is backgrounded. Storing the absolute end time and deriving "remaining" from the clock keeps the countdown correct the moment you come back.

### `cardCatalog.ts`
Pure metadata for each dashboard card (type, title, description). The array order is the default order for a fresh install. Used by seeding and the manage page.

---

## 9. `src/data/`

- `exerciseSeed.ts`: 26 built-in exercises with muscle group, equipment, short instructions (written for this project) and aliases (used only for matching). It doubles as the "known exercises" list that new names are verified against.
- `affirmations.ts`: 10 built-in daily messages, the offline fallback for the dashboard card.

---

## 10. `src/services/`

### `ExerciseVerifier.ts`
The interface `ExerciseVerifier { verify(name) }` returning `{ confidence, canonical }`, and today's implementation `SeedExerciseVerifier`, which is *name similarity against the built-in list*, **not AI**. It is an interface on purpose: an AI-backed verifier will implement the same shape and nothing else changes (it is wired in `createServices.ts`).

### `ExerciseLibraryService.ts`
| Method | What it does |
|---|---|
| `ensureSeeded()` | Inserts any built-in exercise not already present (idempotent: safe every startup, and new seed entries ship without a migration). |
| `videoUrlFor(name)` | Builds the how-to link from the config template `library.youtubeSearchUrlTemplate` (`{query}` replaced by name + suffix). Today it is a YouTube **search** URL, not a curated video. |
| `suggest(query)` | The dropdown behind the Exercise box: substring or fuzzy matches, best first, capped by `library.suggestionLimit`. |
| `resolveOrCreate(name)` | The "new exercise" pipeline: exact key, then fuzzy >= `exercise.match.minScore`, otherwise verify. At >= `exercise.enrich.minConfidence` it is created pre-filled and marked `Complete`; below that it is created bare, flagged `NeedsReview`, with a video link. **Logging is never blocked by the library.** |
| `save(id, input)` | Create or update from the detail page. Rejects empty names and duplicate keys; saving counts as the user reviewing it, so the entry becomes `Complete`; an empty video link is auto-filled. |
| `delete(id)` | Refuses with a friendly message if sets reference it (the database's `RESTRICT` is the backstop). |

### `WorkoutService.ts`
- `LogRequest`: one request to record N identical sets, in storage units.
- `requestFromParsed(parsed)`: converts parser output (user units) to a `LogRequest`; throws a friendly `AppError` if there's no exercise.
- `log(request)`: validates (at least one metric; sets between 1 and `log.maxSetsPerCommand`, which guards against a mis-heard "500 sets"), resolves the exercise, finds today's session, loads history, checks each new set for a personal best (accounting for earlier sets in the same command), inserts atomically, and returns `{ exercise, createdExercise, setsLogged, newPersonalBest, summary }` so the screen can show instant feedback.
- `today()`, `getSet()`, `updateSet()` (validates a metric remains; **does not re-evaluate the PR flag**, a documented limitation), `deleteSet()`, `summaryFor(exerciseId)`.

### `AffirmationService.ts`
`today()` returns `{ text, source }`. With no URL configured, or on any failure/timeout, it uses a built-in message chosen by day-of-year (stable all day). With a URL it fetches with an `AbortController` timeout (`affirmation.timeoutMs`), accepts plain text or JSON (`text`/`affirmation`/`quote`/`message`/`content`), and truncates to `affirmation.maxChars`. Cached per day. Failures are logged as warnings, not shown as errors, since the card still has content.

### `DashboardService.ts`
- `ensureCards()`: adds any catalog card the database lacks.
- `listCards()`, `setCardEnabled()`, `moveCard(card, ±1)`.
- `load()`: fetches week sets, window sets, all sets, workout-day count, exercises and the affirmation **in parallel**, then returns one `DashboardData` object: unit, affirmation, goal, workout days this week, 7-day volume, top-N personal bests with names, averages and window length. Every card reads from this one object so they stay consistent. "Week" means a rolling 7 days (a calendar week would be a locale setting).

### `createServices.ts`
- `createServices(db)`: **the composition root**, the only place classes are wired together. Swapping an implementation is a change here only.
- `bootstrapServices(services)`: startup in dependency order: attach the log sink first (so later failures are captured), load config, apply log level and retention purge, seed the library and cards, log "Startup complete".

### `ServicesProvider.tsx`
React provider. Builds services from the open database, runs `bootstrapServices`, shows a spinner while loading and a **friendly full-screen error with Retry** if startup fails (the cause is already logged). `useServices()` exposes the services to screens.

---

## 11. `src/hooks/`

- `useLoad(loader, source, what)`: loads data **every time the screen gains focus** (so returning from a detail page shows fresh numbers), returns `{ data, loading, failed, reload }`, and reports failures via `ErrorReporter`. The `loader` must be wrapped in `useCallback` by the caller, otherwise it would reload every render.
- `useConfigRefresh()` and `useUnits()`: subscribe a screen to config changes. Tab screens stay mounted when you switch tabs, so without this a unit change in Settings wouldn't appear until restart.

---

## 12. `src/features/`

- `timer/RestTimerProvider.tsx`: one app-wide timer so it keeps running as you switch tabs. It only handles side effects: redraw on an interval (`timer.tickMs`), vibrate when finished, and keep the screen awake while counting. All timing logic is in `domain/restTimer.ts`. `useRestTimer()` exposes `{ status, remainingSec, progress, start, extend, stop }`.
- `timer/RestTimerBar.tsx`: countdown, progress bar, `+ Time` and `Skip/Dismiss`. Renders nothing while idle.
- `dashboard/cards.tsx`: the six card components and `CARD_COMPONENTS`, a `Record<DashboardCardType, Component>`. The record type makes the compiler fail if a card type has no component. The AI guidance card is an honest "coming soon" placeholder.
- `settings/ConfigRow.tsx`: renders one setting from its `ConfigDefinition`: a switch for booleans, chips for options, a text field (multiline for JSON) with live validation otherwise. Booleans and options save immediately; text shows Save/Undo once changed. Because the Settings screen is generated from definitions, **a new config key appears in Settings automatically**.

---

## 13. `src/ui/`

- `theme.ts`: `usePalette()` (light/dark from the OS), plus `space`, `radius`, `fontSize` tokens. Screens never hardcode a color or spacing.
- `format.ts`: `labelOf` (`full_body` becomes "Full body"), `describeSet` ("10 × 135 lb · 5:20"), `describePersonalBest`, `parseNumberInput` (blank = `null`, junk = `NaN`).
- Components: `AppText` (type scale), `Card`, `AppButton` (primary/secondary/danger), `Field` (label + input + inline error), `ChipSelect` (single choice, used instead of a native dropdown), `Screen` (scrolling page with `keyboardShouldPersistTaps` so the first tap on a button works while the keyboard is open) and `Centered`, `Gauge` (SVG half-circle), `BarChart` (View-based bars), `NoticeHost` (the friendly error banner that subscribes to `ErrorReporter`), `ErrorBoundary` (class component, required by React; logs the component stack, shows "Try again"), `TabIcon` (tiny SVG icons so no icon-font package is needed).

---

## 14. `app/`: screens

| File | Role |
|---|---|
| `_layout.tsx` | Root. Provider order, outermost first: `ErrorBoundary`, `Suspense`, `SQLiteProvider` (opens DB, runs migrations), `ServicesProvider` (startup), `RestTimerProvider`; then the themed `Stack` and the `NoticeHost` banner. Installs the global error handler at module load, before the first render. |
| `(tabs)/_layout.tsx` | Five tabs with icons. |
| `(tabs)/index.tsx` | **Dashboard**: loads card config + data together, renders enabled cards in order, pull-to-refresh, "Customize cards". |
| `(tabs)/log.tsx` | **Log**: Quick-log sentence box, record form with exercise suggestions, "new exercise" notice, hints from the parser (missing fields, assumed unit), saved summary card (PR, averages, best), today's list. `saveRequest()` is the single save path for both the sentence route and the manual form. |
| `(tabs)/library.tsx` | **Library**: search, list with "Needs review" badge, add button. |
| `(tabs)/tools.tsx` | **Tools**: timer presets, plate calculator, warm-up calculator (all config-driven, per unit). |
| `(tabs)/settings.tsx` | **Settings**: groups generated from `configDefinitions`, plus links to the dashboard-cards and logs pages. |
| `exercise/[id].tsx` | **Exercise detail** (existing or `new`): edit all fields, summary stats, watch-video button, save, delete with confirmation; shows a "Needs review" card for unverified exercises. Handles a bad id gracefully. |
| `set/[id].tsx` | **Set detail**: edit reps/weight/time/distance/notes, delete with confirmation. |
| `manage/dashboard-cards.tsx` | Show/hide switches and Move up/down per card. |
| `manage/logs.tsx` | Diagnostics: newest-first log, tap to expand technical detail, clear with confirmation. |

---

## 15. `tests/` (82 tests)

| File | Covers |
|---|---|
| `commandParser.test.ts` | Your exact example; sets/reps notations; unit assumptions; clock durations; distance; number words; filler; the "one arm row" edge; missing-field reporting. |
| `matcherAndText.test.ts` | Number words, name normalization, similarity (plural/hyphen/spacing = 1, containment, unrelated = low), best-match + aliases, unit round-trips, duration format/parse. |
| `calculators.test.ts` | Plates (225 lb, 100 kg mixed, shortfall, below bar, fractional plates) and warm-up ladders (rounding, bar floor, dedupe, no ladder at bar weight). |
| `stats.test.ts` | 1RM formula and limits, set scoring, PR rules (baseline, ties, other exercises/kinds), personal bests, averages, daily volume. |
| `restTimer.test.ts` | Start/extend/finish, **correctness after a long gap** (the backgrounding case), idle behavior. |
| `config.test.ts` | Every key defined once; **every shipped default passes its own validator**; bad values rejected. |
| `integration.test.ts` | Real SQLite: migrations, idempotent seeding, your headline example saved correctly, kg storage, N sets, PR logic, unknown exercise flagged, plural reuse, validation errors, edit/delete, library constraints, dashboard numbers, card reorder, config persistence/reset/corruption fallback, log collector persistence and purge. |
| `helpers/nodeSqliteAdapter.ts` | Test-only adapter exposing the few expo-sqlite methods the repositories use, backed by Node's built-in SQLite. Lets the real SQL run without a phone. |

Run: `npm run typecheck && npm test`.

---

## 16. Recipes: how to extend it

**Add a setting.** Add a member to `ConfigKey` and an entry in `DEFINITIONS` (`configDefinitions.ts`) with a default, label, description and validator. It appears in Settings automatically; read it with `config.getNumber(ConfigKey.X)`. The config test fails if a default doesn't pass its own validator.

**Add a dashboard card.** Add the value to `DashboardCardType`, a catalog entry in `cardCatalog.ts`, load whatever data it needs in `DashboardService.load()`, and add the component to `CARD_COMPONENTS`. The `Record` type will not compile until you do. Existing installs pick it up through `ensureCards()`.

**Add a database field or table.** Append a new migration in `migrations.ts` (never edit version 1), update the model in `domain/models.ts` and the repository's `SELECT`/`INSERT`. Add an integration test.

**Add an editable thing.** Give it a route under `app/`, a helper in `Routes`, and a detail page that loads with `useLoad`, edits local state, saves through a service inside `errorReporter.guard()`, and confirms before deleting.

**Add an exercise to the built-in library.** Append to `EXERCISE_SEED`; it's inserted on next startup.

**Swap in AI for exercise verification.** Implement `ExerciseVerifier`, then change one line in `createServices.ts`.

---

## 17. Things that bit us while building (so they don't bite you)

- **Two real bugs were caught by tests before they shipped.** The plural rule skipped three-letter words so "push ups" didn't equal "push up" (fixed). One calculator test expected an unreachable plate combination; the code was right and the test wrong, and the test was corrected.
- **`npx expo install` is blocked** in this build environment (it calls an Expo API the network policy forbids), so exact package versions were taken from `node_modules/expo/bundledNativeModules.json` and installed with npm. On your machine `npx expo install <pkg>` is the normal way to add packages.
- **`react-dom` must match `react`** (pinned to 19.2.3) or npm refuses to resolve.
- **TypeScript 6** deprecates `baseUrl`, so the `@/` alias uses `paths` alone.
- **Voice** is the keyboard's microphone for now. A dedicated speech package is a Phase 3 item and needs a development build rather than Expo Go.
- **Not yet run on a device.** Everything is verified by typecheck, tests (including real SQL) and a successful Android bundle, but the first on-device run may reveal layout or keyboard issues that none of those can catch.
