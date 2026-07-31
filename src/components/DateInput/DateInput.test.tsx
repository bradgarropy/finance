import {render, screen} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {useState} from "react"
import {expect, test} from "vitest"

import DateInput from "~/components/DateInput"

const DateInputHarness = () => {
    const [value, setValue] = useState("2026-07-24")

    return (
        <>
            <span id="date-label">Balance date</span>
            <DateInput
                aria-labelledby="date-label"
                value={value}
                onValueChange={setValue}
            />
        </>
    )
}

test("opens the calendar and selects a date", async () => {
    const user = userEvent.setup()
    render(<DateInputHarness />)

    const dateInput = screen.getByLabelText("Balance date")

    expect(dateInput).toHaveTextContent("July 24, 2026")

    await user.click(dateInput)
    await user.click(
        screen.getByRole("button", {name: /Saturday, July 25th, 2026/i}),
    )

    expect(dateInput).toHaveTextContent("July 25, 2026")
    expect(screen.queryByRole("grid")).not.toBeInTheDocument()
})
