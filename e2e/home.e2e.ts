import { expect, test } from "@playwright/test"

test.describe("PDF entity labeling site", () => {
  test("Check that PDFContainer loads and has Annotations", async ({ page }) => {
    await page.goto("/")

    await expect(page.getByRole("heading", { name: "PDF Container" })).toBeVisible()

    await page.locator('[data-testid="spinner0"]').waitFor({ state: "hidden", timeout: 5000 })
    await page.locator('[data-testid="spinner1"]').waitFor({ state: "hidden", timeout: 5000 })
    await page.locator('[data-testid="spinner2"]').waitFor({ state: "hidden", timeout: 5000 })

    await expect(page.locator('[data-testid="=embedpdf"]')).toBeDefined() // toBeHidden()
    await expect(page.locator('[data-testid="=annotation-toolbar"]')).toBeDefined()
    await expect(page.locator('[data-testid="=annotation-layer"]')).toBeDefined()
    await expect(page.locator('[data-testid="=annotations"]')).toBeDefined()
    await expect(page.locator('[data-testid="=text-markup"]')).toBeDefined()
  })
})
