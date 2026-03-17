import { test, expect } from "@playwright/test";
import {
  PROFILE_ID_STORAGE_KEY,
  PROD_PROFILE_ID,
  ensureProfileLoaded,
  isProd,
  seedProfileId,
} from "./test-utils";

async function getFirstSchoolIds(request: Parameters<typeof test>[1]["request"], take = 2) {
  const res = await request.get(`/api/schools?take=${take}`);
  const body = (await res.json()) as { schools?: Array<{ id: string }> };
  const ids = (body.schools ?? []).map((s) => s.id).filter(Boolean);
  return ids.slice(0, take);
}

test.beforeEach(async ({ page }) => {
  await seedProfileId(page);
  await ensureProfileLoaded(page);
});

async function seedFavorites(
  page: Parameters<typeof test>[1]["page"],
  request: Parameters<typeof test>[1]["request"],
  count: number
) {
  const ids = await getFirstSchoolIds(request, count);
  if (isProd) {
    await request.put("/api/profile/favorites", {
      data: {
        profileId: PROD_PROFILE_ID,
        ids,
      },
    });
  } else {
    const favoritesKey = `schoolkeuze:favorites:v1:${PROD_PROFILE_ID}`;
    await page.addInitScript(
      ([favKey, favIds]) => {
        localStorage.setItem(favKey, JSON.stringify(favIds));
      },
      [favoritesKey, ids]
    );
  }
  return ids;
}

async function getFavoriteNames(page: Parameters<typeof test>[1]["page"]) {
  if (isProd) {
    return page.locator("main [role=\"button\"] .truncate").allTextContents();
  }
  return page.getByTestId("favorite-item").locator(".truncate").allTextContents();
}

async function dragItem(
  page: Parameters<typeof test>[1]["page"],
  source: Parameters<typeof test>[1]["page"]["locator"],
  target: Parameters<typeof test>[1]["page"]["locator"]
) {
  const from = await source.boundingBox();
  const to = await target.boundingBox();
  if (!from || !to) throw new Error("Missing drag bounds");
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 10 });
  await page.mouse.up();
}

test("profile page shows favorites list and My Score", async ({ page, request }) => {
  const ids = await seedFavorites(page, request, 2);
  expect(ids.length).toBeGreaterThanOrEqual(1);

  if (isProd) {
    await request.put("/api/profile/impression", {
      data: {
        profileId: PROD_PROFILE_ID,
        schoolId: ids[0],
        metrics: { canImagineYourself: 5 },
      },
    });
  } else {
    const impressionKey = `schoolkeuze:impression:v1:${PROD_PROFILE_ID}:${ids[0]}`;
    await page.addInitScript(
      ([impKey]) => {
        localStorage.setItem(impKey, JSON.stringify({ canImagineYourself: 5 }));
      },
      [impressionKey]
    );
  }

  await page.goto("/nl/profile");

  if (isProd) {
    const cards = page.locator("main [role=\"button\"]");
    await expect
      .poll(async () => cards.count())
      .toBeGreaterThan(0);
    await expect(page.getByText(/Mijn score|My Score/i)).toBeVisible();
  } else {
    const favoritesList = page.getByTestId("favorites-list");
    await expect(favoritesList).toBeVisible();
    await expect(page.getByTestId("favorite-item").first()).toBeVisible();
    await expect(page.getByTestId("favorite-score")).toBeVisible();
  }

  const compareLink = page.getByRole("link", { name: /Vergelijken|Compare/i });
  await expect(compareLink).toHaveAttribute("href", /\/compare\?ids=/);

  await expect(page.getByRole("button", { name: /Exporteer lijst|Export list/i })).toBeVisible();
});

test("profile id panel toggles and loads new id", async ({ page }) => {
  await page.goto("/nl/profile");

  const toggle = page.locator('button[aria-controls="profile-id-panel"]');
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");

  const input = page.getByPlaceholder(/profiel|profile/i);
  await input.fill("SunnyCat1234");
  await page.getByRole("button", { name: /Profiel laden|Load profile/i }).click();
  await expect(page.getByText(/Profiel geladen|Profile loaded/i)).toBeVisible();

  const stored = await page.evaluate(
    (key) => localStorage.getItem(key),
    PROFILE_ID_STORAGE_KEY
  );
  expect(stored).toBe("SunnyCat1234");
});

