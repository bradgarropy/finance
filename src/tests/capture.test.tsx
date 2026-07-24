import {render, screen} from "@testing-library/react"
import {afterEach, expect, test, vi} from "vitest"

import Route from "~/routes/capture"
import {formatDateInput} from "~/utils/format"

afterEach(() => {
    vi.useRealTimers()
})

test("renders the date step", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-07-03T18:00:00Z"))

    render(<Route />)

    expect(
        screen.getByRole("heading", {
            name: "When are these balances from?",
        }),
    ).toBeInTheDocument()
    expect(document.title).toEqual("💵 finance | capture")
    expect(screen.getByText("1 of 10")).toBeInTheDocument()
    expect(screen.getByLabelText("Balance date")).toHaveValue(
        formatDateInput(new Date()),
    )
    expect(
        screen.getByRole("button", {name: "Begin capture"}),
    ).toBeInTheDocument()
})
