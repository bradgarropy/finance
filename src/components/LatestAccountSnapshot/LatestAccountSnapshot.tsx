import {Link} from "react-router"

import type {Account, Balance} from "~/db/queries"
import {formatMoneyParts} from "~/utils/format"

export type LatestAccountBalance = Pick<Balance, "accountId"> & {
    accountName: Account["name"]
    accountType: Account["type"]
    amountCents: Balance["amountCents"] | null
}

type LatestAccountSnapshotProps = {
    balances: LatestAccountBalance[]
}

const groups = [
    {
        description: "Cash, savings, and investments.",
        label: "Assets",
        type: "asset",
    },
    {
        description: "Credit cards and outstanding loans.",
        label: "Liabilities",
        type: "liability",
    },
] as const

const LatestAccountSnapshot = ({balances}: LatestAccountSnapshotProps) => {
    return (
        <section
            aria-labelledby="latest-accounts-heading"
            className="mt-10 sm:mt-14"
        >
            <div className="mb-6 space-y-1">
                <h2
                    className="text-xl font-semibold"
                    id="latest-accounts-heading"
                >
                    Latest accounts
                </h2>
                <p className="text-sm text-muted-foreground">
                    Account balances from the latest capture.
                </p>
            </div>

            <div className="grid gap-10 sm:grid-cols-2">
                {groups.map(group => {
                    const groupBalances = balances.filter(
                        balance => balance.accountType === group.type,
                    )

                    return (
                        <section key={group.type} aria-label={group.label}>
                            <div className="mb-3 space-y-1">
                                <h3 className="font-semibold">{group.label}</h3>
                                <p className="text-sm text-muted-foreground">
                                    {group.description}
                                </p>
                            </div>

                            <div className="divide-y border-y">
                                {groupBalances.map(balance => {
                                    const money =
                                        balance.amountCents === null
                                            ? null
                                            : formatMoneyParts(
                                                  balance.amountCents,
                                              )

                                    return (
                                        <div
                                            key={balance.accountId}
                                            className="flex items-center justify-between gap-6 py-3"
                                        >
                                            <Link
                                                className="font-medium underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
                                                to={`/account/${balance.accountId}`}
                                            >
                                                {balance.accountName}
                                            </Link>
                                            {money ? (
                                                <span className="inline-grid w-32 grid-cols-[1rem_1fr] tabular-nums">
                                                    <span className="text-left">
                                                        {money.currency}
                                                    </span>
                                                    <span className="text-right">
                                                        {money.amount}
                                                    </span>
                                                </span>
                                            ) : (
                                                <span aria-label="No balance">
                                                    -
                                                </span>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </section>
                    )
                })}
            </div>
        </section>
    )
}

export {LatestAccountSnapshot}
