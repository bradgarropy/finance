import {render, screen} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {createRoutesStub} from "react-router"
import {expect, test} from "vitest"

import Route from "~/routes/capture"

const renderRoute = () => {
    const Stub = createRoutesStub([
        {
            Component: Route,
            loader: () => ({
                accounts: [
                    {
                        category: "cash",
                        id: 1,
                        name: "Checking",
                        previousAmountCents: 123_456,
                        type: "asset",
                    },
                ],
                latestDate: "2026-06-28",
            }),
            path: "/capture",
        },
    ])

    render(<Stub initialEntries={["/capture"]} />)
}

test("renders the date step", async () => {
    renderRoute()

    expect(
        await screen.findByRole("heading", {
            name: "When are these balances from?",
        }),
    ).toBeInTheDocument()
    expect(document.title).toEqual("💵 finance | capture")
    expect(screen.getByText("1 of 10")).toBeInTheDocument()
    expect(screen.getByRole("progressbar")).toHaveAttribute(
        "aria-valuetext",
        "Step 1 of 10",
    )
    expect(
        screen.getByRole("button", {name: "Begin capture"}),
    ).toBeInTheDocument()
})

test("opens the first account input", async () => {
    const user = userEvent.setup()
    renderRoute()

    await user.click(await screen.findByRole("button", {name: "Begin capture"}))

    expect(
        screen.getByRole("heading", {
            name: "What is the current balance?",
        }),
    ).toBeInTheDocument()
    expect(screen.getByText("Checking")).toBeInTheDocument()
    expect(screen.getByText("cash · asset")).toBeInTheDocument()
    expect(screen.getByText("2 of 10")).toBeInTheDocument()
    const balanceInput = screen.getByLabelText("Current balance")

    expect(balanceInput).toHaveValue("$1,234.56")

    await user.clear(balanceInput)
    await user.type(balanceInput, "letters")

    expect(balanceInput).toHaveValue("")
})
