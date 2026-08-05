import {render, screen, within} from "@testing-library/react"
import {MemoryRouter} from "react-router"
import {expect, test} from "vitest"

import {LatestAccountSnapshot} from "~/components/LatestAccountSnapshot"

test("groups and links the latest active account balances", () => {
    render(
        <MemoryRouter>
            <LatestAccountSnapshot
                balances={[
                    {
                        accountId: 1,
                        accountName: "Checking",
                        accountType: "asset",
                        amountCents: 2_000_000,
                    },
                    {
                        accountId: 2,
                        accountName: "NFCU",
                        accountType: "liability",
                        amountCents: 76_308,
                    },
                    {
                        accountId: 3,
                        accountName: "New savings",
                        accountType: "asset",
                        amountCents: null,
                    },
                ]}
            />
        </MemoryRouter>,
    )

    const assets = screen.getByRole("region", {name: "Assets"})
    const liabilities = screen.getByRole("region", {name: "Liabilities"})

    expect(assets).toHaveTextContent("Checking$20,000.00")
    expect(assets).toHaveTextContent("New savings-")
    expect(
        within(assets).getByRole("link", {name: "Checking"}),
    ).toHaveAttribute("href", "/account/1")
    expect(liabilities).toHaveTextContent("NFCU$763.08")
})
