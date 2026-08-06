# Wealth App Plan

Last updated: August 5, 2026

## Product goal

Replace the manual Numbers workflow with a private web app at
`finance.bradgarropy.com`. The app should make the weekly finance routine feel
guided while preserving enough history and drill-down detail to verify the
numbers when needed.

The core weekly workflow is:

1. Capture a point-in-time balance for every active account.
2. Confirm the complete snapshot.
3. Pay the outstanding credit card balances.
4. Move excess checking cash into investments and savings.
5. Review the resulting financial snapshot.

## Product decisions

### Security and deployment

- Cloudflare Access is the only authentication layer. Access is restricted at
  the edge to `bradgarropy@gmail.com` and `gabrielagarropy@gmail.com`.
- `workers_dev` remains disabled. Do not add another route or domain without an
  equivalent Access policy.
- If an ungated route is ever introduced, restore in-Worker Access JWT
  validation so requests fail closed.
- The app deploys as a Cloudflare Worker at `finance.bradgarropy.com`.
- Production deploys run remote D1 migrations first through `npm run deploy`,
  then run `wrangler deploy`. The Cloudflare Dashboard uses this script as its
  deploy command.

### Data and calculations

- Cloudflare D1 is the database, exposed through the `DB` binding.
- Drizzle ORM provides typed database access. Drizzle Kit generates migrations,
  and Wrangler applies them.
- Money is stored as nonnegative integer cents.
- Account balances are stored as positive magnitudes. Financial sign is derived
  from `account.type`.
- Accounts are dynamic and have both a `type` (`asset` or `liability`) and a
  category (`cash`, `savings`, `investment`, `retirement`, `mortgage`, or
  `credit`).
- Weekly captures use the pre-payoff convention: checking still contains the
  money that will pay the credit cards, and the card balances are still owed.
- Net worth is `assets - liabilities`; credit card balances are included as
  liabilities.
- Weekly spending is the sum of balances for accounts in the `credit` category.
- Available checking after card payments is `checking - credit balances`.
- Excess cash is `max(available checking - checking baseline, 0)` and is split
  according to the configured investment and savings percentages.
- Snapshot totals, changes, spending, and savings recommendations are derived at
  runtime. They are not stored in separate tables.
- A capture is represented by balance rows sharing a date. There is no separate
  `captures` table.

### User interface

- The UI uses shadcn/ui with its Base UI implementation and Tailwind CSS.
- Recharts powers charts through the local shadcn chart components.
- Zod validates route actions and submitted form data.
- `Intl` handles money, percentage, and display-date formatting. `date-fns` is
  used where date parsing or transformation is needed.
- The primary navigation is Overview, Accounts, Capture, and Settings.
- Charts and additional detail should support the workflow rather than recreate
  the spreadsheet wholesale.

### Financial data safety

- Real Numbers and CSV files stay outside the public repository.
- `*.numbers` and `*.csv` are ignored by Git.
- Local D1 is the default for scripts that can write data. Remote access always
  requires an explicit `--remote` flag.
- Applying remote migrations, importing real data, and deploying are deliberate
  production actions.

## Data model

### Accounts

`accounts` stores:

- Unique name
- Type and category with database-level checks
- Sort order
- Archived status

The imported starting accounts are Checking, Savings, Emergency, Investment,
HSA, 401k, Mortgage, NFCU, and Apple. Accounts can be added later; this list is
not hard-coded into the application model.

Archived accounts remain available in history but are excluded from future
captures. An account can only be permanently deleted when it has no balance
history.

### Balances

`balances` stores one nonnegative amount per account and date. The unique
`(accountId, date)` constraint makes capture writes idempotent: repeating a
capture date updates existing rows instead of creating duplicates.

### Settings

`settings` is a database-constrained singleton row containing:

- Checking baseline
- Emergency baseline
- Excess investment percentage
- Excess savings percentage
- Default graph window (`4`, `12`, `26`, or `52` weeks)

The savings percentages must each be between 0 and 100 and must sum to 100.
The emergency baseline is currently stored and editable but is not part of the
excess-checking calculation.

