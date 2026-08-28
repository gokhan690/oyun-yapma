# CLAUDE.md

Guidance for AI assistants working in this repository.

## What this project is

**İş İmparatorluğu** (`oyun-yapma`) — a Turkish-first idle/tycoon clicker game shipped as
a mobile-shaped web app and wrapped for Android via Capacitor. Player builds businesses,
runs a career, plays the stock market, goes public (IPO), and passes an empire down a
dynasty. Version `3.0.0`.

**Stack:** TypeScript ~6.0 + Vite 8 (rolldown). **No UI framework** — everything is
hand-written imperative DOM (`document.createElement`, class-based components).
No state library, no router, no test runner. Persistence is `localStorage` only;
Supabase is optional and currently only wired into dormant code (see below).

The primary language of the codebase is **Turkish**: comments, doc-blocks, commit bodies,
`docs/`, `README.md`, and many identifiers (`kariyer`, `firmalar`, `stajyer`, `torpil`).
Match that when editing existing files — write Turkish comments in Turkish files.

## Commands

```bash
npm install                     # or: npm ci
npm run dev                     # vite dev server, port 5173 (strict)
npm run build                   # tsc (typecheck, noEmit) && vite build → dist/
npm run preview                 # serve dist/ on port 4173 (strict)
npm run cap:sync                # build + npx cap sync (Android native)
npm run cap:android             # cap:sync + open Android Studio
```

There is **no lint, format, or unit-test command**. `npm run build` is the only static
gate — always run it before committing. `tsc` typechecks all of `src/` (see
`tsconfig.json` `include`), which is broader than what Vite actually bundles.

**Headless gotcha:** `vite.config.ts` sets `server.open: true`, and Vite's preview server
inherits it. In a headless/CI container both `dev` and `preview` crash with
`spawn xdg-open ENOENT`. Prefix with `BROWSER=none`:

```bash
BROWSER=none npm run preview
```

### Smoke tests (Playwright)

`scripts/test-*.mjs` are standalone Playwright scripts, not a test framework. They drive a
real browser against a running server and `process.exit(1)` on failure.

```bash
npm run build
BROWSER=none npm run preview &
node scripts/test-boot.mjs http://127.0.0.1:4173/          # boot + onboarding + first purchase
node scripts/test-boot.mjs http://127.0.0.1:4173/ --fresh  # forces the fresh-install path
node scripts/test-tur15-b.mjs http://127.0.0.1:4173/       # firm economy / save-purity regression
```

They need a Playwright-matched Chromium (`npx playwright install chromium`); a mismatched
preinstalled browser will fail with "Executable doesn't exist at …". Some scripts write
screenshots to `test-results/` (untracked).

These scripts reimplement the save envelope (XOR + FNV-1a checksum, key
`is_imparatorlugu_save_v10`, version `10`) so they can seed a save directly. **If you
change the save format in `src/security/SaveManager.ts`, update the copies in
`scripts/test-*.mjs` too** — they are duplicated on purpose, not imported.

`test-tur15-b.mjs` also asserts a `FORBIDDEN_DERIVED_KEYS` list never appears in the
persisted save. See "Persistence contract" below.

## Architecture

### Entry points

| HTML | Entry module | Purpose |
|------|--------------|---------|
| `index.html` | `src/main.ts` | The real game. Boots i18n → save → onboarding or `RefApp`. |
| `firms.html` | `src/ref-firms-main.ts` | Isolated Ref-UI preview with **mock data**, no `GameState`. Design sandbox. |

`public/boot.js` is a plain (non-module) boot guard loaded before the bundle. It shows a
localized failure screen if boot takes >18s or the module fails, exposes
`window.__II_MARK_BOOTED__` / `__II_SHOW_BOOT_ERROR__`, and can wipe save keys from the
error screen. `src/main.ts` calls `__II_MARK_BOOTED__()` once boot succeeds.

`index.html` carries a **strict CSP `<meta>`**. Any new external origin (fonts, analytics,
API) must be added there or it will be silently blocked.

