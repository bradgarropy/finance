import {data, Link} from "react-router"

import {
    type LatestAccountBalance,
    LatestAccountSnapshot,
} from "~/components/LatestAccountSnapshot"
import {NetWorthChart} from "~/components/NetWorthChart"
import {getDatabase} from "~/db/client"
import {getAccounts, getAllBalances, getSettings} from "~/db/queries"
import {
    calculateChange,
    calculateSnapshotSeries,
    type FinanceChange,
} from "~/utils/finance"
import {
    formatDate,
    formatMoney,
    formatMoneyChange,
    formatPercentageChange,
} from "~/utils/format"

import type {Route} from "./+types/index"

type SnapshotDeltaProps = {
    change: FinanceChange | null
    favorableDirection: "increase" | "decrease"
}

const SnapshotDelta = ({change, favorableDirection}: SnapshotDeltaProps) => {
    if (!change) {
        return <p className="mt-2 text-sm text-muted-foreground">-</p>
    }

    const isFavorable =
        change.amountCents === 0
            ? null
            : favorableDirection === "increase"
              ? change.amountCents > 0
              : change.amountCents < 0
    const color =
        isFavorable === null
            ? "text-muted-foreground"
            : isFavorable
              ? "text-emerald-600"
              : "text-rose-600"

    return (
        <p className="mt-2 text-sm tabular-nums">
            <span className={color}>
                {formatMoneyChange(change.amountCents)}
                {change.percentage === null
                    ? null
                    : ` (${formatPercentageChange(change.percentage)})`}
            </span>
        </p>
    )
}

export const loader = async ({context}: Route.LoaderArgs) => {
    const database = getDatabase(context.cloudflare.env)
    const [accounts, balances, settings] = await Promise.all([
        getAccounts(database),
        getAllBalances(database),
        getSettings(database),
    ])

    if (!settings) {
        throw data("Settings are not configured.", {status: 500})
    }
    const snapshots = calculateSnapshotSeries(balances)
    const latestDate = snapshots.at(-1)?.date
    const latestBalancesByAccountId = new Map(
        balances
            .filter(balance => balance.date === latestDate)
            .map(balance => [balance.accountId, balance]),
    )
    const latestBalances: LatestAccountBalance[] = accounts
        .filter(account => !account.archived)
        .map(account => ({
            accountId: account.id,
            accountName: account.name,
            accountType: account.type,
            amountCents:
                latestBalancesByAccountId.get(account.id)?.amountCents ?? null,
        }))

    return {
        defaultWindow: settings.defaultWindow,
        latestBalances,
        snapshots,
    }
}

const Route = ({loaderData}: Route.ComponentProps) => {
    const latest = loaderData.snapshots.at(-1)
    const previous = loaderData.snapshots.at(-2)
    const changes =
        latest && previous
            ? {
                  assets: calculateChange(
                      latest.assetsCents,
                      previous.assetsCents,
                  ),
                  liabilities: calculateChange(
                      latest.liabilitiesCents,
                      previous.liabilitiesCents,
                  ),
                  netWorth: calculateChange(
                      latest.netWorthCents,
                      previous.netWorthCents,
                  ),
              }
            : null

    return (
        <>
            <title>💵 finance | overview</title>

            <main className="mx-auto w-full max-w-5xl py-8 sm:py-16">
                <div className="mb-10 space-y-2">
                    <h1 className="text-3xl font-bold">Overview</h1>
                    <p className="text-muted-foreground">
                        {latest ? (
                            <>
                                Latest capture:{" "}
                                <Link
                                    className="font-medium text-foreground underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
                                    to={`/capture/${latest.date}`}
                                >
                                    {formatDate(latest.date)}
                                </Link>
                            </>
                        ) : (
                            "Your latest financial snapshot."
                        )}
                    </p>
                </div>

                {latest ? (
                    <>
                        <section
                            aria-label="Latest financial snapshot"
                            className="grid border-y sm:grid-cols-3 sm:divide-x"
                        >
                            <div className="py-6 sm:px-6 sm:first:pl-0">
                                <p className="text-sm font-medium text-muted-foreground">
                                    Assets
                                </p>
                                <p className="mt-2 text-3xl font-semibold tabular-nums">
                                    {formatMoney(latest.assetsCents)}
                                </p>
                                <SnapshotDelta
                                    change={changes?.assets ?? null}
                                    favorableDirection="increase"
                                />
                            </div>

                            <div className="border-t py-6 sm:border-t-0 sm:px-6">
                                <p className="text-sm font-medium text-muted-foreground">
                                    Liabilities
                                </p>
                                <p className="mt-2 text-3xl font-semibold tabular-nums">
                                    {formatMoney(latest.liabilitiesCents)}
                                </p>
                                <SnapshotDelta
                                    change={changes?.liabilities ?? null}
                                    favorableDirection="decrease"
                                />
                            </div>

                            <div className="border-t py-6 sm:border-t-0 sm:px-6 sm:last:pr-0">
                                <p className="text-sm font-medium text-muted-foreground">
                                    Net worth
                                </p>
                                <p className="mt-2 text-3xl font-semibold tabular-nums">
                                    {formatMoney(latest.netWorthCents)}
                                </p>
                                <SnapshotDelta
                                    change={changes?.netWorth ?? null}
                                    favorableDirection="increase"
                                />
                            </div>
                        </section>

                        <section
                            className="mt-14"
                            aria-labelledby="history-heading"
                        >
                            <div className="mb-6 space-y-1">
                                <h2
                                    className="text-xl font-semibold"
                                    id="history-heading"
                                >
                                    Financial history
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    Assets, liabilities, and net worth over
                                    time.
                                </p>
                            </div>

                            <NetWorthChart
                                defaultWindow={loaderData.defaultWindow}
                                snapshots={loaderData.snapshots}
                            />
                        </section>

                        <LatestAccountSnapshot
                            balances={loaderData.latestBalances}
                        />
                    </>
                ) : (
                    <p className="border-y py-8 text-muted-foreground">
                        No balance snapshots yet.
                    </p>
                )}
            </main>
        </>
    )
}

export default Route
