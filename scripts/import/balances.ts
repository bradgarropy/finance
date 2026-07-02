import type {Account, BalanceInput} from "~/db/queries"

import type {ImportedBalance} from "./payload.ts"

export const groupBalancesByDate = (
    balances: ImportedBalance[],
    accounts: Account[],
) => {
    const accountIdsByName = new Map(
        accounts.map(account => [account.name, account.id]),
    )
    const balancesByDate = new Map<string, BalanceInput[]>()

    for (const balance of balances) {
        const accountId = accountIdsByName.get(balance.accountName)

        if (!accountId) {
            throw new Error(`Missing account id for ${balance.accountName}.`)
        }

        const entries = balancesByDate.get(balance.date) ?? []

        entries.push({
            accountId,
            amountCents: balance.amountCents,
        })

        balancesByDate.set(balance.date, entries)
    }

    return balancesByDate
}
