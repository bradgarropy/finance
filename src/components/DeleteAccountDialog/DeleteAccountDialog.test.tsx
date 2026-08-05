import {render, screen, waitFor} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {createRoutesStub} from "react-router"
import {expect, test, vi} from "vitest"

import {DeleteAccountDialog} from "~/components/DeleteAccountDialog"
import type {Account} from "~/db/queries"

const account: Account = {
    archived: false,
    category: "cash",
    id: 7,
    name: "Checking",
    sortOrder: 10,
    type: "asset",
}

test("submits the account deletion and closes after success", async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    const action = vi.fn(async ({request}: {request: Request}) => {
        const formData = await request.formData()

        expect(Object.fromEntries(formData)).toEqual({
            id: "7",
            intent: "delete",
        })

        return {ok: true}
    })
    const Stub = createRoutesStub([
        {
            action,
            Component: () => (
                <DeleteAccountDialog
                    account={account}
                    open
                    onOpenChange={onOpenChange}
                />
            ),
            path: "/accounts",
        },
    ])

    render(<Stub initialEntries={["/accounts"]} />)

    expect(
        await screen.findByRole("alertdialog", {name: "Delete Checking?"}),
    ).toBeInTheDocument()

    await user.click(screen.getByRole("button", {name: "Delete account"}))

    await waitFor(() => expect(action).toHaveBeenCalledOnce())
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
})
