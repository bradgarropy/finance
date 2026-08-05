import {render, screen} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {expect, test} from "vitest"

import MoneyInput from "~/components/MoneyInput"

test("formats money and rejects nonnumeric input", async () => {
    const user = userEvent.setup()

    render(
        <div>
            <label htmlFor="amount">Amount</label>
            <MoneyInput defaultValue={1234.56} id="amount" name="amount" />
        </div>,
    )

    const input = screen.getByLabelText("Amount")

    expect(input).toHaveValue("1,234.56")
    expect(screen.getByText("$")).toBeInTheDocument()

    await user.clear(input)
    await user.type(input, "letters")

    expect(input).toHaveValue("")
})
