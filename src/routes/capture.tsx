import {Button} from "@base-ui/react/button"
import {Field} from "@base-ui/react/field"
import {NumberField} from "@base-ui/react/number-field"
import {Progress} from "@base-ui/react/progress"
import type {SubmitEvent} from "react"
import {useState} from "react"

import {getDatabase} from "~/db/client"
import {getAccounts, getLatestBalances} from "~/db/queries"
import {formatDateInput} from "~/utils/format"

import type {Route} from "./+types/capture"

export const loader = async ({context}: Route.LoaderArgs) => {
    const database = getDatabase(context.cloudflare.env)

    const [accounts, latestBalances] = await Promise.all([
        getAccounts(database),
        getLatestBalances(database),
    ])

    const latestBalancesByAccountId = new Map(
        latestBalances.map(balance => [balance.accountId, balance.amountCents]),
    )

    const data = {
        accounts: accounts
            .filter(account => !account.archived)
            .map(account => ({
                category: account.category,
                id: account.id,
                name: account.name,
                previousAmountCents:
                    latestBalancesByAccountId.get(account.id) ?? null,
                type: account.type,
            })),
        latestDate: latestBalances[0]?.date ?? null,
    }

    return data
}

const Route = ({loaderData}: Route.ComponentProps) => {
    const {accounts} = loaderData
    const [date, setDate] = useState(() => formatDateInput(new Date()))
    const [isCapturing, setIsCapturing] = useState(false)
    const firstAccount = accounts[0]

    const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
        event.preventDefault()
        setIsCapturing(true)
    }

    return (
        <>
            <title>💵 finance | capture</title>

            <main className="mx-auto flex w-full max-w-xl flex-col gap-10 py-8 sm:py-16">
                <Progress.Root
                    className="flex items-center gap-3"
                    max={10}
                    value={isCapturing ? 2 : 1}
                    getAriaValueText={(_, value) => `Step ${value ?? 0} of 10`}
                >
                    <Progress.Label className="text-sm font-medium text-neutral-600">
                        {isCapturing ? "Account" : "Date"}
                    </Progress.Label>

                    <Progress.Track className="h-1 flex-1 overflow-hidden rounded-full bg-neutral-200">
                        <Progress.Indicator className="rounded-full bg-black transition-[width]" />
                    </Progress.Track>

                    <Progress.Value className="text-sm tabular-nums text-neutral-500">
                        {(_, value) => `${value} of 10`}
                    </Progress.Value>
                </Progress.Root>

                {!isCapturing ? (
                    <>
                        <div className="space-y-3">
                            <h1 className="text-3xl font-bold">
                                When are these balances from?
                            </h1>

                            <p className="max-w-md text-base leading-7 text-neutral-600">
                                Choose the date that best represents this
                                financial snapshot.
                            </p>
                        </div>

                        <form className="space-y-8" onSubmit={handleSubmit}>
                            <Field.Root className="space-y-2" name="date">
                                <Field.Label className="block text-sm font-medium">
                                    Balance date
                                </Field.Label>

                                <Field.Control
                                    required
                                    type="date"
                                    value={date}
                                    onChange={event =>
                                        setDate(event.target.value)
                                    }
                                    className="h-14 w-full rounded-md border border-neutral-300 bg-white px-4 text-lg tabular-nums shadow-sm outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
                                />

                                <Field.Error
                                    className="text-sm text-red-600"
                                    match="valueMissing"
                                >
                                    Choose a balance date.
                                </Field.Error>
                            </Field.Root>

                            <Button
                                disabled={!firstAccount}
                                type="submit"
                                className="flex h-12 w-full items-center justify-center rounded-md bg-black px-5 text-sm font-medium text-white transition hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:cursor-not-allowed disabled:bg-neutral-300"
                            >
                                Begin capture
                            </Button>
                        </form>
                    </>
                ) : null}

                {isCapturing && firstAccount ? (
                    <>
                        <div className="space-y-3">
                            <p className="text-sm font-medium capitalize text-neutral-500">
                                {firstAccount.category} · {firstAccount.type}
                            </p>

                            <p className="text-xl font-semibold">
                                {firstAccount.name}
                            </p>

                            <h1 className="text-3xl font-bold">
                                What is the current balance?
                            </h1>
                        </div>

                        <Field.Root name={`account-${firstAccount.id}`}>
                            <NumberField.Root
                                required
                                className="space-y-2"
                                defaultValue={
                                    firstAccount.previousAmountCents === null
                                        ? undefined
                                        : firstAccount.previousAmountCents / 100
                                }
                                format={{
                                    currency: "USD",
                                    maximumFractionDigits: 2,
                                    minimumFractionDigits: 2,
                                    style: "currency",
                                }}
                                min={0}
                                step={0.01}
                            >
                                <Field.Label className="block text-sm font-medium">
                                    Current balance
                                </Field.Label>

                                <NumberField.Group>
                                    <NumberField.Input className="h-14 w-full rounded-md border border-neutral-300 bg-white px-4 text-right text-lg tabular-nums shadow-sm outline-none transition focus:border-black focus:ring-2 focus:ring-black/10" />
                                </NumberField.Group>
                            </NumberField.Root>
                        </Field.Root>

                        <Button
                            type="button"
                            onClick={() => setIsCapturing(false)}
                            className="flex h-12 w-full items-center justify-center rounded-md border border-neutral-300 bg-white px-5 text-sm font-medium text-black transition hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                        >
                            Back
                        </Button>
                    </>
                ) : null}
            </main>
        </>
    )
}

export default Route
