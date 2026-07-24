import {render, screen} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {createRoutesStub} from "react-router"
import {expect, test} from "vitest"

import Route from "~/routes/capture"

const accounts = [
    {
        category: "cash" as const,
        id: 1,
        name: "Checking",
        previousAmountCents: 123_456,
        type: "asset" as const,
    },
    {
        category: "credit" as const,
        id: 2,
        name: "Apple",
        previousAmountCents: 4_200,
        type: "liability" as const,
    },
]

const renderRoute = () => {
    const Stub = createRoutesStub([
        {
            Component: Route,
            loader: () => ({accounts}),
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
    expect(screen.getByText("1 of 3")).toBeInTheDocument()
    expect(screen.getByRole("progressbar")).toHaveAttribute(
        "aria-valuetext",
        "Step 1 of 3",
    )
    expect(
        screen.getByRole("button", {name: "Begin capture"}),
    ).toBeInTheDocument()
})

test("walks through accounts and preserves their balances", async () => {
    const user = userEvent.setup()
    renderRoute()

    await user.click(await screen.findByRole("button", {name: "Begin capture"}))

    expect(
        screen.getByRole("heading", {
            name: "What is the current balance?",
        }),
    ).toBeInTheDocument()
    expect(screen.getByText("Checking")).toBeInTheDocument()
    expect(screen.getByText("cash")).toBeInTheDocument()
    expect(screen.getByText("asset")).toBeInTheDocument()
    expect(screen.getByText("2 of 3")).toBeInTheDocument()

    const checkingInput = screen.getByLabelText("Current balance")

    expect(checkingInput).toHaveValue("$1,234.56")

    await user.clear(checkingInput)
    await user.type(checkingInput, "1300")
    await user.click(screen.getByRole("button", {name: "Next account"}))

    expect(screen.getByText("Apple")).toBeInTheDocument()
    expect(screen.getByText("credit")).toBeInTheDocument()
    expect(screen.getByText("liability")).toBeInTheDocument()
    expect(screen.getByText("3 of 3")).toBeInTheDocument()
    expect(screen.getByLabelText("Current balance")).toHaveValue("$42.00")
    expect(
        screen.queryByRole("button", {name: "Next account"}),
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole("button", {name: "Back"}))

    expect(screen.getByText("Checking")).toBeInTheDocument()
    expect(screen.getByLabelText("Current balance")).toHaveValue("$1,300.00")
})
