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
- Auth: Cloudflare Access (Zero Trust), only bradgarropy@gmail.com. The email
  header is NOT trusted on its own: workers.dev exposure is disabled, Access
  covers every hostname/route, AND the Access JWT (Cf-Access-Jwt-Assertion) is
  cryptographically validated server-side before any identity is trusted.
  Implemented + verified FIRST.
- Accounts: dynamic table; type = asset | debt | credit.
- Convention: CURRENT (post-payoff). Checking recorded after cards are paid;
  net worth = sum of asset + debt balances (debts stored negative, so they net
  out; Mortgage today); credit cards EXCLUDED from net worth and used only for
  Spending. (Possible future switch noted below.)
- History + Constants imported from CSV exports kept OUTSIDE the public repo.
- Charts: Recharts (client-rendered).
- Remove the Sentry demo routes.

## Data model

- Accounts (Balances tab): Checking, Savings, Emergency, 401k, HSA, Investments
  (assets); Mortgage (debt); NFCU, Apple (credit).
- Sign convention: assets positive; debts and credit balances negative (matches
  the spreadsheet). Net worth = SUM of balances. Money stored as integer cents.
- Weekly entries keyed by date; history back to ~2008.
- Net worth = sum of asset + debt balances (debts negative); credit excluded
  (checking already reflects weekly payoff; subtracting cards would double-count
  spend).
- Weekly spend = absolute value of summed credit-type balances that week (credit
  stored negative; no separate table).
- Derived, not stored: assets/debt/worth series, growth rates, spend averages,
  savings split.

## Configurable windows (Overview growth + Spending averages)

- Presets: 4 / 12 / 26 / 52 weeks + All-time.
- Dynamic "Since [week]": pick any past week (dropdown or chart click); metric
  computed on the fly from that week to now. No stored table.

---

## Phase 1 - Cloudflare Access (lock down FIRST)

- Bind finance.bradgarropy.com as a Workers custom domain. Disable the
  workers.dev route (`workers_dev: false`) and confirm no other hostname/route
  reaches the Worker without Access in front - removes the unauthenticated
  bypass path.
- Zero Trust > Access > Applications: self-hosted app for the domain; Allow
  policy email == bradgarropy@gmail.com; default block. Record the Application
  Audience (AUD) tag and team domain.
- `src/utils/auth.ts`: validate the Access JWT in `Cf-Access-Jwt-Assertion`
  before trusting any identity:
    - Fetch + cache team JWKS from
      https://<team>.cloudflareaccess.com/cdn-cgi/access/certs.
    - Verify signature, `iss` (team domain), `aud` (app AUD tag), and expiry.
    - Require verified token email == bradgarropy@gmail.com; 403 otherwise.
    - Applied in the root loader so every route is protected before features
      exist. `Cf-Access-Authenticated-User-Email` is only a convenience read
      AFTER the JWT verifies - never trusted alone.
    - Store team domain + AUD as Worker vars/secrets.
- VERIFY: only Brad's email passes via the custom domain; forged email headers
  and any non-Access request path are rejected (403); confirm workers.dev is
  unreachable.

## Phase 2 - Drizzle + schema

- Add deps: `drizzle-orm`, `drizzle-kit` (dev).
- `drizzle.config.ts`: sqlite dialect; schema `src/db/schema.ts`; out
  `src/db/migrations`.
- `src/db/schema.ts`: - `accounts(id, name UNIQUE, type 'asset'|'debt'|'credit', sortOrder,
archived)` - `balances(id, accountId FK, date TEXT, amountCents INT,
unique(accountId,date))` + index on date. Money = integer cents; debts and credit stored negative. - `settings(key TEXT PK, value TEXT)` - seeded from Constants tab:
  checking_baseline_cents=2000000, savings_invest_pct=75,
  savings_save_pct=25, default_window=52, checking_convention=post_payoff.
- `src/db/client.ts`: `db(env)` -> `drizzle(env.DB, { schema })`.
- Generate + apply: `drizzle-kit generate` then
  `wrangler d1 migrations apply finance --local` / `--remote`.

## Phase 3 - DB query helpers (typed, Drizzle)

- `src/db/queries.ts`: listAccounts, getLatest, getHistory, getBalancesByDate,
  upsertBalances(date, entries) (onConflictDoUpdate), getSettings, setSetting.

## Phase 4 - Historical import (no data committed to repo)

- Export Balances + Constants tabs to CSVs OUTSIDE the repo (e.g. ~/Desktop).
- `scripts/import.ts` takes CSV path args; reads at runtime only.
    - Clean `$`, thousands commas, `(parens)`=negative.
    - Detect orientation (dates rows vs cols) - finalize against real headers.
    - Seed accounts (assign asset/debt/credit), bulk-insert balances, seed
      settings from Constants. Idempotent upserts.
- Local D1 first, validate, then `--remote`.
- Safety: add `*.csv`, `*.numbers` to `.gitignore`. Repo holds only code.

## Phase 5 - Weekly input flow (FIRST feature after import)

Built first to validate that data writes into D1 accurately before any read/
chart views sit on top of it.

- Update `src/routes.ts`; delete sentryFrontend/Loader/Action routes + entries
    - tests. Every loader/action calls the Phase 1 auth guard.
- `/new`: stepped form (one account per step), prefilled with prior week's
  value, date defaults to upcoming weekend; action upserts all balances via
  `upsertBalances`.
- Update `Navigation.tsx` with Add Entry (more links added as views land).
- VERIFY: enter a week manually, confirm the round-trip against imported data.

## Phase 6 - Finance math

- `src/utils/finance.ts` pure helpers (unit tested): net-worth series; growth
  over window N and since-anchor; weekly spend series; overall + rolling +
  since-anchor spend averages; savings split. Net-worth + savings respect the
  `checking_convention` setting.

## Phase 7 - Read views (Overview, Spending, Savings, Settings)

Every loader calls the Phase 1 auth guard.

- `/` Overview: assets/debt/net-worth table + chart; growth-rate window selector
  (presets + all-time + since-week).
- `/spending`: weekly total (NFCU+Apple), overall avg, rolling avg with same
  window selector; spending trend chart.
- `/savings` (calculator only): excess = latest checking - baseline; recommend
  savings_invest_pct -> investments, savings_save_pct -> savings on positive
  excess. Nothing stored.
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

## Future work (possible, after data is in D1)

- Switch checking convention to pre-payoff + subtract cards from net worth.
  Requires, in lockstep:
    1. One-time idempotent backfill `scripts/normalize-checking.ts`:
       checking += weekly card totals for each historical week; guarded by the
       `checking_convention` setting so it can't double-apply.
    2. Net worth includes credit-card balances (already negative) in the sum.
    3. Savings calc adjusts BOTH the excess AND the 75/25 split inputs by the
       outstanding card amount (available_checking = checking - outstanding_cards
        - baseline) so transfer recommendations stay accurate.
          Net-worth totals are unchanged by the switch; only checking representation,
          card treatment, and the savings inputs change.
