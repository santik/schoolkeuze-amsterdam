import type { Page } from "@playwright/test";

export const PROFILE_ID_STORAGE_KEY = "schoolkeuze:profile:id:v1";
export const PROD_PROFILE_ID = "856ebfdf-ef05-49e2-b22b-0d851944062a";

export const isProd =
  process.env.PLAYWRIGHT_TARGET === "prod" ||
  (process.env.PLAYWRIGHT_BASE_URL ?? "").includes("schoolkeuze.amsterdam");

export async function seedProfileId(page: Page) {
  await page.addInitScript(
    ([key, value]) => {
      localStorage.setItem(key, value);
    },
    [PROFILE_ID_STORAGE_KEY, PROD_PROFILE_ID]
  );
}

export async function ensureProfileLoaded(page: Page) {
  if (!isProd) return;
  await page.goto("/nl/profile");
  await page.waitForSelector('button[aria-controls="profile-id-panel"]', {
    timeout: 15_000,
  });
}

export function getSchoolCards(page: Page) {
  return isProd ? page.locator("main").locator('[role="button"]') : page.getByTestId("school-card");
}

export function getSchoolNames(page: Page) {
  return isProd
    ? page.locator("main").locator('[role="button"] .truncate')
    : page.getByTestId("school-name");
}

export function getSchoolLevels(page: Page) {
  return isProd
    ? page.locator("main").locator('[role="button"] .text-xs')
    : page.getByTestId("school-levels");
}

export function getSchoolDistance(page: Page) {
  return isProd ? page.getByText(/km · ~\d+ min fiets/) : page.getByTestId("school-distance");
}

export function getMapContainer(page: Page) {
  return isProd ? page.locator(".leaflet-container") : page.getByTestId("schools-map");
}

export function getFavoriteToggle(card: ReturnType<typeof getSchoolCards>) {
  return isProd ? card.getByRole("button", { name: /favorite/i }) : card.getByTestId("favorite-toggle");
}

export function getSchoolNameFromCard(card: ReturnType<typeof getSchoolCards>) {
  return isProd ? card.locator(".truncate") : card.getByTestId("school-name");
}

export function getSchoolLevelsFromCard(card: ReturnType<typeof getSchoolCards>) {
  return isProd ? card.locator(".text-xs").first() : card.getByTestId("school-levels");
}