### The three layers

```
src/game/**        domain + rules  (87 modules, no DOM)
   └── GameState.ts    god object: all mutable state, tick loop, event bus
src/security/SaveManager.ts   serialize / migrate / validate / autosave
src/ui/ref/**      the shipped UI  (RefApp shell + one class per page)
```

**`src/game/GameState.ts` (~7.6k lines)** is the single source of truth. It owns every
gameplay field, the `requestAnimationFrame` tick, and a listener set. UI subscribes:

```ts
const unsub = state.subscribe((ev: GameEvent) => { /* ~130-variant discriminated union */ })
```

`GameEvent` is declared at the top of `GameState.ts`. Adding a gameplay signal means
adding a variant there and handling it in `RefApp`'s single subscription
(`src/ui/ref/RefApp.ts`) or in `RefNotificationBridge` / `RefRewardQueue`.

Domain modules under `src/game/` are mostly **pure**: they export defs (`PRODUCERS`,
`UPGRADES`, `DEPARTMENTS`, …), cost/bonus functions, and `createXState()` factories.
`GameState` imports them and holds the mutable instances. Keep new rules in a domain
module and let `GameState` be the thin caller.

`src/game/controllers/README.md` states the intended direction: new domain logic should
go into `controllers/*` rather than growing `GameState` further. Only a skeleton
(`EventController.ts`) exists so far — the big split is deliberately deferred because of
save-regression risk.

### The UI (Ref UI)

`src/ui/ref/` is the **only UI that ships**. `RefApp` is the shell: header + time bar +
scrollable body + bottom nav, plus a firm-detail overlay. Six tabs:
`home | career | market | firms | empire | life` (`RefBottomNav.ts`).

Every page implements the `RefPage` interface declared in `RefApp.ts`:

```ts
interface RefPage {
  readonly el: HTMLElement       // body content
  readonly title: string
  onShow?(): void
  refresh?(state: GameState): void   // update live numbers WITHOUT rebuilding DOM
  destroy?(): void                   // tear down subscriptions/timers
}
```

Rules that hold across the Ref UI:

- Pages are **lazily constructed on first visit** and cached in `RefApp.pages`.
- There is **one** `GameState` subscription, in `RefApp`. It refreshes only the mounted
  page; `money_changed`/`passive_income` are throttled, `purchase` is immediate. Don't add
  per-page subscriptions to `GameState`.
- `refresh(state)` must mutate text nodes in place. Rebuilding the page on every money
  tick will visibly thrash.
- **Reads** go through `src/ui/ref/refAppDataAdapter.ts` (`buildRefViewModel`), which is a
  documented **read-only** boundary — no writes, no side effects, deterministic fallbacks.
  Keep it that way.
- **Writes** call `GameState` methods directly from the page
  (`state.buyProducer(id, qty)`, `state.levelUpFirm(id)`, `state.upgradeDepartment(id)`).
- Shared helpers live in `refShared.ts`: `fmtMoney`, `refToast`, `ua()` (asset path),
  and inline SVG chart builders (`areaChartSvg`, `donutSvg`, `gaugeSvg`, `ringSvg`).
- CSS classes are prefixed `ref-` and live in `src/ui/ref/ref-ui.css`.

### Dormant legacy UI — read this before "fixing" anything in `src/ui/components/`

`src/ui/HUD.ts` (~4.5k lines) and nearly all of `src/ui/components/**` are the pre-3.0 UI.
They are **not reachable from either entry point** and are not in the bundle (the
production build transforms ~171 modules; the legacy tree is excluded). The only
component `main.ts` still uses is `OnboardingOverlay`.

