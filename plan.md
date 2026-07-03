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
- UI stack: Base UI primitives + Tailwind styling. Use plain Tailwind for
  simple layout and reach for Base UI as interactive primitives appear.
- Charts: Recharts (client-rendered), with small local chart wrappers as needed.
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
  `excess = max(available - baseline, 0)`;
  `invest = excess_invest_pct x excess`; `save = excess_save_pct x excess`.
  (Backs the cards out of checking since checking is stored pre-payoff.)
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

## Phase 2 - Drizzle + schema - DONE

- Add deps: `drizzle-orm`, `drizzle-kit` (dev).
- `drizzle.config.ts`: sqlite dialect; schema `src/db/schema.ts`; out
  `src/db/migrations`.
- `src/db/schema.ts` defines three tables:
    - `accounts(id, name UNIQUE, type CHECK('asset'|'liability'), category CHECK('cash'|'savings'|'investment'|'retirement'|'mortgage'|'credit'), sortOrder, archived)`
    - `balances(id, accountId FK, date TEXT, amountCents INT, unique(accountId, date))`, plus an index on `date`
    - `settings(id PK CHECK(id = 1), checkingBaselineCents INT CHECK(>= 0), emergencyBaselineCents INT CHECK(>= 0), excessInvestPct INT CHECK(0-100), excessSavePct INT CHECK(0-100), defaultWindow INT CHECK(4|12|26|52))`; split percentages must sum to 100.
    - Money stored as integer cents, always POSITIVE; sign is derived from
      `account.type` in the logic (net worth = SUM(assets) - SUM(liabilities)).
- `src/db/client.ts`: `db(env)` -> `drizzle(env.DB, { schema })`.
- Generate + apply: `drizzle-kit generate` then
  `wrangler d1 migrations apply finance --local` / `--remote`.

## Phase 3 - DB query helpers (typed, Drizzle) - DONE

- `src/db/queries.ts`: getAccounts, getLatestBalances, getAllBalances,
  getBalancesByDate, upsertBalances(date, entries) (onConflictDoUpdate),
  getSettings, setSettings.

## Phase 4 - Historical import (no data committed to repo) - DONE LOCAL

- CSV exports live outside the repo:
    - `~/Desktop/finances/Balances-Raw.csv`
    - `~/Desktop/finances/Constants-Baselines.csv`
    - `~/Desktop/finances/Overview-Overview.csv`
    - `~/Desktop/finances/Spending-Credit Cards.csv`
    - `~/Desktop/finances/Saving-Savings.csv`
    - `~/Desktop/finances/Saving-Ratio.csv`
- Safety: `*.csv` and `*.numbers` are ignored. Repo holds only code.
- `scripts/import.ts` is a self-contained one-time importer. It takes a
  required directory path and reads known CSV exports from that directory at
  runtime only.
- The importer lives in one file and does not have dedicated script tests; it is
  verified by running it against local D1.
- After writing, the importer reads D1 back and validates against spreadsheet
  exports:
    - Overview: assets, debt, and worth.
    - Spending: NFCU, Apple, and total spend.
    - Saving: spent, post-payoff checking, total saved, investments saved, and
      savings saved where those fields are populated.
    - Saving ratio: Investments/Savings split matches imported settings.
- Local D1 import is the default write target:

    ```sh
    npx tsx scripts/import.ts ~/Desktop/finances
    ```

- Remote D1 import requires an explicit flag:

    ```sh
    npx tsx scripts/import.ts ~/Desktop/finances --remote
    ```

- Import behavior:
    - Exact Balances headers are required: Date, NFCU, Apple, Checking,
      Emergency, Savings, 401k, HSA, Investment, Mortgage.
    - Constants headers are required: Account, Baseline.
    - Money parser cleans `$`, thousands commas, whitespace, and `(parens)`;
      stores all amounts as positive integer cents.
    - Dates are normalized to `YYYY-MM-DD`.
    - Seeds 9 accounts with type/category from the Data model.
    - Seeds settings from Constants:
        - Checking baseline: Constants `Checking`.
        - Emergency baseline: Constants `Savings` row.
        - Defaults not present in Constants: `excessInvestPct = 75`,
          `excessSavePct = 25`, `defaultWindow = 52`.
    - Pre-payoff backfill: each historical checking balance is transformed as
      `checking + NFCU + Apple` because the spreadsheet recorded checking after
      card payoff, while the app stores the pre-payoff snapshot. Blank card
      cells count as zero for this transform.
    - Blank NFCU/Apple cells are skipped as balance rows. Explicit `$0.00`
      credit card cells are imported as zero rows.
- Idempotency:
    - Accounts upsert on unique `accounts.name`.
    - Settings upsert on singleton `settings.id = 1`.
    - Balances upsert on unique `(account_id, date)`.
    - Rerunning the local import updates existing rows instead of duplicating
      them.
- Local verification:
    - Local import wrote 9 accounts, 1 settings row, 764 balance rows across
      90 dates.
    - Verified with Wrangler local D1 counts and Cloudflare Local Explorer.
- Remote D1 import is NOT done. Remote import requires `--remote`; apply remote
  migrations/import only as a deliberate deployment action.

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
  excess = max(available - baseline, 0); recommend excess_invest_pct ->
  investments, excess_save_pct -> savings. Nothing stored.
- `/settings`: edit baseline, split %, default window.
- Update `Navigation.tsx`: Overview, Spending, Savings, Add Entry, Settings.

## Phase 8 - Tests & verification

- Unit: finance math, CSV parser. Loader/action tests (per `src/tests/`).
  Optional Playwright e2e for the stepped form. Remove Sentry tests.
- Run: typecheck, lint, test. `npm run dev` w/ local D1; `npm run deploy`;
  reconfirm Access gating.

## Prerequisites from Brad

- DONE for Phase 4 local: exported Balances + Constants tabs to CSV under
  `~/Desktop/finances` outside the repo.
- Before remote import: confirm remote migrations are applied and intentionally
  rerun the importer with `--remote`.

## Future work

- Carry-a-balance support: the current model assumes cards are paid in full each
  week (card balance = weekly spend). If a balance is ever carried, spend and
  outstanding balance diverge and would need to be tracked separately.
- Optional finer asset categories (e.g. split HSA out of `investment`) if
  liquidity/retirement views need them - requires a CHECK-constraint migration.
