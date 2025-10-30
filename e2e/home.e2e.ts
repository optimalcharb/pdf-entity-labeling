import { expect, test } from "@playwright/test"

test.describe("Marketing site", () => {
  test("home page displays header", async ({ page }) => {
    await page.goto("/")

    await expect(page.getByRole("heading", { name: "PDF Container" })).toBeVisible()
  })
})
