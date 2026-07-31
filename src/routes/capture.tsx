import {Field} from "@base-ui/react/field"
import {format, parseISO} from "date-fns"
import {CalendarIcon} from "lucide-react"
import {useState} from "react"
import {data, Form, redirect, useNavigation} from "react-router"

import BalanceInput from "~/components/BalanceInput"
import {Button} from "~/components/ui/button"
import {Calendar} from "~/components/ui/calendar"
import {Popover, PopoverContent, PopoverTrigger} from "~/components/ui/popover"
import {Progress, ProgressLabel, ProgressValue} from "~/components/ui/progress"
import {getDatabase} from "~/db/client"
import {getAccounts, getLatestBalances, upsertBalances} from "~/db/queries"
import {captureSchema} from "~/schemas/capture"
import {formatDate, formatDateInput, formatMoney} from "~/utils/format"

import type {Route} from "./+types/capture"

const formatBalance = (value: number | null) => {
    return value === null ? "-" : formatMoney(Math.round(value * 100))
}

export const action = async ({context, request}: Route.ActionArgs) => {
    const formData = await request.formData()
    let balances: unknown

    try {
        balances = JSON.parse(String(formData.get("balances")))
    } catch {
        balances = null
    }

    const result = captureSchema.safeParse({
        balances,
        date: formData.get("date"),
    })

    if (!result.success) {
        return data(
            {error: "Check the date and balances, then try again."},
            {status: 400},
        )
    }

    await upsertBalances(
        getDatabase(context.cloudflare.env),
        result.data.date,
        result.data.balances,
    )

    return redirect("/")
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

const Route = ({actionData, loaderData}: Route.ComponentProps) => {
    const {accounts} = loaderData
    const navigation = useNavigation()
    const [date, setDate] = useState(() => formatDateInput(new Date()))
    const [datePickerOpen, setDatePickerOpen] = useState(false)
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
    const balanceEntries = accounts.flatMap(account => {
        const amount = balances[account.id]

        return amount === null
            ? []
            : [{accountId: account.id, amountCents: Math.round(amount * 100)}]
    })
    const isSaving = navigation.state === "submitting"
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
                <Progress
                    className="grid grid-cols-[auto_1fr_auto] items-center gap-3 [&_[data-slot=progress-track]]:col-start-2 [&_[data-slot=progress-track]]:row-start-1"
                    max={totalSteps}
                    value={progressValue}
                    getAriaValueText={(_, value) =>
                        `Step ${value ?? 0} of ${totalSteps}`
                    }
                >
                    <ProgressLabel className="text-muted-foreground">
                        {step === 0
                            ? "Date"
                            : isReviewStep
                              ? "Review"
                              : "Account"}
                    </ProgressLabel>

                    <ProgressValue className="col-start-3 row-start-1 ml-0">
                        {(_, value) => `${value} of ${totalSteps}`}
                    </ProgressValue>
                </Progress>

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
                            <Field.Root
                                className="flex flex-col gap-2"
                                name="date"
                            >
                                <Field.Label
                                    id="balance-date-label"
                                    className="block text-right text-sm font-medium"
                                >
                                    Balance date
                                </Field.Label>

                                <Popover
                                    open={datePickerOpen}
                                    onOpenChange={setDatePickerOpen}
                                >
                                    <PopoverTrigger
                                        render={
                                            <Button
                                                aria-labelledby="balance-date-label"
                                                size="lg"
                                                type="button"
                                                variant="outline"
                                                className="h-14 w-full justify-between px-4 text-right text-lg font-normal tabular-nums"
                                            />
                                        }
                                    >
                                        <CalendarIcon />
                                        <span className="ml-auto">
                                            {formatDate(date)}
                                        </span>
                                    </PopoverTrigger>

                                    <PopoverContent
                                        align="end"
                                        className="w-auto p-0"
                                    >
                                        <Calendar
                                            required
                                            mode="single"
                                            selected={parseISO(date)}
                                            onSelect={selectedDate => {
                                                setDate(
                                                    format(
                                                        selectedDate,
                                                        "yyyy-MM-dd",
                                                    ),
                                                )
                                                setDatePickerOpen(false)
                                            }}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </Field.Root>

                            <Button
                                disabled={accounts.length === 0}
                                size="lg"
                                type="button"
                                onClick={handleBegin}
                                className="h-12 w-full"
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
                                size="lg"
                                type="button"
                                variant="outline"
                                onClick={handleBack}
                                className="h-12"
                            >
                                Back
                            </Button>

                            <Button
                                disabled={isCurrentBalanceMissing}
                                size="lg"
                                type="button"
                                onClick={handleNext}
                                className="h-12"
                            >
                                {isLastAccount
                                    ? "Review balances"
                                    : "Next account"}
                            </Button>
                        </div>
                    </div>
                ) : null}

                {isReviewStep ? (
                    <Form method="post" className="contents">
                        <input name="date" type="hidden" value={date} />
                        <input
                            name="balances"
                            type="hidden"
                            value={JSON.stringify(balanceEntries)}
                        />

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
                                size="lg"
                                type="button"
                                variant="outline"
                                onClick={handleBack}
                                className="h-12"
                            >
                                Back
                            </Button>

                            <Button
                                disabled={hasMissingBalances || isSaving}
                                size="lg"
                                type="submit"
                                className="h-12"
                            >
                                {isSaving ? "Saving..." : "Save snapshot"}
                            </Button>
                        </div>

                        {actionData?.error ? (
                            <p
                                role="alert"
                                className="text-center text-sm text-red-600"
                            >
                                {actionData.error}
                            </p>
                        ) : null}
                    </Form>
                ) : null}
            </main>
        </>
    )
}

export default Route
