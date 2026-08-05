import {render, screen} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {createRoutesStub} from "react-router"
import {expect, test, vi} from "vitest"

import {AccountDialog} from "~/components/AccountDialog"
import type {Account} from "~/db/queries"

const account: Account = {
    archived: false,
    category: "credit",
    id: 7,
    name: "NFCU",
    sortOrder: 10,
    type: "liability",
}

const renderDialog = (editingAccount: Account | null = null) => {
    const onOpenChange = vi.fn()
    const Stub = createRoutesStub([
        {
            action: () => ({ok: true}),
            Component: () => (
                <AccountDialog
                    account={editingAccount}
                    open
                    onOpenChange={onOpenChange}
                />
            ),
            path: "/accounts",
        },
    ])

    render(<Stub initialEntries={["/accounts"]} />)

    return {onOpenChange}
}

test("renders a new account form", async () => {
    renderDialog()

    expect(
        await screen.findByRole("dialog", {name: "New account"}),
    ).toBeInTheDocument()
    expect(screen.getByRole("textbox", {name: "Name"})).toHaveValue("")
    expect(screen.getByRole("combobox", {name: "Type"})).toHaveTextContent(
        "asset",
    )
    expect(screen.getByRole("combobox", {name: "Category"})).toHaveTextContent(
        "cash",
    )
})

test("renders an existing account and handles cancellation", async () => {
    const user = userEvent.setup()
    const {onOpenChange} = renderDialog(account)

    expect(
        await screen.findByRole("dialog", {name: "Edit account"}),
    ).toBeInTheDocument()
    expect(screen.getByRole("textbox", {name: "Name"})).toHaveValue("NFCU")

    await user.click(screen.getByRole("button", {name: "Cancel"}))

    expect(onOpenChange).toHaveBeenCalledWith(false)
})
