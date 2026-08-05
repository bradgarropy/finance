import {Link} from "react-router"

import {getDatabase} from "~/db/client"
import {getAllBalances} from "~/db/queries"
import {calculateSnapshotSeries} from "~/utils/finance"
import {formatDate, formatMoney} from "~/utils/format"

import type {Route} from "./+types/index"

export const loader = async ({context}: Route.LoaderArgs) => {
    const balances = await getAllBalances(getDatabase(context.cloudflare.env))

    return {snapshots: calculateSnapshotSeries(balances)}
}

const Route = ({loaderData}: Route.ComponentProps) => {
    const latest = loaderData.snapshots.at(-1)

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
                        </div>

                        <div className="border-t py-6 sm:border-t-0 sm:px-6">
                            <p className="text-sm font-medium text-muted-foreground">
                                Liabilities
                            </p>
                            <p className="mt-2 text-3xl font-semibold tabular-nums">
                                {formatMoney(latest.liabilitiesCents)}
                            </p>
                        </div>

                        <div className="border-t py-6 sm:border-t-0 sm:px-6 sm:last:pr-0">
                            <p className="text-sm font-medium text-muted-foreground">
                                Net worth
                            </p>
                            <p className="mt-2 text-3xl font-semibold tabular-nums">
                                {formatMoney(latest.netWorthCents)}
                            </p>
                        </div>
                    </section>
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
