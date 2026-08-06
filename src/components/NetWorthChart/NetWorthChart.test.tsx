import {render, screen} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {expect, test} from "vitest"

import {NetWorthChart} from "~/components/NetWorthChart"

test("renders the configured history window and changes ranges", async () => {
    const user = userEvent.setup()
    const {container} = render(
        <NetWorthChart
            defaultWindow={4}
            snapshots={[
                {
                    assetsCents: 125_000,
                    date: "2026-07-24",
                    liabilitiesCents: 25_000,
                    netWorthCents: 100_000,
                },
                {
                    assetsCents: 150_000,
                    date: "2026-07-31",
                    liabilitiesCents: 20_000,
                    netWorthCents: 130_000,
                },
            ]}
        />,
    )

    expect(
        screen.getByRole("img", {
            name: "Assets, liabilities, and net worth over time",
        }),
    ).toBeInTheDocument()
    expect(screen.getByRole("button", {name: "Show 4 weeks"})).toHaveAttribute(
        "aria-pressed",
        "true",
    )

    await user.click(screen.getByRole("button", {name: "Show all history"}))

    expect(
        screen.getByRole("button", {name: "Show all history"}),
    ).toHaveAttribute("aria-pressed", "true")
    expect(container.querySelector(".recharts-wrapper")).toHaveStyle({
        cursor: "auto",
    })
    expect(container.querySelectorAll(".recharts-line")).toHaveLength(3)
})
