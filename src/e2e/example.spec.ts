import {expect, test} from "@playwright/test"

test("overview page", async ({page}) => {
    await page.goto("localhost:3000")
    await expect(page).toHaveTitle("wealth | overview")

    await expect(page.getByRole("heading", {name: "Overview"})).toBeVisible()
    await expect(page.getByRole("link", {name: "Overview"})).toBeVisible()
    await expect(page.getByRole("link", {name: "Capture"})).toBeVisible()
})

test("navigates", async ({page}) => {
    await page.goto("localhost:3000")

    await expect(page).toHaveTitle("wealth | overview")
    await expect(page.getByRole("heading", {name: "Overview"})).toBeVisible()

    await page.getByRole("link", {name: "Capture"}).click()

    await expect(page).toHaveTitle("wealth | capture")
    await expect(
        page.getByRole("heading", {name: "When are these balances from?"}),
    ).toBeVisible()
})
