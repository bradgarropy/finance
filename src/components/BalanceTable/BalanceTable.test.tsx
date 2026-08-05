import {render, screen, within} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {MemoryRouter} from "react-router"
import {expect, test} from "vitest"

import {BalanceTable} from "~/components/BalanceTable"
import type {Balance} from "~/db/queries"

const balances: Balance[] = [
    {accountId: 1, amountCents: 10_000, date: "2026-07-27", id: 1},
    {accountId: 1, amountCents: 12_345, date: "2026-08-03", id: 2},
]

test("sorts balances and links dates to capture summaries", async () => {
    const user = userEvent.setup()

    render(
        <MemoryRouter>
            <BalanceTable balances={balances} />
        </MemoryRouter>,
    )

    const rows = screen.getAllByRole("row")

    expect(rows[1]).toHaveTextContent("August 3, 2026$123.45")
    expect(
        within(rows[1]).getByRole("link", {name: "August 3, 2026"}),
    ).toHaveAttribute("href", "/capture/2026-08-03")

    await user.click(screen.getByRole("button", {name: "Sort by date"}))

    expect(screen.getAllByRole("row")[1]).toHaveTextContent(
        "July 27, 2026$100.00",
    )
})