## Completed features

### Platform foundation

- Cloudflare Access protects the production domain and allows Brad and Gabriela
  through their configured email addresses.
- D1, Drizzle schema, generated migrations, and typed query helpers are in
  place.
- `getDatabase(env)` creates the typed Drizzle D1 client.
- Query helpers cover account CRUD and archiving, account and capture history,
  settings, and account/balance upserts.
- Sentry remains integrated for client, server, and Worker error reporting.

### Branding and navigation

- The user-facing product is named Wealth and uses the segmented signal mark,
  Geist wordmark, and canonical red and green brand colors.
- The responsive header provides Overview, Accounts, Capture, and Settings
  navigation across desktop and mobile.
- Repository information and the "Built by BG" credit live in Settings instead
  of a persistent footer.
- The GitHub repository is `bradgarropy/wealth`. The existing `finance` Worker,
  D1 database, and production domain remain unchanged until a separate
  infrastructure cutover is approved.

### Data import, export, and seed

- `scripts/import.ts` accepts a Numbers file, asks Numbers on macOS to export
  temporary CSV data, imports it, validates the resulting D1 data against the
  workbook, and deletes the temporary files.
- The importer validates Overview assets/liabilities/net worth, Spending card
  totals, and Saving totals and splits.
- Importing is idempotent for accounts, settings, and balances.
- The spreadsheet and app now use the same pre-payoff balance convention, so no
  checking-balance transformation is required.
- `scripts/export.ts` writes `Balances.csv`, `Accounts.csv`, and `Settings.csv`
  outside the repository. The export records its format version and pre-payoff
  convention.
- The export format is intended for portable backups, but the current importer
  remains tailored to the legacy Numbers workbook during the transition period.
- `scripts/seed.ts` seeds local default settings when they do not exist.

### Account management

- `/accounts` lists active and archived accounts.
- Accounts can be created, edited, archived, unarchived, and conditionally
  deleted.
- Account type badges distinguish assets and liabilities.
- `/account/:accountId` shows account metadata and a sortable balance-history
  table.
- Account summaries include an asset- or liability-colored balance chart above
  the table with `4W`, `12W`, `26W`, `52W`, and `All` ranges. The configured
  default window controls the chart's initial range.
- Balance-history dates link to their matching capture summaries.

### Weekly capture workflow

- `/capture` loads active accounts and guides the user through date, account
  balances, confirmation, card payoff, savings transfers, and completion.
- The date defaults to today.
- Every active account requires a nonnegative balance; zero is valid.
- Emergency and Mortgage carry forward their latest balance. Other accounts
  start blank.
- Archived accounts are excluded from capture.
- The confirmation step groups entries into assets and liabilities before the
  snapshot is written.
- Balance writes are validated with Zod and upserted by account and date.
- The card-payoff step presents credit balances as checkboxes. Zero balances
  begin checked.
- The savings step shows the recommended Checking-to-Investment and
  Checking-to-Savings transfers as checkboxes.
- Payoff and transfer checkbox state is intentionally visual only and is not
  persisted.
- Completion links to `/capture/:date`.

### Capture summaries

- `/capture/:date` shows assets, liabilities, net worth, spending, and the
  recommended savings split for that capture.
- Previous and next controls move through capture dates.
- Account names link to their account summaries.
- Archived accounts remain visible in historical captures when they have a
  recorded balance. Zero-value credit balances are omitted from the Spent list.

### Overview

- `/` shows the latest Assets, Liabilities, and Net worth totals.
- Headline deltas compare the latest capture with the previous capture and show
  signed dollar and percentage changes.
- The financial-history chart shows Assets, Liabilities, and Net worth.
- Graph controls support `4W`, `12W`, `26W`, `52W`, and `All`. The configured
  default window controls the chart's initial range only.
- The latest account snapshot is split into assets and liabilities and links to
  each account summary.
- The latest capture date links to its capture summary.
- The shared shell, headline metrics, chart, and account snapshot have responsive
  mobile layouts without horizontal overflow.

### Settings

- `/settings` edits checking and emergency baselines, the excess-cash split, and
  the default graph window.
