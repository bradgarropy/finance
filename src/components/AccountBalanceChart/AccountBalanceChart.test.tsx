import {render, screen} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {expect, test} from "vitest"

import {AccountBalanceChart} from "~/components/AccountBalanceChart"

test("renders account history and changes ranges", async () => {
    const user = userEvent.setup()
    const {container} = render(
        <AccountBalanceChart
            accountType="asset"
            balances={[
                {amountCents: 125_000, date: "2026-07-24"},
                {amountCents: 150_000, date: "2026-07-31"},
            ]}
            defaultWindow={4}
        />,
    )

    expect(
        screen.getByRole("img", {name: "Account balance over time"}),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", {name: "Show 4 weeks"})).toHaveAttribute(
        "aria-pressed",
        "true",
    )

    await user.click(screen.getByRole("button", {name: "Show all history"}))

    expect(
        screen.getByRole("button", {name: "Show all history"}),
    ).toHaveAttribute("aria-pressed", "true")
    expect(container.querySelectorAll(".recharts-line")).toHaveLength(1)
})
