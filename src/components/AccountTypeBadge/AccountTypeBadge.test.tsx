import {render, screen} from "@testing-library/react"
import {expect, test} from "vitest"

import {AccountTypeBadge} from "~/components/AccountTypeBadge"

test.each([
    ["asset", "bg-financial-positive/10"],
    ["liability", "bg-financial-negative/10"],
] as const)("styles an %s account", (type, className) => {
    render(<AccountTypeBadge type={type} />)

    expect(screen.getByText(type)).toHaveClass(className)
})