Unreachable today, and dragged along only by that dead tree:
`src/ui/HUD.ts`, `src/ui/Skyline.ts`, `src/ui/Tutorial.ts`,
`src/ui/components/**` (except `OnboardingOverlay.ts`),
`src/monetization/IAPManager.ts` + `NativeBillingBridge.ts`, `src/game/Leaderboard.ts`,
`src/owner/OwnerAuth.ts` + `OwnerAccessGate.ts` + `OwnerSecrets.ts`,
`src/game/ProgressiveUnlock.ts`, `ShopAdvisor.ts`, `TimeSkip.ts`, `CodexLore.ts`,
`EraTheme.ts`, `src/effects/ParticleSystem.ts`, `src/appVersion.ts`,
`src/ui/ref/RefTestLauncher.ts`.

Consequences:

- Features the `README` advertises (IAP purchase/restore, Supabase leaderboard, the hidden
  "Baron console") currently have **no live UI path**. Don't assume a bug report about them
  is a regression in shipped code.
- These files **still have to typecheck** — `tsc` covers all of `src/`. A rename in
  `src/game/` that breaks `HUD.ts` breaks the build.
- Fix gameplay bugs in `src/ui/ref/`, not in `HUD.ts`. Don't delete the legacy tree unless
  explicitly asked.

## Conventions

### Code style

No semicolons, single quotes, 2-space indent, trailing commas in multiline literals.
No formatter is configured — copy the surrounding file.

`tsconfig.json` is strict in ways that bite:

- `verbatimModuleSyntax` — type-only imports **must** use `import type { … }`.
- `noUnusedLocals` / `noUnusedParameters` — an unused variable fails the build.
- `erasableSyntaxOnly` — **no `enum`, no `namespace`, no constructor parameter
  properties**. Use `as const` string-union types (the codebase does this everywhere).
- `allowImportingTsExtensions` + `noEmit` — Vite does the emitting.

### i18n — 10 languages, all mandatory

`tr | en | zh | es | ru | pt | ja | ar | de | fr`. Arabic sets `dir="rtl"` on `<html>`.

- `src/i18n/keys.ts` declares the `Translations` interface (~3000 keys).
- `src/i18n/locales/tr.ts` is the fallback and is imported eagerly; the other nine are
  **lazily imported** and code-split into `locale-*` chunks.
- **Adding a key means editing 11 files**: `keys.ts` plus all ten locales. Locale files are
  interface-typed, so a missing key fails `tsc` — which is the safety net.
- `t(key)` / `i18n.t(key)` — typed, falls back to Turkish.
- `fmt(key, { name: value })` — replaces `{placeholder}` tokens.
- `tRaw(key)` — untyped lookup with Turkish fallback, used for dynamic domain keys.
- `requiredDomainText(key)` — active-locale only, returns a visible `[missing:key]`
  sentinel instead of falling back. If you see `[missing:…]` in the UI, a locale is short a
  key.
- Dynamic domain keys follow fixed patterns: `biz_<producerId>`, `biz_<producerId>_desc`,
  `upg_<upgradeId>`, `month_jan`… Content added to `PRODUCERS`/`UPGRADES` needs matching
  keys; `scripts/add-i18n-game-content.mjs` and the `patch-locales-*.mjs` scripts are
  one-shot generators previously used for this.
- Never hardcode user-visible strings in `src/ui/ref/`.

### Persistence contract

Save key `is_imparatorlugu_save_v10` + a `_backup` slot. The envelope is
`{ payload, checksum, version }` where `payload` is XOR-obfuscated (`PT2026x`) base64 and
`checksum` is FNV-1a — **obfuscation, not security**. Autosave every 15s, plus
`beforeunload` / `visibilitychange`. Max 4 MB.

To add a persisted field:

1. Add it to `SerializableState` in `GameState.ts` — **optional (`?`) if old saves lack it**.
2. Write it in `GameState.toJSON()`.
3. Read it in `GameState.loadFrom()` with a defensive default.
4. If it needs coercion/repair for corrupt or legacy saves, extend `repairState()` in
   `SaveManager.ts`.

Hard rules:

