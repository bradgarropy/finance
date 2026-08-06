import {render, screen} from "@testing-library/react"
import {createRoutesStub} from "react-router"
import {expect, test} from "vitest"

import type {Settings} from "~/db/queries"
import Route from "~/routes/settings"

const settings: Settings = {
    checkingBaselineCents: 2_000_000,
    defaultWindow: 52,
    emergencyBaselineCents: 6_000_000,
    excessInvestPct: 75,
    excessSavePct: 25,
    id: 1,
}

test("renders the current settings", async () => {
    const Stub = createRoutesStub([
        {
            Component: Route,
            loader: () => ({settings}),
            path: "/settings",
        },
    ])

    render(<Stub initialEntries={["/settings"]} />)

    expect(
        await screen.findByRole("heading", {name: "Settings"}),
    ).toBeInTheDocument()
    expect(document.title).toEqual("💵 finance | settings")
    expect(screen.getByLabelText("Checking baseline")).toHaveValue("20,000.00")
    expect(screen.getByLabelText("Emergency baseline")).toHaveValue("60,000.00")
    expect(screen.getByLabelText("Investments")).toHaveValue("75")
    expect(screen.getByLabelText("Savings")).toHaveValue("25")
    expect(screen.getAllByText("%")).toHaveLength(2)
    expect(
        screen.getByRole("combobox", {name: "Default window"}),
    ).toHaveTextContent("52 weeks")
    expect(screen.getByRole("button", {name: "Save settings"})).toBeEnabled()
    expect(
        screen.getByRole("link", {name: "Built by Brad Garropy"}),
    ).toHaveAttribute("href", "https://bradgarropy.com")
    expect(screen.getByRole("link", {name: "GitHub"})).toHaveAttribute(
        "href",
        "https://github.com/bradgarropy/finance",
    )
    expect(screen.getByText("finance@0.0.1")).toBeInTheDocument()
})
