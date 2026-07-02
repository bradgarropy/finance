import {sql} from "drizzle-orm"
import {
    check,
    index,
    integer,
    sqliteTable,
    text,
    uniqueIndex,
} from "drizzle-orm/sqlite-core"

export const accountTypes = ["asset", "liability"] as const

export const accountCategories = [
    "cash",
    "savings",
    "investment",
    "retirement",
    "mortgage",
    "credit",
] as const

export const accounts = sqliteTable(
    "accounts",
    {
        id: integer("id").primaryKey({autoIncrement: true}),
        name: text("name").notNull().unique(),
        type: text("type", {enum: accountTypes}).notNull(),
        category: text("category", {enum: accountCategories}).notNull(),
        sortOrder: integer("sort_order").notNull(),
        archived: integer("archived", {mode: "boolean"})
            .notNull()
            .default(false),
    },
    table => [
        check(
            "accounts_type_check",
            sql`${table.type} in ('asset', 'liability')`,
        ),
        check(
            "accounts_category_check",
            sql`${table.category} in ('cash', 'savings', 'investment', 'retirement', 'mortgage', 'credit')`,
        ),
    ],
)

export const balances = sqliteTable(
    "balances",
    {
        id: integer("id").primaryKey({autoIncrement: true}),
        accountId: integer("account_id")
            .notNull()
            .references(() => accounts.id),
        date: text("date").notNull(),
        amountCents: integer("amount_cents").notNull(),
    },
    table => [
        index("balances_date_idx").on(table.date),
        uniqueIndex("balances_account_id_date_unique").on(
            table.accountId,
            table.date,
        ),
        check("balances_amount_cents_check", sql`${table.amountCents} >= 0`),
    ],
)

export const defaultWindows = [4, 12, 26, 52] as const

export const settings = sqliteTable(
    "settings",
    {
        id: integer("id").primaryKey(),
        checkingBaselineCents: integer("checking_baseline_cents").notNull(),
        emergencyBaselineCents: integer("emergency_baseline_cents").notNull(),
        excessInvestPct: integer("excess_invest_pct").notNull(),
        excessSavePct: integer("excess_save_pct").notNull(),
        defaultWindow: integer("default_window").notNull(),
    },
    table => [
        check("settings_id_check", sql`${table.id} = 1`),
        check(
            "settings_checking_baseline_cents_check",
            sql`${table.checkingBaselineCents} >= 0`,
        ),
        check(
            "settings_emergency_baseline_cents_check",
            sql`${table.emergencyBaselineCents} >= 0`,
        ),
        check(
            "settings_excess_invest_pct_check",
            sql`${table.excessInvestPct} between 0 and 100`,
        ),
        check(
            "settings_excess_save_pct_check",
            sql`${table.excessSavePct} between 0 and 100`,
        ),
        check(
            "settings_excess_split_check",
            sql`${table.excessInvestPct} + ${table.excessSavePct} = 100`,
        ),
        check(
            "settings_default_window_check",
            sql`${table.defaultWindow} in (4, 12, 26, 52)`,
        ),
    ],
)
