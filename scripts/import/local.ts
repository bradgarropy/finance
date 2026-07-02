import {getPlatformProxy} from "wrangler"

import {db} from "~/db/client"
import {
    getAccounts,
    setSettings,
    upsertAccounts,
    upsertBalances,
} from "~/db/queries"

import type {ImportPayload} from "./payload.ts"
import {groupBalancesByDate} from "./write.ts"

export type LocalImportResult = {
    accounts: number
    balanceRows: number
    dates: number
    settings: number
}

export const writeLocalImport = async (
    payload: ImportPayload,
): Promise<LocalImportResult> => {
    const platform = await getPlatformProxy<Env>({
        remoteBindings: false,
    })

    try {
        const database = db(platform.env)

        await upsertAccounts(database, payload.accounts)
        await setSettings(database, payload.settings)

        const accounts = await getAccounts(database)
        const balancesByDate = groupBalancesByDate(payload.balances, accounts)

        for (const [date, balances] of balancesByDate) {
            await upsertBalances(database, date, balances)
        }

        return {
            accounts: payload.accounts.length,
            balanceRows: payload.balances.length,
            dates: balancesByDate.size,
            settings: 1,
        }
    } finally {
        await platform.dispose()
    }
}