test("profile favorites reorder persists after drag and drop", async ({ page, request }) => {
  const ids = await seedFavorites(page, request, 3);
  expect(ids.length).toBeGreaterThanOrEqual(3);

  await page.goto("/nl/profile");
  const items = isProd ? page.locator("main [role=\"button\"]") : page.getByTestId("favorite-item");
  await expect.poll(async () => items.count()).toBeGreaterThanOrEqual(3);

  const before = await page.evaluate((key) => {
    const raw = localStorage.getItem(key) ?? "[]";
    try {
      return JSON.parse(raw) as string[];
    } catch {
      return [];
    }
  }, `schoolkeuze:favorites:v1:${PROD_PROFILE_ID}`);

  const responsePromise = page.waitForResponse(
    (res) =>
      res.url().includes("/api/profile/favorites") &&
      res.request().method() === "PUT",
    { timeout: 15_000 }
  ).catch(() => null);

  await dragItem(page, items.nth(0), items.nth(2));
  await responsePromise;

  const after = await page.evaluate((key) => {
    const raw = localStorage.getItem(key) ?? "[]";
    try {
      return JSON.parse(raw) as string[];
    } catch {
      return [];
    }
  }, `schoolkeuze:favorites:v1:${PROD_PROFILE_ID}`);

  expect(after[0]).toBe(before[1]);
  expect(after[2]).toBe(before[0]);

  await page.reload();
  await expect.poll(async () => items.count()).toBeGreaterThanOrEqual(3);
});

test("profile advice level shows mismatch warning", async ({ page, request }) => {
  const ids = await seedFavorites(page, request, 2);
  expect(ids.length).toBeGreaterThanOrEqual(1);

  await page.goto("/nl/profile");

  const levelsText = isProd
    ? (await page.locator("main [role=\"button\"] .text-xs").filter({ hasText: /·|\/ / }).first().textContent()) ?? ""
    : (await page.getByTestId("favorite-item").first().locator(".mt-1.text-xs").first().textContent()) ?? "";

  const upper = levelsText.toUpperCase();
  const choices = ["VMBO", "HAVO", "VWO"] as const;
  const mismatch = choices.find((lvl) => !upper.includes(lvl));
  if (!mismatch) return;

  await page.getByLabel(/Advies|Advice/i).selectOption(mismatch);
  const warning = page.getByText(/Biedt geen|Doesn't offer/i);
  await expect(warning.first()).toBeVisible();
});

test("profile export list triggers pdf download", async ({ page, request }) => {
  const ids = await seedFavorites(page, request, 2);
  expect(ids.length).toBeGreaterThanOrEqual(1);

  await page.goto("/nl/profile");
  const downloadPromise = page.waitForEvent("download", { timeout: 15_000 });
  await page.getByRole("button", { name: /Exporteer lijst|Export list/i }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
});

test("profile share link copies URL with profileId", async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).__copiedShareLink = "";
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: (text: string) => {
          (window as any).__copiedShareLink = text;
          return Promise.resolve();
        },
      },
    });
  });

  await page.goto("/nl/profile");

  const toggle = page.locator('button[aria-controls="profile-id-panel"]');
  await toggle.click();

  const copyButton = page.getByRole("button", {
    name: /Deellink kopiëren|Copy share link/i,
  });
  await copyButton.click();

  const copied = await page.evaluate(() => (window as any).__copiedShareLink as string);
  expect(copied).toContain("profileId=");
  expect(copied).toContain(PROD_PROFILE_ID);
});

test("profile favorite row opens school details", async ({ page, request }) => {
  const ids = await seedFavorites(page, request, 1);
  expect(ids.length).toBeGreaterThanOrEqual(1);

  await page.goto("/nl/profile");
  const items = isProd
    ? page.locator('main [role="button"]')
    : page.getByTestId("favorite-item");
  await expect.poll(async () => items.count()).toBeGreaterThan(0);

  await items.first().click();
  await expect(page).toHaveURL(/\/nl\/schools\/[^/]+/);
});

test("profile favorites show distance labels when using my location", async ({
  page,
  request,
  context,
}) => {
  const ids = await seedFavorites(page, request, 2);
  expect(ids.length).toBeGreaterThanOrEqual(1);

  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 52.37, longitude: 4.89 });

  await page.goto("/nl/profile");

  const useLocation = page.getByLabel("Gebruik mijn locatie (afstand)");
  await useLocation.check();

  const items = isProd
    ? page.locator('main [role="button"]')
    : page.getByTestId("favorite-item");
  await expect.poll(async () => items.count()).toBeGreaterThan(0);

  const distanceLabels = page.getByText(/km · ~\d+ min fiets/);
  await expect(distanceLabels).toHaveCount(2);
  await expect(distanceLabels.first()).toBeVisible();
});
