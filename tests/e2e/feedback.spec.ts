import { test, expect } from "@playwright/test";
import { seedProfileId } from "./test-utils";

test.beforeEach(async ({ page }) => {
  await seedProfileId(page);
});

test("feedback form submits and shows thank you message", async ({ page }) => {
  await page.route("**/api/feedback", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });

  await page.goto("/nl/feedback");

  const submit = page.getByRole("button", { name: /Verstuur|Send/i });
  await expect(submit).toBeDisabled();

  await page.getByRole("textbox").fill("Test feedback");
  await expect(submit).toBeEnabled();
  await submit.click();

  await expect(page.getByText(/Bedankt|Thank you/i)).toBeVisible();
});
