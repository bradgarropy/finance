import {AccountList} from "~/components/AccountList"
import {getDatabase} from "~/db/client"
import {getAccounts} from "~/db/queries"

import type {Route} from "./+types/accounts"

export const loader = async ({context}: Route.LoaderArgs) => {
    return {accounts: await getAccounts(getDatabase(context.cloudflare.env))}
}

const Route = ({loaderData}: Route.ComponentProps) => {
    const activeAccounts = loaderData.accounts.filter(
        account => !account.archived,
    )
    const archivedAccounts = loaderData.accounts.filter(
        account => account.archived,
    )

    return (
        <>
            <title>💵 finance | accounts</title>

            <main className="mx-auto w-full max-w-3xl py-8 sm:py-16">
                <div className="mb-10 space-y-2">
                    <h1 className="text-3xl font-bold">Accounts</h1>
                    <p className="text-muted-foreground">
                        Accounts included in balance captures and financial
                        calculations.
                    </p>
                </div>

                <div className="space-y-12">
                    <AccountList
                        accounts={activeAccounts}
                        emptyMessage="No active accounts."
                        title="Active"
                    />
                    <AccountList
                        accounts={archivedAccounts}
                        emptyMessage="No archived accounts."
                        title="Archived"
                    />
                </div>
            </main>
        </>
    )
}

export default Route
