import {asc, eq} from "drizzle-orm"

import type {Database} from "./client"
import {accounts, balances, settings} from "./schema"

export const settingsId = 1

export type Account = typeof accounts.$inferSelect
export type Balance = typeof balances.$inferSelect
export type AppSettings = typeof settings.$inferSelect

export const getAccounts = (database: Database) => {
    return database
        .select()
        .from(accounts)
        .orderBy(asc(accounts.sortOrder), asc(accounts.name))
}

export const getBalancesByDate = (database: Database, date: string) => {
    return database
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

export const getSettings = async (database: Database) => {
    const rows = await database
        .select()
        .from(settings)
        .where(eq(settings.id, settingsId))
        .limit(1)

    return rows[0] ?? null
}
