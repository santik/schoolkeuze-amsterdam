import { test, expect } from "@playwright/test";
import { seedProfileId } from "./test-utils";

test.beforeEach(async ({ page }) => {
  await seedProfileId(page);
});

test("guide page shows usage and admissions sections", async ({ page }) => {
  await page.goto("/nl/guide");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /Zo gebruik je deze app|How to use this app/i })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /Toelating & loting|Admissions & lottery/i })
  ).toBeVisible();
});
