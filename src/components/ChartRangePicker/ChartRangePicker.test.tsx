import {render, screen} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {expect, test, vi} from "vitest"

import {ChartRangePicker} from "~/components/ChartRangePicker"

test("renders the selected range and reports range changes", async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()

    render(<ChartRangePicker value={12} onValueChange={onValueChange} />)

    expect(screen.getByRole("button", {name: "Show 12 weeks"})).toHaveAttribute(
        "aria-pressed",
        "true",
    )

    await user.click(screen.getByRole("button", {name: "Show all history"}))

    expect(onValueChange).toHaveBeenCalledWith("all")
})
