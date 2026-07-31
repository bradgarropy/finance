import {useEffect, useRef} from "react"
import {useFetcher} from "react-router"

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "~/components/ui/alert-dialog"
import type {Account} from "~/db/queries"

type DeleteAccountDialogProps = {
    account: Account | null
    onOpenChange: (open: boolean) => void
    open: boolean
}

type ActionData = {
    error?: string
    ok?: boolean
}

const DeleteAccountDialog = ({
    account,
    onOpenChange,
    open,
}: DeleteAccountDialogProps) => {
    const fetcher = useFetcher<ActionData>()
    const wasSubmitting = useRef(false)
    const isDeleting = fetcher.state !== "idle"

    useEffect(() => {
        if (isDeleting) {
            wasSubmitting.current = true
            return
        }

        if (wasSubmitting.current && fetcher.data?.ok) {
            wasSubmitting.current = false
            onOpenChange(false)
        }
    }, [fetcher.data, isDeleting, onOpenChange])

    const handleDelete = () => {
        if (!account) {
            return
        }

        void fetcher.submit(
            {id: String(account.id), intent: "delete"},
            {method: "post"},
        )
    }

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete {account?.name}?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This permanently removes the account. Accounts with
                        balance history must be archived instead.
                    </AlertDialogDescription>
                </AlertDialogHeader>

                {fetcher.data?.error ? (
                    <p role="alert" className="text-sm text-destructive">
                        {fetcher.data.error}
                    </p>
                ) : null}

                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>
                        Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                        disabled={isDeleting}
                        variant="destructive"
                        onClick={handleDelete}
                    >
                        {isDeleting ? "Deleting..." : "Delete account"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}

export {DeleteAccountDialog}