- **Never persist derived values.** Anything computable from base state (rankings, income
  snapshots, sort order, salary previews, economy snapshots) must be recomputed. The
  `test-tur15-b.mjs` regression fails the build-out if such keys appear in the save. UI-only
  preferences use their own `localStorage` key (e.g. `tur15b_firm_sort`), not the save.
- **Don't bump `CURRENT_VERSION` casually.** `SaveManager.load()` walks a migration chain
  v10 → v10 backup → v9 → … → v1, each with its own loader. A new version means a new rung
  and a migration test.
- `SaveManager.setSaveEnabled(false)` exists so a failed load can never overwrite a real
  save with an empty one. Preserve that guard when touching boot flow.

`src/main.ts` boot has three branches, all of which matter:
save loaded (with an "empty but valid save → treat as fresh start" sub-case),
no save slot at all (→ `OnboardingOverlay`), and
slots exist but all failed (→ recovery screen offering retry / restore backup / reset).

### Money and time

- Mutate cash through `state.creditMoney(amount, { source, countsAsEarned })` and
  `state.debitMoney(amount, { source })`. They write the `MoneyLedger` transaction log
  (`MoneySource` union in `src/game/MoneyLedger.ts`, last ~50 entries persisted).
  `addMoney()` is the older raw path — prefer credit/debit for anything new.
- Game clock (`src/game/GameClock.ts`): **12 real seconds = 1 economy day**
  (`MS_PER_GAME_DAY`). Life/aging time runs `LIFE_TIME_SCALE = 6` times faster, so
  ~1 real hour ≈ 5 game years. Daily settlement (business income + career wage) happens on
  game-day rollover inside `GameState.startTick()` and correctly handles multi-day catch-up.
- Offline earnings are applied once at boot from `lastSaveTime`, capped
  (`BASE_OFFLINE_CAP_GAME_DAYS = 365`).

### Early-game gating

The opening is deliberately career-first: `firmsPurchaseUnlocked()` blocks buying any
business until the player has picked a job **and** taken ≥3 career actions or earned
≥₺1000 in wages. `firmsPurchaseLockStatus()` feeds the UI hint. Several meta systems are
additionally time-gated (`isMetaSystemsReady()`, `isEarlyGameProtected()`,
`canShowDailyRewardPrompt()`). Tests and manual QA of "buy a firm" must go through this
flow — money alone is not enough.

`DailyPlan.ts` ("Bugünün Hamleleri") generates the daily task list; tab visits emit
`DailyEvent`s from `RefApp` via the `DAILY_VISIT_EVENTS` map, kept there so `DailyPlan.ts`
stays UI-free.

### Assets and base path

The app deploys under a subpath on GitHub Pages (`VITE_BASE=/oyun-yapma/`) and at root on
Render. **Never hardcode `/assets/...`** — use `assetUrl(path)` (`src/utils/assetUrl.ts`)
or `ua(path)` in the Ref UI. Ref-UI art lives in `public/assets/ref-v2/**` and is chosen by
*category*, never by firm name (`RefCard.firmIconSrc`).

### CSS

`src/ui/tokens.css` (design tokens, theme classes on `html.theme-*`) →
`src/ui/styles.css` (10k lines, mostly legacy) → `src/ui/responsive.css` →
`src/ui/ref/ref-ui.css` (3.4k lines, imported by `RefApp`, this is the live one).
New UI styling belongs in `ref-ui.css` using `ref-` prefixed classes and the tokens.

### Storage keys in use

`is_imparatorlugu_save_v10` (+ `_backup`, + v1–v9 legacy), `baron_lang`,
`baron_setup_done`, `ii_crash_log`, `tur15b_firm_sort`, `is_imparatorlugu_iap_receipts`,
`is_imparatorlugu_leaderboard`, `is_imparatorlugu_web_push_alarms`,
`is_imparatorlugu_push_sub`, `ii_owner_*`.

## Environment, build targets, deployment

Copy `.env.example` → `.env`. All client vars are `VITE_`-prefixed and therefore **public
in the bundle**:

