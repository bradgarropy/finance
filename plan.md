# Plan: Weekly Finances → Cloudflare D1 + Private Web App

## Objective

Replace the manual Numbers workflow (Balances, Overview, Spending, Savings,
Constants tabs) with a private web app at finance.bradgarropy.com. Only Brad can
access it. Weekly account balances are entered via a stepped form; the app shows
net-worth/growth, spending, and savings-transfer views. Data lives in Cloudflare
D1 via Drizzle ORM. Full history is imported from the spreadsheet.

## Decisions (locked)

- Storage: Cloudflare D1 (binding `DB`, db `finance`) via Drizzle ORM.
- Migrations: Drizzle Kit generates SQL; Wrangler applies it.
- Auth: Cloudflare Access (Zero Trust), only bradgarropy@gmail.com, enforced at
  the edge. workers.dev exposure is disabled and the custom domain is the only
  route, so the only path to the Worker is through Access. Decided to rely on
  the Access policy alone - NO in-Worker JWT validation (we tried to spoof it
  and could not; see Phase 1). Security therefore depends on config discipline
  (see the guardrail note in Phase 1). Implemented + verified FIRST. [DONE]
- Accounts: dynamic table. `type = asset | liability`; `category` (CHECK):
  cash, savings, investment, retirement, mortgage, credit. Store BOTH type and
  category. `category = credit` is load-bearing for Spending only.
- Storage: all balances stored as POSITIVE magnitudes; sign is derived from
  `type`. Money as integer cents.
- Convention: PRE-PAYOFF / standard. The weekly form captures one point-in-time
  snapshot BEFORE any money is moved (checking still holds the amount that will
  pay the cards); the app then recommends card payments + savings transfers.
  Net worth = SUM(assets) - SUM(liabilities) with credit INCLUDED as a liability
  (no exclusion rule). Requires: import backfills historical checking to
  pre-payoff (+ card totals), and the Savings calc uses available (post-payoff)
  checking = checking - outstanding credit.
- History + Constants imported from CSV exports kept OUTSIDE the public repo.
- Charts: Recharts (client-rendered).
- Remove the Sentry demo routes.

## Data model

- Accounts (Balances tab), each with `type` + `category`:
    - Checking -> asset / cash
    - Savings -> asset / savings
    - Emergency -> asset / savings
    - Investments -> asset / investment
    - HSA -> asset / investment
    - 401k -> asset / retirement
    - Mortgage -> liability / mortgage
    - NFCU, Apple -> liability / credit
- Sign convention: store ALL amounts as positive magnitudes; derive sign from
  `type` in the logic. Money stored as integer cents.
- Weekly entries keyed by date; history back to ~2008.
- Net worth = SUM(assets) - SUM(liabilities). Credit is INCLUDED (at the
  pre-payoff snapshot you genuinely owe the card balance). No exclusion rule.
- Weekly spend = SUM of `category = credit` balances that week, captured
  pre-payoff so they equal that week's spend (no separate table).
- Savings (available/post-payoff): `available = checking - SUM(credit)`;
  `excess = max(available - baseline, 0)`; invest = invest_pct x excess,
  save = save_pct x excess. (Backs the cards out of checking since checking is
  stored pre-payoff.)
- Derived, not stored: assets/liabilities/net-worth series, growth rates, spend
  averages, savings split.

## Configurable windows (Overview growth + Spending averages)

- Presets: 4 / 12 / 26 / 52 weeks + All-time.
- Dynamic "Since [week]": pick any past week (dropdown or chart click); metric
  computed on the fly from that week to now. No stored table.

---

## Phase 1 - Cloudflare Access (lock down FIRST) - DONE

Shipped as Access-only (no in-Worker auth). PR #3 (`🔐 lockdown`) merged + deployed.

What was done:

- `wrangler.jsonc`: bound finance.bradgarropy.com as a Workers custom domain and
  disabled the workers.dev route (`workers_dev: false`). The custom domain is the
  only route, so every request must pass through Access.
- Zero Trust > Access > Applications: self-hosted app for the domain; Allow
  policy email == bradgarropy@gmail.com; One-Time PIN login. Verified login works.
- No Worker-side auth code: the app renders for any request that reaches it; the
  edge Access policy is the only gate.

Decision - Access policy only, no JWT validation:

- We initially built in-Worker Access JWT verification (`jose`: JWKS fetch, verify
  signature + iss + aud + expiry, 403 otherwise) plus a root-loader guard and
  tests, then removed it to test whether the Access policy alone suffices.
- Spoof test against the live deployment confirmed it holds:
    - No cookie -> 302 to the Access login.
    - Forged `Cf-Access-Authenticated-User-Email` header -> 302 (Access ignores it).
    - Forged `Cf-Access-Jwt-Assertion` header -> 302.
    - Forged `CF_Authorization` cookie -> 302 (Access validates the signature).
    - Old `*.workers.dev` URL -> 404 (`error code: 1042`, no Worker bound).
- Could not spoof it, so we kept Access-only. The JWT verification code is
  preserved in the `phase-1-access` branch history if we ever need it.

