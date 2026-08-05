import {render, screen} from "@testing-library/react"
import {createRoutesStub} from "react-router"
import {expect, test} from "vitest"

import Route from "~/routes/index"

const renderRoute = (
    snapshots: Array<{
        assetsCents: number
        date: string
        liabilitiesCents: number
        netWorthCents: number
    }>,
    latestBalances = [
        {
            accountId: 1,
            accountName: "Checking",
            accountType: "asset" as const,
            amountCents: 125_000,
        },
        {
            accountId: 2,
            accountName: "NFCU",
            accountType: "liability" as const,
            amountCents: 20_000,
        },
    ],
) => {
    const Stub = createRoutesStub([
        {
            Component: Route,
            loader: () => ({latestBalances, snapshots}),
            path: "/",
        },
    ])

    render(<Stub />)
}

test("renders the latest financial snapshot", async () => {
    renderRoute([
        {
            assetsCents: 100_000,
            date: "2026-07-24",
            liabilitiesCents: 25_000,
            netWorthCents: 75_000,
        },
        {
            assetsCents: 125_000,
            date: "2026-07-31",
            liabilitiesCents: 20_000,
            netWorthCents: 105_000,
        },
    ])

    expect(
        await screen.findByRole("heading", {name: "Overview"}),
    ).toBeInTheDocument()
    expect(document.title).toEqual("💵 finance | overview")
    expect(screen.getByText(/Latest capture:/)).toBeInTheDocument()
    expect(screen.getByRole("link", {name: "July 31, 2026"})).toHaveAttribute(
        "href",
        "/capture/2026-07-31",
    )

    const snapshot = screen.getByRole("region", {
        name: "Latest financial snapshot",
    })

    expect(snapshot).toHaveTextContent("Assets$1,250.00")
    expect(snapshot).toHaveTextContent("Liabilities$200.00")
    expect(snapshot).toHaveTextContent("Net worth$1,050.00")
    expect(
        screen.getByRole("heading", {name: "Financial history"}),
    ).toBeInTheDocument()
    expect(
        screen.getByRole("img", {
            name: "Assets, liabilities, and net worth over time",
        }),
    ).toBeInTheDocument()
    expect(
        screen.getByRole("heading", {name: "Latest accounts"}),
    ).toBeInTheDocument()
    expect(screen.getByRole("link", {name: "Checking"})).toHaveAttribute(
        "href",
        "/account/1",
    )
})

test("renders an empty state without snapshots", async () => {
    renderRoute([], [])

    await screen.findByRole("heading", {name: "Overview"})

    expect(screen.getByText("No balance snapshots yet.")).toBeInTheDocument()
})
