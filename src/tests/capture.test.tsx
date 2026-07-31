import {render, screen} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {createRoutesStub} from "react-router"
import {expect, test} from "vitest"

import type {Account} from "~/db/queries"
import Route from "~/routes/capture"

type CaptureAccount = Pick<Account, "category" | "id" | "name" | "type"> & {
    defaultAmountCents: number | null
}

const accounts: CaptureAccount[] = [
    {
        category: "cash" as const,
        defaultAmountCents: null,
        id: 1,
        name: "Checking",
        type: "asset" as const,
    },
    {
        category: "credit" as const,
        defaultAmountCents: null,
        id: 2,
        name: "Apple",
        type: "liability" as const,
    },
]

const renderRoute = (routeAccounts: CaptureAccount[] = accounts) => {
    const Stub = createRoutesStub([
        {
            Component: Route,
            loader: () => ({accounts: routeAccounts}),
            path: "/capture",
        },
    ])

    render(<Stub initialEntries={["/capture"]} />)
}

test("renders the date step", async () => {
    const user = userEvent.setup()
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
    expect(screen.getByText("Balance date")).toHaveClass("text-right")
    const datePicker = screen.getByLabelText("Balance date")

    expect(datePicker).toHaveClass("text-right")
    expect(datePicker).toHaveAttribute("type", "button")
    expect(
        screen.getByRole("button", {name: "Begin capture"}),
    ).toBeInTheDocument()

    await user.click(datePicker)

    expect(screen.getByRole("grid")).toBeInTheDocument()
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
    const nextButton = screen.getByRole("button", {name: "Next account"})

    expect(checkingInput).toHaveValue("")
    expect(nextButton).toBeDisabled()

    await user.type(checkingInput, "1300")
    expect(nextButton).toBeEnabled()
    await user.click(nextButton)

    expect(screen.getByText("Apple")).toBeInTheDocument()
    expect(screen.getByText("credit")).toBeInTheDocument()
    expect(screen.getByText("liability")).toBeInTheDocument()
    expect(screen.getByText("3 of 3")).toBeInTheDocument()
    expect(screen.getByLabelText("Current balance")).toHaveValue("")
    const reviewButton = screen.getByRole("button", {name: "Review balances"})

    expect(reviewButton).toBeDisabled()

    await user.type(screen.getByLabelText("Current balance"), "42")
    expect(reviewButton).toBeEnabled()
    await user.click(reviewButton)

    expect(
        screen.getByRole("heading", {name: "Review balances"}),
    ).toBeInTheDocument()
    expect(screen.getByRole("heading", {name: "Assets"})).toBeInTheDocument()
    expect(
        screen.getByRole("heading", {name: "Liabilities"}),
    ).toBeInTheDocument()
    expect(screen.getByText("$1,300.00")).toBeInTheDocument()
    expect(screen.getByText("$42.00")).toBeInTheDocument()
    expect(screen.getByText("3 of 3")).toBeInTheDocument()
    expect(screen.getByRole("button", {name: "Save snapshot"})).toBeEnabled()

    await user.click(screen.getByRole("button", {name: "Back"}))

    expect(screen.getByText("Apple")).toBeInTheDocument()

    await user.click(screen.getByRole("button", {name: "Back"}))

    expect(screen.getByText("Checking")).toBeInTheDocument()
    expect(screen.getByLabelText("Current balance")).toHaveValue("$1,300.00")
})

test("carries the Emergency and mortgage balances forward", async () => {
    const user = userEvent.setup()

    renderRoute([
        {
            category: "savings",
            defaultAmountCents: 6_000_000,
            id: 3,
            name: "Emergency",
            type: "asset",
        },
        {
            category: "mortgage",
            defaultAmountCents: 18_000_000,
            id: 4,
            name: "Mortgage",
            type: "liability",
        },
    ])

    await user.click(await screen.findByRole("button", {name: "Begin capture"}))

    expect(screen.getByText("Emergency")).toBeInTheDocument()
    expect(screen.getByLabelText("Current balance")).toHaveValue("$60,000.00")

    await user.click(screen.getByRole("button", {name: "Next account"}))

    expect(screen.getByText("Mortgage")).toBeInTheDocument()
    expect(screen.getByLabelText("Current balance")).toHaveValue("$180,000.00")
})