- Inputs use the same money and number treatments as the capture flow.
- The action validates settings with Zod before writing them to D1.

### Quality and verification

- Components outside `src/components/ui` have focused test files.
- Route loaders and actions, finance helpers, formatters, and primary workflows
  have unit or integration coverage.
- Playwright covers the core deployed-page navigation smoke tests.
- Local D1 migrations, import idempotency, and capture round trips have been
  manually verified.
- The project targets Node 24 through `.nvmrc`.

## Current user-facing routes

- `/` - Overview dashboard
- `/accounts` - Account management
- `/account/:accountId` - Account balance history
- `/capture` - Guided weekly capture
- `/capture/:date` - Capture summary
- `/settings` - Application settings

## Operations

### Local development

```sh
npm run db:migrate
npm run db:seed
npm run dev
```

### Import a Numbers workbook

Local D1 is the default:

```sh
npx tsx scripts/import.ts /path/to/finances.numbers
```

Remote D1 requires explicit intent:

```sh
npx tsx scripts/import.ts /path/to/finances.numbers --remote
```

### Export a portable backup

Local D1 is the default:

```sh
npx tsx scripts/export.ts /path/to/output-directory
```

Remote D1 requires explicit intent:

```sh
npx tsx scripts/export.ts /path/to/output-directory --remote
```

### Database migrations and deployment

```sh
npm run db:migrate
npm run db:migrate:prod
npm run deploy
```

`npm run deploy` is the production path and already runs
`npm run db:migrate:prod` before `wrangler deploy`.

### Verification

```sh
npm run typecheck
npm run lint
npm run format
npm run test
npm run test:e2e
```

## Remaining work

### Product work

- Explore click-to-copy behavior for displayed balances. It should be available
  wherever copying a value is useful, provide accessible success feedback, and
  avoid making ordinary account links or table interactions noisy.
- Decide whether to build a dedicated Spending view. It is deliberately
  deferred and should not be implemented as the automatic next feature.
- Add growth-rate calculations and presentation only when they provide more
  value than the current prior-capture deltas and historical chart.
- Do a later visualization pass for any additional dashboard visualizations.
- Decide whether the emergency baseline should affect recommendations or remain
  reference-only.
- After the spreadsheet-to-app migration is complete, repurpose or replace the
  one-time Numbers importer so it consumes the versioned `Balances.csv`,
  `Accounts.csv`, and `Settings.csv` export bundle. At that point, export and
  import should form a tested round trip suitable for offsite backup and
  disaster recovery.

### Production cutover and operations

- Confirm whether the historical workbook has been imported into remote D1.
  Until that is explicitly confirmed, treat remote historical import as
  pending.
- Before the final spreadsheet-to-app cutover, export a remote backup and verify
  representative capture totals against the workbook one last time.
- Reconfirm Cloudflare Access after routing, domain, or deployment changes.
- Periodically test that `npm run deploy` applies pending migrations before
  deploying the Worker.

### Test coverage

- Expand Playwright coverage beyond navigation smoke tests once the primary
  workflows stabilize.
- Cover the complete weekly capture journey, same-date upserts, account
  management, settings updates, capture/account drill-down navigation, and the
  responsive Overview experience.
- Keep E2E data deterministic through local D1 migration and seed setup.

### Housekeeping

- Remove the starter `/api/hello` route and test when they are no longer useful.
- Keep `plan.md` aligned with shipped behavior after meaningful feature merges.

## Future considerations

- Carry-a-balance support. The current spending model assumes credit cards are
  paid in full every capture; carried balances would require separating weekly
  spending from outstanding card balances.
- Finer account categories, such as a dedicated HSA category. Changing category
  values requires a database CHECK-constraint migration.
- Persisted capture workflow progress. This is intentionally omitted today; add
  it only if interrupted multi-session captures become a real problem.
- Plaid integration for automatic balance synchronization and weekly capture
  creation. This would require secure token handling, account matching,
  reconciliation rules, and clear handling for unsupported or stale accounts.
  Manual capture should remain available as a fallback.
