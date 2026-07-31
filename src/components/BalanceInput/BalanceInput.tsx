import {Field as FieldPrimitive} from "@base-ui/react/field"
import {NumberField} from "@base-ui/react/number-field"

import {Badge} from "~/components/ui/badge"
import {Field, FieldError, FieldLabel} from "~/components/ui/field"
import {
    InputGroup,
    InputGroupAddon,
    InputGroupText,
} from "~/components/ui/input-group"
import type {Account} from "~/db/queries"

type BalanceAccount = Pick<Account, "category" | "id" | "name" | "type">

type BalanceInputProps = {
    account: BalanceAccount
    onValueChange: (value: number | null) => void
    value: number | null
}

const BalanceInput = ({account, onValueChange, value}: BalanceInputProps) => {
    const inputId = `account-${account.id}`

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

            <FieldPrimitive.Root name={inputId} render={<Field />}>
                <NumberField.Root
                    required
                    format={{
                        maximumFractionDigits: 2,
                        minimumFractionDigits: 2,
                        style: "decimal",
                    }}
                    min={0}
                    step={0.01}
                    value={value}
                    onValueChange={onValueChange}
                >
                    <FieldPrimitive.Label
                        render={
                            <FieldLabel
                                htmlFor={inputId}
                                className="ml-auto text-right"
                            />
                        }
                    >
                        Current balance
                    </FieldPrimitive.Label>

                    <NumberField.Group render={<InputGroup className="h-14" />}>
                        <NumberField.Input
                            id={inputId}
                            data-slot="input-group-control"
                            className="h-full min-w-0 flex-1 bg-transparent px-4 text-right text-lg tabular-nums outline-none"
                        />

                        <InputGroupAddon>
                            <InputGroupText className="text-lg">
                                $
                            </InputGroupText>
                        </InputGroupAddon>
                    </NumberField.Group>
                </NumberField.Root>

                <FieldPrimitive.Error render={<FieldError />}>
                    Enter a balance.
                </FieldPrimitive.Error>
            </FieldPrimitive.Root>
        </>
    )
}

export default BalanceInput
