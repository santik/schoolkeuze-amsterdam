import { test, expect } from "@playwright/test";
import { PROD_PROFILE_ID, isProd, seedProfileId } from "./test-utils";

async function getFirstSchoolIds(request: Parameters<typeof test>[1]["request"], take = 2) {
  const res = await request.get(`/api/schools?take=${take}`);
  const body = (await res.json()) as { schools?: Array<{ id: string }> };
  const ids = (body.schools ?? []).map((s) => s.id).filter(Boolean);
  return ids.slice(0, take);
}

test.beforeEach(async ({ page }) => {
  await seedProfileId(page);
});

test("compare page shows expected rows and My Score", async ({ page, request }) => {
  const ids = await getFirstSchoolIds(request, 2);
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

  await page.goto(`/nl/compare?ids=${encodeURIComponent(ids.join(","))}`);

  const table = isProd ? page.locator("table") : page.getByTestId("compare-table");
  await expect(table).toBeVisible();
  await expect(table.getByText(/Niveau|Level/i)).toBeVisible();
  await expect(table.getByText(/Slagingspercentage|Pass rate/i)).toBeVisible();
  await expect(table.getByText(/Concept/i)).toBeVisible();
  await expect(table.getByText(/Aantal leerlingen|Student count/i)).toBeVisible();
  await expect(table.getByText(/Mijn score|My Score/i)).toBeVisible();
  await expect(table.getByText(/Website/i)).toBeVisible();

  await expect(table).not.toContainText(/Adres|Address/i);
  await expect(table).toContainText(/%/);
});
