import {ChevronLeftIcon} from "lucide-react"
import {data, Link} from "react-router"
import {z} from "zod"

import {AccountTypeBadge} from "~/components/AccountTypeBadge"
import {BalanceTable} from "~/components/BalanceTable"
import {Badge} from "~/components/ui/badge"
import {buttonVariants} from "~/components/ui/button"
import {getDatabase} from "~/db/client"
import {getAccount, getBalancesByAccountId} from "~/db/queries"

import type {Route} from "./+types/account-summary"

export const loader = async ({context, params}: Route.LoaderArgs) => {
    const accountIdResult = z.coerce
        .number()
        .int()
        .positive()
        .safeParse(params.accountId)

    if (!accountIdResult.success) {
        throw data("Invalid account id.", {status: 400})
    }

    const db = getDatabase(context.cloudflare.env)
    const [account, balances] = await Promise.all([
        getAccount(db, accountIdResult.data),
        getBalancesByAccountId(db, accountIdResult.data),
    ])

    if (!account) {
        throw data("Account not found.", {status: 404})
    }

    return {account, balances}
}

const Route = ({loaderData}: Route.ComponentProps) => {
    const {account, balances} = loaderData

    return (
        <>
            <title>{`💵 finance | ${account.name}`}</title>

            <main className="mx-auto w-full max-w-3xl py-8 sm:py-16">
                <header className="mb-10 space-y-6">
                    <Link
                        className={buttonVariants({
                            size: "sm",
                            variant: "ghost",
                        })}
                        to="/accounts"
                    >
                        <ChevronLeftIcon />
                        Accounts
                    </Link>

                    <div className="space-y-3">
                        <h1 className="text-3xl font-bold">{account.name}</h1>

                        <div className="flex flex-wrap items-center gap-2">
                            <AccountTypeBadge type={account.type} />
                            <Badge variant="outline" className="capitalize">
                                {account.category}
                            </Badge>
                            {account.archived ? (
                                <Badge variant="secondary">Archived</Badge>
                            ) : null}
                        </div>
                    </div>
                </header>

                <section aria-labelledby="balance-history-heading">
                    <div className="mb-3 space-y-1">
                        <h2
                            id="balance-history-heading"
                            className="text-xl font-semibold"
                        >
                            Balance history
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Recorded balances for this account.
                        </p>
                    </div>

                    {balances.length > 0 ? (
                        <BalanceTable balances={balances} />
                    ) : (
                        <p className="border-t py-6 text-sm text-muted-foreground">
                            No balance history.
                        </p>
                    )}
                </section>
            </main>
        </>
    )
}

export default Route
