import {expect, test} from "@playwright/test"

test("home page", async ({page}) => {
    await page.goto("localhost:3000")
    await expect(page).toHaveTitle("💵 finance | home")

    await expect(page.getByRole("heading", {name: "Home"})).toBeVisible()
    await expect(page.getByRole("link", {name: "Home"})).toBeVisible()
    await expect(page.getByRole("link", {name: "Capture"})).toBeVisible()
})

test("navigates", async ({page}) => {
    await page.goto("localhost:3000")

    await expect(page).toHaveTitle("💵 finance | home")
    await expect(page.getByRole("heading", {name: "Home"})).toBeVisible()

    await page.getByRole("link", {name: "Capture"}).click()

    await expect(page).toHaveTitle("💵 finance | capture")
    await expect(
        page.getByRole("heading", {name: "When are these balances from?"}),
    ).toBeVisible()
})
