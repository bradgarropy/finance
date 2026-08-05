import {render, screen, within} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {createRoutesStub} from "react-router"
import {expect, test, vi} from "vitest"

import {AccountList} from "~/components/AccountList"
import type {Account} from "~/db/queries"

const account: Account = {
    archived: false,
    category: "cash",
    id: 1,
    name: "Checking",
    sortOrder: 10,
    type: "asset",
}

test("renders an empty account list", () => {
    render(
        <AccountList
            accounts={[]}
            emptyMessage="No accounts."
            title="Active"
            onArchive={vi.fn()}
            onDelete={vi.fn()}
            onEdit={vi.fn()}
        />,
    )

    expect(screen.getByRole("region", {name: "Active"})).toHaveTextContent(
        "No accounts.",
    )
})

test("links accounts and exposes their actions", async () => {
    const user = userEvent.setup()
    const onArchive = vi.fn()
    const onDelete = vi.fn()
    const onEdit = vi.fn()
    const Stub = createRoutesStub([
        {
            Component: () => (
                <AccountList
                    accounts={[account]}
                    emptyMessage="No accounts."
                    title="Active"
                    onArchive={onArchive}
                    onDelete={onDelete}
                    onEdit={onEdit}
                />
            ),
            path: "/accounts",
        },
    ])

    render(<Stub initialEntries={["/accounts"]} />)

    const region = screen.getByRole("region", {name: "Active"})

    expect(
        within(region).getByRole("link", {name: "Checking"}),
    ).toHaveAttribute("href", "/account/1")

    await user.click(
        within(region).getByRole("button", {name: "Actions for Checking"}),
    )
    await user.click(await screen.findByRole("menuitem", {name: "Edit"}))

    expect(onEdit).toHaveBeenCalledWith(account)
})
