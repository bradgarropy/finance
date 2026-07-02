import {asc, desc, eq, sql} from "drizzle-orm"

import type {Database} from "~/db/client"
import {accounts, balances, settings} from "~/db/schema"

export const settingsId = 1

type AccountSelect = typeof accounts.$inferSelect
type BalanceSelect = typeof balances.$inferSelect
type SettingsSelect = typeof settings.$inferSelect

type AccountInsert = typeof accounts.$inferInsert
type BalanceInsert = typeof balances.$inferInsert
type SettingsInsert = typeof settings.$inferInsert

export type Account = AccountSelect
export type Balance = BalanceSelect
export type Settings = SettingsSelect

export type AccountInput = Omit<AccountInsert, "id">
export type BalanceInput = Pick<BalanceInsert, "accountId" | "amountCents">
export type SettingsInput = Omit<SettingsInsert, "id">

export const getAccounts = (db: Database) => {
    return db
        .select()
        .from(accounts)
        .orderBy(asc(accounts.sortOrder), asc(accounts.name))
}

export const getBalancesByDate = (db: Database, date: string) => {
    return db
        .select({
            id: balances.id,
            accountId: balances.accountId,
            accountName: accounts.name,
            accountType: accounts.type,
            accountCategory: accounts.category,
            accountSortOrder: accounts.sortOrder,
            date: balances.date,
            amountCents: balances.amountCents,
        })
        .from(balances)
        .innerJoin(accounts, eq(balances.accountId, accounts.id))
        .where(eq(balances.date, date))
        .orderBy(asc(accounts.sortOrder), asc(accounts.name))
}

export const getLatestBalances = async (db: Database) => {
    const rows = await db
        .select({date: balances.date})
        .from(balances)
        .orderBy(desc(balances.date))
        .limit(1)

    const latestDate = rows[0]?.date

    if (!latestDate) {
        return []
    }

    return getBalancesByDate(db, latestDate)
}

export const getAllBalances = (db: Database) => {
    return db
        .select({
            id: balances.id,
            accountId: balances.accountId,
            accountName: accounts.name,
            accountType: accounts.type,
            accountCategory: accounts.category,
            accountSortOrder: accounts.sortOrder,
            date: balances.date,
            amountCents: balances.amountCents,
        })
        .from(balances)
        .innerJoin(accounts, eq(balances.accountId, accounts.id))
        .orderBy(
            asc(balances.date),
            asc(accounts.sortOrder),
            asc(accounts.name),
        )
}

export const getSettings = async (db: Database) => {
    const rows = await db
        .select()
        .from(settings)
        .where(eq(settings.id, settingsId))
        .limit(1)

    return rows[0] ?? null
}

export const upsertAccounts = async (db: Database, entries: AccountInput[]) => {
    if (entries.length === 0) {
        return
    }

    await db
        .insert(accounts)
        .values(entries)
        .onConflictDoUpdate({
            target: accounts.name,
            set: {
                archived: sql`excluded.archived`,
                category: sql`excluded.category`,
                sortOrder: sql`excluded.sort_order`,
                type: sql`excluded.type`,
            },
        })
}

export const upsertBalances = async (
    db: Database,
    date: string,
    entries: BalanceInput[],
) => {
    if (entries.length === 0) {
        return
    }

    const values = entries.map(entry => ({
        accountId: entry.accountId,
        amountCents: entry.amountCents,
        date,
    }))

    await db
        .insert(balances)
        .values(values)
        .onConflictDoUpdate({
            target: [balances.accountId, balances.date],
            set: {amountCents: sql`excluded.amount_cents`},
        })
}

export const setSettings = (db: Database, input: SettingsInput) => {
    const value = {
        ...input,
        id: settingsId,
    }

    return db.insert(settings).values(value).onConflictDoUpdate({
        target: settings.id,
        set: input,
    })
}
