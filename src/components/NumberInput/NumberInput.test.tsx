import {render, screen} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {expect, test} from "vitest"

import NumberInput from "~/components/NumberInput"

test("renders an adorned number field and accepts numeric input", async () => {
    const user = userEvent.setup()

    render(
        <div>
            <label htmlFor="percentage">Percentage</label>
            <NumberInput
                addon="%"
                addonAlign="inline-end"
                defaultValue={75}
                format={{maximumFractionDigits: 0}}
                id="percentage"
                max={100}
                min={0}
                name="percentage"
                step={1}
            />
        </div>,
    )

    const input = screen.getByLabelText("Percentage")

    expect(input).toHaveValue("75")
    expect(screen.getByText("%")).toBeInTheDocument()

    await user.clear(input)
    await user.type(input, "25")
    await user.tab()

    expect(input).toHaveValue("25")
})
