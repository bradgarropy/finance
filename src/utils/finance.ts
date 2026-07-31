import type {Account, Balance} from "~/db/queries"

type BalanceSnapshotInput = Pick<Balance, "amountCents" | "date"> & {
    accountType: Account["type"]
}

export type FinanceSnapshot = {
    assetsCents: number
    date: string
    liabilitiesCents: number
    netWorthCents: number
}

export const calculateSnapshot = (
    date: string,
    balances: BalanceSnapshotInput[],
): FinanceSnapshot => {
    const totals = balances.reduce(
        (result, balance) => {
            if (balance.accountType === "asset") {
                result.assetsCents += balance.amountCents
            } else {
                result.liabilitiesCents += balance.amountCents
            }

            return result
        },
        {assetsCents: 0, liabilitiesCents: 0},
    )

    return {
        ...totals,
        date,
        netWorthCents: totals.assetsCents - totals.liabilitiesCents,
    }
}

export const calculateSnapshotSeries = (
    balances: BalanceSnapshotInput[],
): FinanceSnapshot[] => {
    const balancesByDate = Map.groupBy(balances, balance => balance.date)

    return [...balancesByDate.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([date, datedBalances]) => calculateSnapshot(date, datedBalances))
}
