import {render, screen, within} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {createRoutesStub} from "react-router"
import {expect, test} from "vitest"

import type {Account, Balance} from "~/db/queries"
import Route from "~/routes/account-summary"

const account: Account = {
    archived: true,
    category: "credit",
    id: 2,
    name: "Old Card",
    sortOrder: 20,
    type: "liability",
}

const balances: Balance[] = [
    {
        accountId: 2,
        amountCents: 12_345,
        date: "2026-08-03",
        id: 2,
    },
    {
        accountId: 2,
        amountCents: 10_000,
        date: "2026-07-27",
        id: 1,
    },
]

const renderRoute = (routeBalances: Balance[]) => {
    const Stub = createRoutesStub([
        {
            Component: Route,
            loader: () => ({
                account,
                balances: routeBalances,
                defaultWindow: 52,
            }),
            path: "/account/:accountId",
        },
    ])

    render(<Stub initialEntries={["/account/2"]} />)
}

test("shows account details and balance history", async () => {
    renderRoute(balances)

    expect(
        await screen.findByRole("heading", {name: "Old Card"}),
    ).toBeInTheDocument()
    expect(document.title).toEqual("wealth | Old Card")
    expect(screen.getByText(/liability/i)).toBeInTheDocument()
    expect(screen.getByText("credit")).toBeInTheDocument()
    expect(screen.getByText("Archived")).toBeInTheDocument()
    expect(
        screen.getByRole("img", {name: "Account balance over time"}),
    ).toBeInTheDocument()
    expect(screen.getByRole("link", {name: "Accounts"})).toHaveAttribute(
        "href",
        "/accounts",
    )

    const history = screen.getByRole("region", {name: "Balance history"})
    const rows = within(history).getAllByRole("row")

    expect(rows).toHaveLength(3)
    expect(rows[1]).toHaveTextContent("August 3, 2026$123.45")
    expect(
        within(rows[1]).getByRole("link", {name: "August 3, 2026"}),
    ).toHaveAttribute("href", "/capture/2026-08-03")
    expect(rows[2]).toHaveTextContent("July 27, 2026$100.00")
})

test("sorts balance history by date and balance", async () => {
    const user = userEvent.setup()
    renderRoute(balances)

    const history = await screen.findByRole("region", {
        name: "Balance history",
    })
    const dateHeader = within(history).getByRole("columnheader", {name: /Date/})
    const balanceHeader = within(history).getByRole("columnheader", {
        name: /Balance/,
    })

    expect(dateHeader).toHaveAttribute("aria-sort", "descending")

    await user.click(within(dateHeader).getByRole("button"))

    expect(dateHeader).toHaveAttribute("aria-sort", "ascending")
    expect(within(history).getAllByRole("row")[1]).toHaveTextContent(
        "July 27, 2026$100.00",
    )

    await user.click(within(balanceHeader).getByRole("button"))
    await user.click(within(balanceHeader).getByRole("button"))

    expect(balanceHeader).toHaveAttribute("aria-sort", "descending")
    expect(within(history).getAllByRole("row")[1]).toHaveTextContent(
        "August 3, 2026$123.45",
    )
})

test("shows an empty balance history", async () => {
    renderRoute([])

    await screen.findByRole("heading", {name: "Old Card"})

    expect(screen.getByText("No balance history.")).toBeInTheDocument()
})
