import { test, expect } from "@playwright/test";
import { ensureProfileLoaded, seedProfileId } from "./test-utils";

test.beforeEach(async ({ page }) => {
  await seedProfileId(page);
  await ensureProfileLoaded(page);
});

test("home page renders in default locale", async ({ page }) => {
  await page.goto("/nl");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Scholen bekijken|Browse schools/i })
  ).toBeVisible();
  await expect(page.getByText(/School adventure|School avontuur/i)).toBeVisible();
  await expect(page.getByRole("link", { name: /Hoe werkt het\?|How does it work\?/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Stuur feedback|Send feedback/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Zoeken & filteren|Search & filter/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Favorieten & lijst|Favorites & list/i })).toBeVisible();
  await expect(page.getByText(/Vergelijken|Compare/i)).toHaveCount(0);
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

test("root redirects to nl and locale switch keeps route", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/nl\/?$/);

  await page.goto("/nl/schools?q=am");
  await page.getByRole("link", { name: "EN", exact: true }).click();
  await expect(page).toHaveURL(/\/en\/schools\?q=am/);

  await page.getByRole("link", { name: "NL", exact: true }).click();
  await expect(page).toHaveURL(/\/nl\/schools\?q=am/);
});

test("mobile header shows only compass icon label", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/nl");

  const headerIconVisible = await page.evaluate(() => {
    const header = document.querySelector("header");
    if (!header) return false;
    const link = header.querySelector("a");
    if (!link) return false;
    const spans = link.querySelectorAll("span");
    if (spans.length < 2) return false;
    const iconSpan = spans[0] as HTMLElement;
    const textSpan = spans[1] as HTMLElement;
    const iconStyle = window.getComputedStyle(iconSpan);
    const textStyle = window.getComputedStyle(textSpan);
    const iconVisible =
      iconStyle.display !== "none" &&
      iconStyle.visibility !== "hidden" &&
      iconSpan.offsetParent !== null;
    const textHidden = textStyle.display === "none" || textSpan.offsetParent === null;
    return iconVisible && textHidden;
  });

  expect(headerIconVisible).toBeTruthy();
});