| Var | Use |
|-----|-----|
| `VITE_ADMOB_APP_ID`, `VITE_ADMOB_BANNER_ID`, `VITE_ADMOB_INTERSTITIAL_ID`, `VITE_ADMOB_REWARDED_ID` | AdMob unit IDs (defaults are Google's public test IDs) |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | optional leaderboard backend (`supabase/friends.sql`) |
| `VITE_OWNER_PIN`, `VITE_OWNER_ACCESS_CODE` | hidden owner/debug console gate |
| `VITE_BASE` | Vite base path; `/oyun-yapma/` for GitHub Pages, unset elsewhere |

`.env.example` ships a live-looking Supabase anon key and a default owner PIN. Treat the
owner credentials as secrets in any real deploy (`render.yaml` marks them `sync: false`);
don't copy them into new files, logs, or commit messages.

**Deploy targets:**

- **GitHub Pages** — `.github/workflows/deploy.yml`, on push to `master`, builds with
  `VITE_BASE=/oyun-yapma/`. This is the only CI; it runs `npm ci && npm run build` and
  does **not** run the Playwright scripts.
- **Render** — `render.yaml` static site, `npm install && npm run build` → `./dist`,
  no-cache on HTML, immutable on `/assets/*`.
- **Android** — Capacitor, `appId: com.paratuzaqi.game`, `webDir: dist`. When bumping the
  app version, change **`package.json` `version`** (surfaced in-app via the
  `__APP_VERSION__` define from `vite.config.ts`) **and** `android/app/build.gradle`
  `versionCode` / `versionName` together (currently `300` / `3.0.0`).

`vite.config.ts` hand-tunes `manualChunks`: `vendor-capacitor`, `vendor`, per-language
`locale-*`, `game-core` (GameState), `ui-shop`, `ui-lifestyle`. Adding a large dependency
or a new locale usually means touching that function.

## Repo map

```
index.html / firms.html    entry HTML (CSP meta lives in index.html)
public/boot.js             pre-bundle boot guard + localized failure screen
public/sw.js               service worker
public/assets/ref-v2/**    Ref UI art (SVG/PNG/WebP), chosen by category
src/main.ts                production bootstrap (i18n → save → onboarding/RefApp)
src/ref-firms-main.ts      mock-data Ref UI sandbox (firms.html)
src/game/                  87 domain modules; GameState.ts is the hub
src/game/controllers/      intended landing zone for extracted domain logic
src/i18n/                  keys.ts (interface) + locales/*.ts (10 languages)
src/security/SaveManager.ts  envelope, migrations v1→v10, repair, autosave
src/ui/ref/                the shipped UI (RefApp + pages + ref-ui.css)
src/ui/components/         dormant pre-3.0 UI (only OnboardingOverlay is live)
src/ads, src/monetization, src/notifications, src/owner, src/audio, src/effects
scripts/test-*.mjs         Playwright smoke/regression scripts
scripts/*.mjs (other)      one-shot codegen: icons, locale patches, CSS split
docs/QA.md                 device/QA matrix
docs/STORE_LISTING.md      Play Store copy
CHANGELOG.md               manually maintained, newest first
```

## Working agreements

- **Conventional commits**, Turkish or English subject:
  `feat(career): add entrepreneur transition CTA`, `fix: remove firm payback label`,
  `test: add TUR15-B persistence regression suite`. Scopes in use: `career`, `firms`,
  `economy`, `refapp`, `i18n`, `ui`, `core`, `game`, `save`, `boot`.
- Run `npm run build` before every commit; run the relevant `scripts/test-*.mjs` when you
  touch boot, save, career gating, or firm economy.
- Add a `CHANGELOG.md` entry for user-visible changes (newest first, Turkish).
- Balance numbers (`PRODUCERS` costs/incomes, career wages, event pacing) are tuned, not
  arbitrary. Changing one shifts the whole progression curve — say so explicitly rather
  than adjusting quietly.
- Don't introduce a framework, a bundler change, or a state library to solve a local
  problem.
