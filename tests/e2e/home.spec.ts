import { test, expect } from "@playwright/test";
import { seedProfileId, isProd } from "./test-utils";

test.beforeEach(async ({ page }) => {
  await seedProfileId(page);
});

test("home page renders in default locale", async ({ page }) => {
  await page.goto("/nl");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Scholen bekijken|Browse schools/i })
  ).toBeVisible();
});

test("home page links navigate correctly", async ({ page }) => {
  await page.goto("/nl");

  await page.getByRole("link", { name: /Schoolkeuze|School Choice/i }).click();
  await expect(page).toHaveURL(/\/nl\/?$/);

  await page.locator("nav").getByRole("link", { name: /Scholen|Schools/i }).click();
  await expect(page).toHaveURL(/\/nl\/schools/);

  await page.goto("/nl");
  await page.locator("nav").getByRole("link", { name: /Profiel|Profile/i }).click();
  await expect(page).toHaveURL(/\/nl\/profile/);
  await expect(page.locator('button[aria-controls="profile-id-panel"]')).toBeVisible();

  await page.goto("/nl");
  await page.getByRole("link", { name: /Scholen bekijken|Browse schools/i }).click();
  await expect(page).toHaveURL(/\/nl\/schools/);

  await page.goto("/nl");
  await page.getByRole("link", { name: /Hoe werkt het\?|How does it work\?/i }).click();
  await expect(page).toHaveURL(/\/nl\/guide/);

  await page.goto("/nl");
  await page.getByRole("link", { name: /Stuur feedback|Send feedback/i }).click();
  await expect(page).toHaveURL(/\/nl\/feedback/);

  await page.goto("/nl");
  await page.getByRole("link", { name: /Zoeken & filteren|Search & filter/i }).click();
  await expect(page).toHaveURL(/\/nl\/schools/);

  await page.goto("/nl");
  await page.getByRole("link", { name: /Favorieten & lijst|Favorites & list/i }).click();
  await expect(page).toHaveURL(/\/nl\/profile/);
});
