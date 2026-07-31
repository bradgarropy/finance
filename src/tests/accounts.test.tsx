import {render, screen, within} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {createRoutesStub} from "react-router"
import {expect, test} from "vitest"

import type {Account} from "~/db/queries"
import Route from "~/routes/accounts"

const accounts: Account[] = [
    {
        archived: false,
        category: "cash",
        id: 1,
        name: "Checking",
        sortOrder: 10,
        type: "asset",
    },
    {
        archived: true,
        category: "credit",
        id: 2,
        name: "Old Card",
        sortOrder: 20,
        type: "liability",
    },
]

const renderRoute = (routeAccounts: Account[]) => {
    const Stub = createRoutesStub([
        {
            Component: Route,
            loader: () => ({accounts: routeAccounts}),
            path: "/accounts",
        },
    ])

    render(<Stub initialEntries={["/accounts"]} />)
}

test("lists active and archived accounts", async () => {
    renderRoute(accounts)

    expect(
        await screen.findByRole("heading", {name: "Accounts"}),
    ).toBeInTheDocument()
    expect(document.title).toEqual("💵 finance | accounts")

    const active = screen.getByRole("region", {name: "Active"})
    const archived = screen.getByRole("region", {name: "Archived"})

    expect(within(active).getByText("Checking")).toBeInTheDocument()
    expect(within(active).queryByText("Old Card")).not.toBeInTheDocument()
    expect(within(archived).getByText("Old Card")).toBeInTheDocument()
    expect(within(archived).queryByText("Checking")).not.toBeInTheDocument()
})

test("shows empty states", async () => {
    renderRoute([])

    await screen.findByRole("heading", {name: "Accounts"})

    expect(screen.getByText("No active accounts.")).toBeInTheDocument()
    expect(screen.getByText("No archived accounts.")).toBeInTheDocument()
})

test("opens the new account dialog", async () => {
    const user = userEvent.setup()
    renderRoute(accounts)

    await user.click(await screen.findByRole("button", {name: "New account"}))

    expect(
        screen.getByRole("dialog", {name: "New account"}),
    ).toBeInTheDocument()
    expect(screen.getByRole("textbox", {name: "Name"})).toHaveValue("")
})

test("opens an account for editing from its actions menu", async () => {
    const user = userEvent.setup()
    renderRoute(accounts)

    await user.click(
        await screen.findByRole("button", {name: "Actions for Checking"}),
    )
    await user.click(await screen.findByRole("menuitem", {name: "Edit"}))

    expect(
        screen.getByRole("dialog", {name: "Edit account"}),
    ).toBeInTheDocument()
    expect(screen.getByRole("textbox", {name: "Name"})).toHaveValue("Checking")
})
