import {Button} from "@base-ui/react/button"
import {Field} from "@base-ui/react/field"
import {Progress} from "@base-ui/react/progress"
import {useState} from "react"

import BalanceInput from "~/components/BalanceInput"
import {getDatabase} from "~/db/client"
import {getAccounts, getLatestBalances} from "~/db/queries"
import {formatDate, formatDateInput, formatMoney} from "~/utils/format"

import type {Route} from "./+types/capture"

const formatBalance = (value: number | null) => {
    return value === null ? "-" : formatMoney(Math.round(value * 100))
}

export const loader = async ({context}: Route.LoaderArgs) => {
    const database = getDatabase(context.cloudflare.env)

    const [accounts, latestBalances] = await Promise.all([
        getAccounts(database),
        getLatestBalances(database),
    ])

    const latestBalancesByAccountId = new Map(
        latestBalances.map(balance => [balance.accountId, balance.amountCents]),
    )

    return {
        accounts: accounts
            .filter(account => !account.archived)
            .map(account => ({
                category: account.category,
                defaultAmountCents:
                    account.name === "Emergency" || account.name === "Mortgage"
                        ? (latestBalancesByAccountId.get(account.id) ?? null)
                        : null,
                id: account.id,
                name: account.name,
                type: account.type,
            })),
    }
}

const Route = ({loaderData}: Route.ComponentProps) => {
    const {accounts} = loaderData
    const [date, setDate] = useState(() => formatDateInput(new Date()))
    const [step, setStep] = useState(0)
    const [balances, setBalances] = useState<Record<number, number | null>>(
        () =>
            Object.fromEntries(
                accounts.map(account => [
                    account.id,
                    account.defaultAmountCents === null
                        ? null
                        : account.defaultAmountCents / 100,
                ]),
            ),
    )
    const totalSteps = accounts.length + 1
    const isReviewStep = step > accounts.length
    const currentAccount =
        step === 0 || isReviewStep ? null : accounts[step - 1]
    const isLastAccount = step === accounts.length
    const isCurrentBalanceMissing =
        currentAccount !== null && balances[currentAccount.id] === null
    const hasMissingBalances = accounts.some(
        account => balances[account.id] === null,
    )
    const progressValue = isReviewStep ? totalSteps : step + 1
    const accountGroups = [
        {
            accounts: accounts.filter(account => account.type === "asset"),
            label: "Assets",
        },
        {
            accounts: accounts.filter(account => account.type === "liability"),
            label: "Liabilities",
        },
    ]

    const handleBegin = () => {
        setStep(1)
    }

    const handleNext = () => {
        setStep(currentStep => currentStep + 1)
    }

    const handleBack = () => {
        setStep(currentStep => Math.max(0, currentStep - 1))
    }

    return (
        <>
            <title>💵 finance | capture</title>

            <main className="mx-auto flex w-full max-w-xl flex-col gap-10 py-8 sm:py-16">
                <Progress.Root
                    className="flex items-center gap-3"
                    max={totalSteps}
                    value={progressValue}
                    getAriaValueText={(_, value) =>
                        `Step ${value ?? 0} of ${totalSteps}`
                    }
                >
                    <Progress.Label className="text-sm font-medium text-neutral-600">
                        {step === 0
                            ? "Date"
                            : isReviewStep
                              ? "Review"
                              : "Account"}
                    </Progress.Label>

                    <Progress.Track className="h-1 flex-1 overflow-hidden rounded-full bg-neutral-200">
                        <Progress.Indicator className="rounded-full bg-black transition-[width]" />
                    </Progress.Track>

                    <Progress.Value className="text-sm tabular-nums text-neutral-500">
                        {(_, value) => `${value} of ${totalSteps}`}
                    </Progress.Value>
                </Progress.Root>

                {step === 0 ? (
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

                        <div className="space-y-8">
                            <Field.Root className="space-y-2" name="date">
                                <Field.Label className="block text-right text-sm font-medium">
                                    Balance date
                                </Field.Label>

                                <Field.Control
                                    required
                                    type="date"
                                    value={date}
                                    onChange={event =>
                                        setDate(event.target.value)
                                    }
                                    className="h-14 w-full rounded-md border border-neutral-300 bg-white px-4 text-right text-lg tabular-nums shadow-sm outline-none transition focus:border-black focus:ring-2 focus:ring-black/10 [&::-webkit-date-and-time-value]:text-right [&::-webkit-datetime-edit]:text-right"
                                />

                                <Field.Error
                                    className="text-sm text-red-600"
                                    match="valueMissing"
                                >
                                    Choose a balance date.
                                </Field.Error>
                            </Field.Root>

                            <Button
                                disabled={accounts.length === 0}
                                type="button"
                                onClick={handleBegin}
                                className="flex h-12 w-full items-center justify-center rounded-md bg-black px-5 text-sm font-medium text-white transition hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:cursor-not-allowed disabled:bg-neutral-300"
                            >
                                Begin capture
                            </Button>
                        </div>
                    </>
                ) : null}

                {currentAccount ? (
                    <div className="space-y-8">
                        <BalanceInput
                            account={currentAccount}
                            value={balances[currentAccount.id]}
                            onValueChange={value =>
                                setBalances(currentBalances => ({
                                    ...currentBalances,
                                    [currentAccount.id]: value,
                                }))
                            }
                        />

                        <div className="grid grid-cols-2 gap-3">
                            <Button
                                type="button"
                                onClick={handleBack}
                                className="flex h-12 items-center justify-center rounded-md border border-neutral-300 bg-white px-5 text-sm font-medium text-black transition hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                            >
                                Back
                            </Button>

                            <Button
                                disabled={isCurrentBalanceMissing}
                                type="button"
                                onClick={handleNext}
                                className="flex h-12 items-center justify-center rounded-md bg-black px-5 text-sm font-medium text-white transition hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-500"
                            >
                                {isLastAccount
                                    ? "Review balances"
                                    : "Next account"}
                            </Button>
                        </div>
                    </div>
                ) : null}

                {isReviewStep ? (
                    <>
                        <div className="space-y-3">
                            <h1 className="text-3xl font-bold">
                                Review balances
                            </h1>

                            <p className="text-base text-neutral-600">
                                Snapshot for {formatDate(date)}
                            </p>
                        </div>

                        <div className="space-y-12">
                            {accountGroups.map(group => (
                                <section
                                    key={group.label}
                                    className="space-y-3"
                                >
                                    <h2 className="text-sm font-semibold uppercase text-neutral-500">
                                        {group.label}
                                    </h2>

                                    <div className="divide-y divide-neutral-200 border-t border-neutral-200">
                                        {group.accounts.map(account => (
                                            <div
                                                key={account.id}
                                                className="flex items-center justify-between gap-6 py-4"
                                            >
                                                <span className="font-medium">
                                                    {account.name}
                                                </span>

                                                <span className="tabular-nums">
                                                    {formatBalance(
                                                        balances[account.id],
                                                    )}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            ))}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <Button
                                type="button"
                                onClick={handleBack}
                                className="flex h-12 items-center justify-center rounded-md border border-neutral-300 bg-white px-5 text-sm font-medium text-black transition hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                            >
                                Back
                            </Button>

                            <Button
                                disabled={hasMissingBalances}
                                type="button"
                                className="flex h-12 items-center justify-center rounded-md bg-black px-5 text-sm font-medium text-white transition hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-500"
                            >
                                Save snapshot
                            </Button>
                        </div>
                    </>
                ) : null}
            </main>
        </>
    )
}

export default Route
