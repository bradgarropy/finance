import {Field} from "@base-ui/react/field"
import {NumberField} from "@base-ui/react/number-field"

import {Badge} from "~/components/ui/badge"
import type {Account} from "~/db/queries"

type BalanceAccount = Pick<Account, "category" | "id" | "name" | "type">

type BalanceInputProps = {
    account: BalanceAccount
    onValueChange: (value: number | null) => void
    value: number | null
}

const BalanceInput = ({account, onValueChange, value}: BalanceInputProps) => {
    return (
        <>
            <div className="space-y-3">
                <h1 className="text-3xl font-bold">
                    What is the current balance?
                </h1>

                <div className="flex items-center justify-between gap-4">
                    <p className="text-xl font-semibold">{account.name}</p>

                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize">
                            {account.category}
                        </Badge>

                        <Badge variant="outline" className="capitalize">
                            {account.type}
                        </Badge>
                    </div>
                </div>
            </div>

            <Field.Root name={`account-${account.id}`}>
                <NumberField.Root
                    required
                    className="space-y-2"
                    format={{
                        currency: "USD",
                        maximumFractionDigits: 2,
                        minimumFractionDigits: 2,
                        style: "currency",
                    }}
                    min={0}
                    step={0.01}
                    value={value}
                    onValueChange={onValueChange}
                >
                    <Field.Label className="block text-right text-sm font-medium">
                        Current balance
                    </Field.Label>

                    <NumberField.Group>
                        <NumberField.Input className="h-14 w-full rounded-md border border-neutral-300 bg-white px-4 text-right text-lg tabular-nums shadow-sm outline-none transition focus:border-black focus:ring-2 focus:ring-black/10" />
                    </NumberField.Group>
                </NumberField.Root>

                <Field.Error className="text-sm text-red-600">
                    Enter a balance.
                </Field.Error>
            </Field.Root>
        </>
    )
}

export default BalanceInput
