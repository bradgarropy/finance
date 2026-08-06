import {useEffect, useRef} from "react"
import {useFetcher} from "react-router"

import {Button} from "~/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "~/components/ui/dialog"
import {Field, FieldError, FieldGroup, FieldLabel} from "~/components/ui/field"
import {Input} from "~/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "~/components/ui/select"
import type {Account} from "~/db/queries"
import {accountCategories, accountTypes} from "~/db/schema"

type AccountDialogProps = {
    account: Account | null
    onOpenChange: (open: boolean) => void
    open: boolean
}

type ActionData = {
    error?: string
    ok?: boolean
}

const AccountDialog = ({account, onOpenChange, open}: AccountDialogProps) => {
    const fetcher = useFetcher<ActionData>()
    const wasSubmitting = useRef(false)
    const isSaving = fetcher.state !== "idle"

    useEffect(() => {
        if (isSaving) {
            wasSubmitting.current = true
            return
        }

        if (wasSubmitting.current && fetcher.data?.ok) {
            wasSubmitting.current = false
            onOpenChange(false)
        }
    }, [fetcher.data, isSaving, onOpenChange])

    const intent = account ? "update" : "create"

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <fetcher.Form method="post" className="contents">
                    <input name="intent" type="hidden" value={intent} />
                    {account ? (
                        <input name="id" type="hidden" value={account.id} />
                    ) : null}

                    <DialogHeader>
                        <DialogTitle>
                            {account ? "Edit account" : "New account"}
                        </DialogTitle>
                        <DialogDescription>
                            {account
                                ? "Update how this account appears in wealth."
                                : "Add an account to future balance captures."}
                        </DialogDescription>
                    </DialogHeader>

                    <FieldGroup>
                        <Field>
                            <FieldLabel htmlFor="account-name">Name</FieldLabel>
                            <Input
                                defaultValue={account?.name}
                                id="account-name"
                                maxLength={100}
                                name="name"
                                required
                            />
                        </Field>

                        <Field>
                            <FieldLabel htmlFor="account-type">Type</FieldLabel>
                            <Select
                                defaultValue={account?.type ?? "asset"}
                                name="type"
                            >
                                <SelectTrigger
                                    className="w-full capitalize"
                                    id="account-type"
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent alignItemWithTrigger={false}>
                                    {accountTypes.map(type => (
                                        <SelectItem
                                            key={type}
                                            value={type}
                                            className="capitalize"
                                        >
                                            {type}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>

                        <Field>
                            <FieldLabel htmlFor="account-category">
                                Category
                            </FieldLabel>
                            <Select
                                defaultValue={account?.category ?? "cash"}
                                name="category"
                            >
                                <SelectTrigger
                                    className="w-full capitalize"
                                    id="account-category"
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent
                                    alignItemWithTrigger={false}
                                    side="top"
                                >
                                    {accountCategories.map(category => (
                                        <SelectItem
                                            key={category}
                                            value={category}
                                            className="capitalize"
                                        >
                                            {category}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>

                        {fetcher.data?.error ? (
                            <FieldError>{fetcher.data.error}</FieldError>
                        ) : null}
                    </FieldGroup>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button disabled={isSaving} type="submit">
                            {isSaving ? "Saving..." : "Save account"}
                        </Button>
                    </DialogFooter>
                </fetcher.Form>
            </DialogContent>
        </Dialog>
    )
}

export {AccountDialog}
