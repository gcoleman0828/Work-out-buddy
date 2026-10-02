# Workout Buddy: Feature Evaluation, Architecture and Phased Plan

Status: proposal plus a working shell (Phase 0). Android first, Expo (SDK 57), single user, offline-first.

What has been verified so far, and what has not:

| Check | Result |
|---|---|
| `tsc --noEmit` | clean |
| Unit + integration tests (`npm test`) | 82 passing; the integration tests run the real migrations and every service against a real SQLite engine |
| `expo export --platform android` | succeeds (3.2 MB Hermes bundle, all imports resolve) |
| Run on a device or emulator | **not done**. It could not be done from the build environment. This is the first thing to do locally. |

---

## 1. Feature evaluation

Verdicts: **Build** = straightforward; **Build, reshaped** = doable but I recommend changing the requirement; **Risky** = real technical or product risk to decide on before committing.

| # | Requirement | Verdict | Assessment | Phase |
|---|---|---|---|---|
| 1 | Workout logging with sets/reps/weight, PBs, averages | Build | Core loop. Shell implements it, with PR detection and per-exercise averages shown immediately after each save. | 0 (done) |
| 1a | Typed or spoken natural-language entry | Build, reshaped | Typed works now with a rule-based parser (offline, free, deterministic, tested on your example). Voice in the shell is the keyboard's mic button. A dedicated speech module and an LLM fallback for sentences the rules miss come later. | 0 / 3 |
| 2 | Compact database | Build | SQLite. A set row is roughly 60-80 bytes plus indexes, so ~100k sets is ~10 MB. The real storage cost is **photos**, not records (see 9). | 0 (done) |
| 3 | Automatic rest timers | Build | Done, timestamp-based so it stays correct when the app is backgrounded. Alerting while the screen is locked needs a scheduled local notification (Phase 1). | 0 / 1 |
| 4 | Plate and warm-up calculators | Build | Done, config-driven (your plates, bar and warm-up scheme). Integer-thousandths arithmetic avoids float drift. | 0 (done) |
| 5 | Dashboard: gauges, charts, configurable cards | Build | Done: 6 cards, show/hide, reorder. Charts are hand-built SVG (fine for 7 bars). A chart library is justified only when per-exercise trend lines arrive (Phase 2). | 0 / 2 |
| 6 | Exercise library: instructions, pictures, YouTube link, auto-pulled for new exercises, manual add | Build, reshaped | Instructions and link auto-fill for 26 built-in exercises today. **Pictures need a licensed source** (see 6a). The "YouTube link" today is a YouTube *search* URL, which always works but is not a curated video (see 6b). | 0 / 1 / 3 |
| 7 | Detail pages for anything editable | Build | Done for exercises, sets, dashboard layout and settings. Convention: every new editable entity gets a detail route. | 0 (done) |
| 8 | AI-verify new exercises at >= 90% certainty | Risky (definition) | See 6c. The pipeline and the configurable threshold exist; today's verifier is name-similarity against the built-in list, not AI. | 0 / 3 |
| 9 | AI progress analysis (weight vs goals/dates, reps, calories, what's working) | Build, reshaped | Needs data the shell doesn't collect yet (bodyweight, goals). Most of it is deterministic maths, with the LLM only writing the narrative. See section 4. | 1-2 / 4 |
| 10 | Photo progress with AI BMI estimate | **Risky (product)** | See 6d. I recommend computing BMI from entered height/weight and using photos for visual comparison. | 5 |
| 11 | Smartwatch health / heart-rate monitoring | **Risky (platform)** | See 6e. Post-workout heart-rate import is feasible; live heart rate during a set is a separate, much larger project. | 6 |
| 12 | Virtual coach v1: daily affirmation card from a gratitude site | Build, needs a decision | Card, caching, timeout and offline fallback are done. Which site? See 6f. | 0 / 1 |

### Where I'd push back

**6a. Pictures.** Exercise images need a source whose license permits bundling. Open exercise datasets exist (for example `free-exercise-db` on GitHub), but I have **not verified** any license, so treat that as a candidate to check, not a decision. Bundled images also affect app size, and one bundled picture per exercise adds up. Options: bundle a small curated set, or download on first use into app storage.

**6b. YouTube links.** Three options, in increasing effort and fragility:
1. Search-results URL (shipped). No key, never breaks, but you land on a results page.
2. YouTube Data API search to pick a specific video. Needs an API key and has a daily quota. The key would live inside the app (extractable), acceptable for a personal app, not for a public one.
3. A hand-curated list of videos for common exercises, with the API only for unknowns.
I'd go 1, then 3 for the top ~50 exercises, with 2 only if you want it fully automatic.

**6c. "90% certainty from AI".** A language model's self-reported confidence is not a calibrated probability, so "0.9" from a model is not "90% likely correct". A defensible operational definition is *two independent signals agree*: (1) the name matches a known-exercise dataset above a threshold **and** (2) a model, asked for a structured verdict, says "valid exercise" and returns the same canonical name. Anything else goes to "Needs review" and never blocks logging. The shell already follows the "flag, don't block" rule; the threshold is configurable (Settings > Exercise library > Verification confidence).

**6d. BMI from photos.** I'd drop this as specified:
- BMI is `weight / height²`. If you enter height and weight, the app can compute it **exactly**. A photo-based estimate is strictly noisier, because it estimates two numbers you already know.
- Published image-to-BMI models carry errors of several BMI points, enough to swing a category, and BMI is already a crude measure for muscular people.
- Body photos are the most sensitive data in the app. Sending them to a cloud model should be an explicit opt-in per photo at minimum.
Recommended: photos for a visual timeline and side-by-side comparison with pose reminders; BMI from entered numbers; any AI photo analysis on-device only, labeled as an approximate trend and not medical advice.

**6e. Smartwatch.** On Android the realistic path is **Health Connect**: the watch's app syncs heart-rate samples there and Workout Buddy reads them. That gives average/max heart rate and calories for a session *after* it syncs, not a live stream. Live heart rate during a set needs a Wear OS companion app (Health Services), which is a separate native project. Also: in Expo this needs a development build rather than Expo Go (expected; verify when adding), and Health Connect access requires a Play Store permission declaration if the app is ever published. **Which watch do you have?** Garmin and some others don't write to Health Connect the way Samsung/Pixel/Fitbit do, which could change the plan.

**6f. Daily gratitude site.** I haven't been told which site. Scraping a website's text can violate its terms or copyright; an API or RSS feed with clear terms is the safe route. The shell fetches from a configurable URL (plain text, or JSON with a `text`/`quote`/`message` field) and falls back to built-in messages when empty, offline or slow. Tell me the source and I'll adapt the parser to it.

**Calories burned.** For strength work this is an estimate with wide error: MET-based (`MET x bodyweight x time`) typically lands within a broad band, and heart-rate-based estimates are better but need the watch. Present it as approximate, and use it for trends, not precision.

**"What's working / not working".** With one person and weeks of data, correlations are weak. The analysis should present *hypotheses with the evidence shown* ("squat estimated 1RM is up 6% over 8 weeks while sessions per week dropped from 4 to 3"), not causal claims.

---

## 2. Architecture

### 2.1 Principles (these come from your standing rules)

1. **Config-driven values.** Every threshold, timeout, URL and unit lives in `src/config/configDefinitions.ts` (defaults) and the `config` table (your overrides). Changing one never needs a rebuild.
2. **No magic strings.** Shared identifiers are enums in `src/constants/enums.ts`; routes are in `src/constants/routes.ts`; config keys are the `ConfigKey` enum.
3. **Never fail silently.** One path turns any failure into a log row **and** a friendly banner (`ErrorReporter`), with an `ErrorBoundary` and a global handler as backstops, and a Diagnostics screen to read the log.
4. **Offline-first.** Everything in the shell works with no network. Network features (affirmation, later AI) degrade to a local fallback.
5. **Pure core, thin shell.** Domain logic has no React Native or database imports, so it's unit-tested in plain Node.

### 2.2 Layers

```
 app/                      expo-router screens (thin: read state, call services, render)
   |
 src/features, src/ui      reusable UI: cards, timer, settings rows, components, theme
   |
 src/hooks                 useLoad (load-on-focus + error reporting), useUnits
   |
 src/services              application logic: WorkoutService, ExerciseLibraryService,
   |                       DashboardService, AffirmationService, Logger, ErrorReporter
   |
 +-- src/domain            PURE functions: parser, matcher, stats, plates, warm-up,
 |                         timer state machine, units, dates (no RN, no DB)
 |
 src/config                ConfigService + definitions (typed, cached, validated)
   |
 src/db                    migrations + repositories (the only code that writes SQL)
   |
 expo-sqlite  -->  workout-buddy.db
```

Dependency rule: arrows only point downward. `domain` imports nothing from the layers above it, which is what makes it testable and portable. UI never writes SQL; repositories never import UI.

### 2.3 Key decisions and alternatives

| Decision | Chosen | Alternatives | Why |
|---|---|---|---|
| Storage | `expo-sqlite` | MMKV/AsyncStorage (key-value), WatermelonDB, Realm | Relational queries (join sets to exercises, aggregate by day) are the app's main workload; SQLite is the smallest, most standard option and works in Expo Go. |
| Navigation | `expo-router` (file-based) | Plain React Navigation | The route tree is visible in the folder structure; deep links come free. |
| State | React context + services; no state library | Redux, Zustand | State is mostly "what's in the database", re-read on focus. A global store would duplicate the database. Revisit if cross-screen live state grows. |
| NLP | Rule-based parser, LLM fallback later | LLM for everything | Instant, free, offline, deterministic and testable. An LLM adds latency, cost, a key, and sends workout text off the device. |
| Units | Store kg and meters; convert at the edge | Store as entered | One canonical unit means stats never mix units. Conversion lives in one file. |
| One session per day | `sessions.day_key` unique | Explicit start/stop workout | Zero friction: logging a set just works. A start/stop session can be added later without a schema break. |
| Charts | Hand-built SVG | victory-native, Skia | Seven bars don't justify a dependency. Revisit for trend lines. |
| Config defaults in code, overrides in DB | Yes | Remote config | Single user, offline. New defaults ship with the app; your changes persist. |

### 2.4 Data model (schema version 1)

```
config(key PK, value, updated_at)                    overrides only
exercises(id, name, name_key UNIQUE, muscle_group, equipment, instructions,
          image_uri, video_url, source, enrichment_status,
          enrichment_confidence, created_at, updated_at)
sessions(id, day_key UNIQUE, started_at, ended_at, notes)
sets(id, session_id -> sessions CASCADE, exercise_id -> exercises RESTRICT,
     reps, weight_kg, duration_sec, distance_m, notes, is_pr, created_at)
        indexes: (exercise_id, created_at), (session_id), (created_at)
dashboard_cards(id, card_type UNIQUE, position, enabled)
app_logs(id, level, source, message, detail, created_at)
```

Notes: `ON DELETE RESTRICT` on `sets.exercise_id` is why an exercise with logged sets can't be deleted (the app explains this in plain language). Timestamps are integer epoch milliseconds. Photos are never stored as blobs; only a file URI is kept.

**Planned additions** (each is a new migration, never an edit): `body_metrics` (date, weight_kg, height_cm, notes), `goals` (type, target, start/target dates), `photos` (uri, taken_at, pose, session_id), `heart_rate_samples` or a per-session summary, `ai_insights` (cached analyses with the inputs hash, so you don't pay twice).

### 2.5 AI architecture (Phases 3-4)

- **Compute first, narrate second.** Deterministic code produces the facts (e1RM trend, volume per muscle group, frequency, adherence, bodyweight moving average vs goal line). Only a compact summary of those facts goes to the model, which writes the explanation and suggestions. Cheaper, more private, easier to test, and far less likely to invent numbers.
- **Provider behind an interface** (`ExerciseVerifier` already exists in this shape; `Coach` and `ParserFallback` follow). Swapping models or running offline is a change in `createServices.ts` only.
- **Keys.** Not in the config table (plain SQLite). `expo-secure-store` for a key held in the app. Fine for a personal app; a public release would need a small server-side proxy so the key isn't on the device. **Decision needed** (see section 5).
- **Cache** results keyed by an input hash; cap spend with a config limit.
- **Safety.** Fitness suggestions are not medical advice; show that where guidance appears. Don't give diet or injury-diagnosis advice.

### 2.6 Security and privacy

You review credit-union solutions, so being explicit here:

- All data is local to the phone; there is no account and no server in the shell.
- **Android Auto Backup** may copy app data (database and photos) to the user's Google account depending on the manifest setting. Decide this deliberately before photos exist (to verify in the generated Android config).
- Anything that leaves the device later (affirmation fetch, AI calls, video search) is listed in `ARCHITECTURE.md` and behind a config switch. Health and photo data should be opt-in per feature.
- Never log health data or photo paths in `app_logs` beyond what is needed to debug; the log is user-visible and may be shared.

### 2.7 Testing strategy

- Domain logic: unit tests (parser, matcher, stats, calculators, timer, units, config validation).
- Services + SQL: integration tests against a real SQLite engine via an adapter (`tests/helpers/nodeSqliteAdapter.ts`).
- UI: not covered by automated tests yet. Next step would be React Native Testing Library for the Log screen, then a device smoke test checklist.
- Gate before every merge: `npm run typecheck && npm test`.

---

## 3. Phased plan

Ordering logic: **get the daily-driver loop working and start collecting data first**, because every AI feature is only as good as the history behind it. Do the deterministic analytics before AI (80% of "what's working" with no cost or privacy risk). Put anything needing a dev build, a paid API, a policy review or sensitive data last.

| Phase | Goal | Main work | Exit criteria |
|---|---|---|---|
| **0. Shell** (done) | Runnable foundation | Config, DB, logging, parser, timer, calculators, dashboard, library, detail pages, tests | Typecheck, tests, Android bundle all green |
| **1. Daily driver** | Use it in the gym | Run on your phone; lock-screen rest alert (local notification); CSV export; bodyweight + height log and goals (data collection starts); decide affirmation source; image source decision | You log a real week of workouts without friction |
| **2. Insight (no AI)** | Trends you can trust | Per-exercise e1RM/volume charts; muscle-group volume balance; streaks and adherence; goal-vs-weight timeline; MET calorie estimate (labeled approximate); more dashboard cards | Dashboard answers "am I progressing?" from data alone |
| **3. Voice + smart library** | Hands-free and auto-enrichment | Dev build; speech-recognition module; LLM parser fallback; AI-backed `ExerciseVerifier`; curated or API video links; exercise images | Dictated sentences log correctly; new exercises auto-fill or flag |
| **4. AI coach** | Guidance | Summary-based analysis; weekly review; "where to focus" card; goal feasibility; key/proxy decision implemented; spend cap | Guidance cites the numbers it is based on |
| **5. Photos** | Visual progress | Camera, downscaled local storage (~0.2-0.4 MB each), timeline and side-by-side compare; optional AI analysis (opt-in) | Photos stay under a storage budget and never leave the device by default |
| **6. Wearables** | Heart rate | Health Connect import per session; avg/max HR and calories on session detail; (live HR only if you want a Wear OS app) | A watch-tracked session shows HR |

Rough relative size: 1 = M, 2 = M, 3 = L, 4 = M, 5 = M, 6 = L (6 is the most dependent on which watch you own).

---

## 4. What is deliberately NOT in the shell

- Real AI of any kind (verification, analysis, coaching, parsing fallback). The shell has the seams for them, not the calls.
- Voice beyond the keyboard mic button.
- Exercise images and photo capture.
- Heart-rate / watch integration.
- Bodyweight, goals and the progress-vs-goal analysis.
- Notifications (the rest timer vibrates and keeps the screen awake while the app is open).
- Editing a set does not re-evaluate its personal-best flag (documented in code).
- Unhandled promise rejections are not auto-captured by the global handler (async UI handlers use `ErrorReporter.guard` instead).
- The personal-bests card scans all sets on each dashboard load. That's fine into the tens of thousands of sets; the planned fix is a SQL aggregate or cached table.

## 5. Decisions for you

These change what gets built next; I'd rather talk them through than guess.

1. **Which smartwatch** (brand/model)? It decides whether Phase 6 is a modest Health Connect read or a bigger project.
2. **Which gratitude/affirmation source**, and does it offer an API, RSS feed or terms that allow reuse?
3. **AI key strategy**: key held in the app (simple, fine for personal use) vs a small proxy (needed if this might ever be shared or published).
4. **Photos/BMI**: are you open to computing BMI from entered numbers and using photos for visual comparison, rather than photo-estimated BMI?
5. **Exercise images**: bundle a curated set, or download on first use? (Needs a licensed source checked first.)
6. **Android package name**: currently `com.workoutbuddy.app` in `app.json`. It can change freely until the first Play Store upload; after that it can't.
