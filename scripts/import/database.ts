import {getPlatformProxy} from "wrangler"

import {db} from "~/db/client"
import {
    getAccounts,
    setSettings,
    upsertAccounts,
    upsertBalances,
} from "~/db/queries"

import {groupBalancesByDate} from "./balances.ts"
import type {ImportPayload} from "./payload.ts"

export type ImportResult = {
    accounts: number
    balanceRows: number
    dates: number
    settings: number
}

type WriteImportOptions = {
    remote: boolean
}

export const writeImport = async (
    payload: ImportPayload,
    options: WriteImportOptions,
): Promise<ImportResult> => {
    const platform = await getPlatformProxy<Env>({
        remoteBindings: options.remote,
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
