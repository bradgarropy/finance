import {render, screen} from "@testing-library/react"
import {expect, test} from "vitest"

import {AccountTypeBadge} from "~/components/AccountTypeBadge"

test.each([
    ["asset", "bg-emerald-50"],
    ["liability", "bg-rose-50"],
] as const)("styles an %s account", (type, className) => {
    render(<AccountTypeBadge type={type} />)

    expect(screen.getByText(type)).toHaveClass(className)
})