GUARDRAIL (config discipline): this security relies on the Worker having no
un-gated path. Before adding sensitive data, and whenever changing routing:
keep `workers_dev: false`, do NOT add another route/custom domain without its own
Access app, and do NOT re-enable preview/version URLs. If any un-gated path is
introduced, restore the in-Worker JWT verification so it fails closed.

## Phase 2 - Drizzle + schema

- Add deps: `drizzle-orm`, `drizzle-kit` (dev).
- `drizzle.config.ts`: sqlite dialect; schema `src/db/schema.ts`; out
  `src/db/migrations`.
- `src/db/schema.ts` defines three tables:
    - `accounts(id, name UNIQUE, type CHECK('asset'|'liability'), category CHECK('cash'|'savings'|'investment'|'retirement'|'mortgage'|'credit'), sortOrder, archived)`
    - `balances(id, accountId FK, date TEXT, amountCents INT, unique(accountId, date))`, plus an index on `date`
    - `settings(key TEXT PK, value TEXT)`, seeded from the Constants tab:
      `checking_baseline_cents=2000000`, `savings_invest_pct=75`,
      `savings_save_pct=25`, `default_window=52`
    - Money stored as integer cents, always POSITIVE; sign is derived from
      `account.type` in the logic (net worth = SUM(assets) - SUM(liabilities)).
- `src/db/client.ts`: `db(env)` -> `drizzle(env.DB, { schema })`.
- Generate + apply: `drizzle-kit generate` then
  `wrangler d1 migrations apply finance --local` / `--remote`.

## Phase 3 - DB query helpers (typed, Drizzle)

- `src/db/queries.ts`: listAccounts, getLatest, getHistory, getBalancesByDate,
  upsertBalances(date, entries) (onConflictDoUpdate), getSettings, setSetting.

## Phase 4 - Historical import (no data committed to repo)

- Export Balances + Constants tabs to CSVs OUTSIDE the repo (e.g. ~/Desktop).
- `scripts/import.ts` takes CSV path args; reads at runtime only.
    - Clean `$`, thousands commas, `(parens)`; store all amounts as positive
      magnitudes.
    - Detect orientation (dates rows vs cols) - finalize against real headers.
    - Seed accounts (assign type + category per the Data model), bulk-insert
      balances, seed settings from Constants. Idempotent upserts.
    - Pre-payoff backfill: for each historical week, add that week's total card
      balances to checking (the spreadsheet recorded checking post-payoff; we
      store pre-payoff). Deterministic since we have every week's card balances;
      net worth values are unchanged.
- Local D1 first, validate, then `--remote`.
- Safety: add `*.csv`, `*.numbers` to `.gitignore`. Repo holds only code.

## Phase 5 - Weekly input flow (FIRST feature after import)

Built first to validate that data writes into D1 accurately before any read/
chart views sit on top of it.

- Update `src/routes.ts`; delete sentryFrontend/Loader/Action routes + entries
    - tests. (No app-side auth guard - Cloudflare Access gates every request at
      the edge; see Phase 1.)
- `/new`: stepped form (one account per step), prefilled with prior week's
  value, date defaults to upcoming weekend; action upserts all balances via
  `upsertBalances`.
- Update `Navigation.tsx` with Add Entry (more links added as views land).
- VERIFY: enter a week manually, confirm the round-trip against imported data.

## Phase 6 - Finance math

- `src/utils/finance.ts` pure helpers (unit tested): net-worth series
  (SUM(assets) - SUM(liabilities)); growth over window N and since-anchor;
  weekly spend series (SUM of credit); overall + rolling + since-anchor spend
  averages; savings split (available = checking - SUM(credit); excess over
  baseline; invest_pct / save_pct). All amounts positive; sign from `type`.

## Phase 7 - Read views (Overview, Spending, Savings, Settings)

(Cloudflare Access gates every request at the edge; no app-side auth guard.)

- `/` Overview: assets/liabilities/net-worth table + chart (Assets = type=asset,
  Debt = type=liability); growth-rate window selector (presets + all-time +
  since-week).
- `/spending`: weekly total (category=credit: NFCU+Apple), overall avg, rolling
  avg with same window selector; spending trend chart.
- `/savings` (calculator only): available = latest checking - SUM(credit);
  excess = max(available - baseline, 0); recommend savings_invest_pct ->
  investments, savings_save_pct -> savings. Nothing stored.
- `/settings`: edit baseline, split %, default window.
- Update `Navigation.tsx`: Overview, Spending, Savings, Add Entry, Settings.

## Phase 8 - Tests & verification

- Unit: finance math, CSV parser. Loader/action tests (per `src/tests/`).
  Optional Playwright e2e for the stepped form. Remove Sentry tests.
- Run: typecheck, lint, test. `npm run dev` w/ local D1; `npm run deploy`;
  reconfirm Access gating.

## Prerequisites from Brad

1. Export Balances + Constants tabs to CSVs under ~/Desktop (outside repo) to
   confirm exact account names, orientation, and constant values.

## Future work

- Carry-a-balance support: the current model assumes cards are paid in full each
  week (card balance = weekly spend). If a balance is ever carried, spend and
  outstanding balance diverge and would need to be tracked separately.
- Optional finer asset categories (e.g. split HSA out of `investment`) if
  liquidity/retirement views need them - requires a CHECK-constraint migration.
