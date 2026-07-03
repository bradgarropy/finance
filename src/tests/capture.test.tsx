import {render, screen} from "@testing-library/react"
import {expect, test} from "vitest"

import Route from "~/routes/capture"

test("renders", () => {
    render(<Route />)

    expect(document.title).toEqual("💵 finance | capture")
    expect(screen.getByText("Capture Balances")).toBeInTheDocument()
})
