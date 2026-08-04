import {render, screen} from "@testing-library/react"
import {MemoryRouter} from "react-router"
import {expect, test} from "vitest"

import Navigation from "~/components/Navigation"

test("renders", () => {
    render(
        <MemoryRouter>
            <Navigation />
        </MemoryRouter>,
    )

    expect(screen.getAllByRole("link").map(link => link.textContent)).toEqual([
        "Overview",
        "Accounts",
        "Capture",
        "Settings",
    ])
})
