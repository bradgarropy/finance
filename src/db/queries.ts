import {asc, desc, eq, sql} from "drizzle-orm"

import type {Database} from "~/db/client"
import {accounts, balances, settings} from "~/db/schema"

export const settingsId = 1

export type Account = typeof accounts.$inferSelect
export type Balance = typeof balances.$inferSelect
export type AppSettings = typeof settings.$inferSelect

export type BalanceEntry = Pick<Balance, "accountId" | "amountCents">
export type SettingsInput = Omit<AppSettings, "id">

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

export const upsertBalances = async (
    db: Database,
    date: string,
    entries: BalanceEntry[],
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
