import { test, expect } from "@playwright/test";

type SchoolDTO = {
  id: string;
  name: string;
  levels: string[];
  concepts: string[];
  postalCode: string | null;
  city: string | null;
  lat: number | null;
  lon: number | null;
};

const SAMPLE_SCHOOLS: SchoolDTO[] = [
  {
    id: "s1",
    name: "Alpha VWO",
    levels: ["VWO"],
    concepts: ["Gymnasium"],
    postalCode: "1011AA",
    city: "Amsterdam",
    lat: 52.3702,
    lon: 4.8952,
  },
  {
    id: "s2",
    name: "Beta HAVO/VWO",
    levels: ["HAVO", "VWO"],
    concepts: ["Dalton"],
    postalCode: "1012BB",
    city: "Amsterdam",
    lat: 52.372,
    lon: 4.897,
  },
  {
    id: "s3",
    name: "Gamma VMBO",
    levels: ["VMBO"],
    concepts: ["VMBO"],
    postalCode: "1013CC",
    city: "Amsterdam",
    lat: 52.369,
    lon: 4.891,
  },
  {
    id: "s4",
    name: "Delta Praktijk",
    levels: ["PRAKTIJKONDERWIJS"],
    concepts: ["Praktijk"],
    postalCode: "1014DD",
    city: "Amsterdam",
    lat: 52.367,
    lon: 4.889,
  },
  {
    id: "s5",
    name: "Epsilon HAVO",
    levels: ["HAVO"],
    concepts: ["Montessori"],
    postalCode: "1015EE",
    city: "Amsterdam",
    lat: 52.366,
    lon: 4.887,
  },
  {
    id: "s6",
    name: "Zeta VMBO/HAVO",
    levels: ["VMBO", "HAVO"],
    concepts: ["Brede school"],
    postalCode: "1016FF",
    city: "Amsterdam",
    lat: 52.365,
    lon: 4.885,
  },
];

function normalizeLevel(level: string) {
  const upper = level.toUpperCase();
  if (upper.startsWith("VMBO")) return "VMBO";
  return upper;
}

function rankLevel(level: string) {
  switch (normalizeLevel(level)) {
    case "VWO":
      return 2;
    case "HAVO":
      return 1;
    case "VMBO":
      return 0;
    case "PRAKTIJKONDERWIJS":
      return -1;
    default:
      return -1;
  }
}

function filterByLevels(schools: SchoolDTO[], selected: string[]) {
  if (!selected.length) return schools;
  const selectedNormalized = selected.map(normalizeLevel);
  const minRank = Math.min(...selectedNormalized.map(rankLevel));
  return schools.filter((school) => {
    const levels = school.levels.map(normalizeLevel);
    const levelSet = new Set(levels);
    for (const lvl of selectedNormalized) {
      if (!levelSet.has(lvl)) return false;
    }
    if (levels.some((lvl) => rankLevel(lvl) < minRank)) return false;
    return true;
  });
}

function sortSchools(schools: SchoolDTO[]) {
  const rankSchool = (s: SchoolDTO) => {
    const set = new Set(s.levels.map(normalizeLevel));
    if (set.has("VWO")) return 2;
    if (set.has("HAVO")) return 1;
    if (set.has("VMBO")) return 0;
    if (set.has("PRAKTIJKONDERWIJS")) return -1;
    return -1;
  };

  return [...schools].sort((a, b) => {
    const ar = rankSchool(a);
    const br = rankSchool(b);
    if (ar !== br) return br - ar;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
}

async function mockSchoolsApi(page: Parameters<typeof test>[1]["page"]) {
  await page.route("**/api/schools**", async (route) => {
    const url = new URL(route.request().url());
    const q = url.searchParams.get("q")?.trim().toLowerCase() ?? "";
    const levelsParam = url.searchParams.get("levels") ?? "";
    const levels = levelsParam ? levelsParam.split(",").filter(Boolean) : [];
    const take = Number(url.searchParams.get("take") ?? "0") || 0;

    let results = [...SAMPLE_SCHOOLS];
    if (q) {
      results = results.filter((s) => s.name.toLowerCase().includes(q));
    }
    results = filterByLevels(results, levels);
    results = sortSchools(results);
    if (take > 0) results = results.slice(0, take);

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ schools: results }),
    });
  });
}

async function mockFavoritesApi(page: Parameters<typeof test>[1]["page"]) {
  await page.context().route("**/api/profile/favorites**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ids: [] }),
      });
      return;
    }
    await route.fulfill({ status: 204, body: "" });
  });
}

async function mockProfileSettingsApi(page: Parameters<typeof test>[1]["page"]) {
  await page.context().route("**/api/profile/settings**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ adviceLevel: "HAVO" }),
      });
      return;
    }
    await route.fulfill({ status: 204, body: "" });
  });
}

test.beforeEach(async ({ page }) => {
  await mockFavoritesApi(page);
  await mockProfileSettingsApi(page);
});

test("schools page renders filters and defaults", async ({ page }) => {
  await mockSchoolsApi(page);
  await page.goto("/nl/schools");
  await expect(page.getByLabel("Zoek")).toBeVisible();
  await expect(page.getByPlaceholder("Bijv. Montessori, Barlaeus...")).toBeVisible();

  const levelContainer = page.getByText("Niveau").locator("..");
  const levelLabels = levelContainer.locator("label");
  await expect(levelLabels).toHaveCount(4);
  const labelTexts = (await levelLabels.allTextContents()).map((text) => text.trim());
  expect(labelTexts).toEqual(["Praktijk", "VMBO", "HAVO", "VWO"]);

  await expect(page.getByText("Concept")).toHaveCount(0);
  await expect(page.getByText("Postcode", { exact: true })).toHaveCount(0);

  const distanceButton = page.getByRole("button", { name: /Afstand & fietstijd/i });
  await expect(distanceButton).toHaveAttribute("aria-expanded", "false");
  await distanceButton.click();
  await expect(distanceButton).toHaveAttribute("aria-expanded", "true");

  const bikeSlider = page.locator('input[type="range"]');
  await expect(bikeSlider).toHaveValue("30");
  await expect(bikeSlider).toHaveAttribute("min", "5");
  await expect(bikeSlider).toHaveAttribute("max", "45");
  await expect(bikeSlider).toHaveAttribute("step", "5");
  await expect(bikeSlider).toBeDisabled();

  const mapButton = page.getByRole("button", { name: "Kaart" });
  await expect(mapButton).toHaveAttribute("aria-expanded", "false");
});

test("schools list sorts by level rank and name", async ({ page }) => {
  await mockSchoolsApi(page);
  await page.goto("/nl/schools");

  const titles = page.locator('div[role="button"] .truncate');
  await expect(titles).toHaveText([
    "Alpha VWO",
    "Beta HAVO/VWO",
    "Epsilon HAVO",
    "Zeta VMBO/HAVO",
    "Gamma VMBO",
    "Delta Praktijk",
  ]);
});

test("schools search filters by text", async ({ page }) => {
  await mockSchoolsApi(page);
  await page.goto("/nl/schools");

  await page.getByLabel("Zoek").fill("Alpha");
  const titles = page.locator('div[role="button"] .truncate');
  await expect(titles).toHaveText(["Alpha VWO"]);
});

test("schools level filters respect hierarchy", async ({ page }) => {
  await mockSchoolsApi(page);
  await page.goto("/nl/schools");

  await page.getByLabel("VWO").check();
  await expect(page.locator('div[role="button"] .truncate')).toHaveText([
    "Alpha VWO",
  ]);

  await page.getByLabel("VWO").uncheck();
  await page.getByLabel("HAVO").check();
  await expect(page.locator('div[role="button"] .truncate')).toHaveText([
    "Beta HAVO/VWO",
    "Epsilon HAVO",
  ]);

  await page.getByLabel("HAVO").uncheck();
  await page.getByLabel("VMBO").check();
  await expect(page.locator('div[role="button"] .truncate')).toHaveText([
    "Zeta VMBO/HAVO",
    "Gamma VMBO",
  ]);

  await page.getByLabel("VMBO").uncheck();
  await page.getByLabel("Praktijk").check();
  await expect(page.locator('div[role="button"] .truncate')).toHaveText([
    "Delta Praktijk",
  ]);
});

test("distance controls use location and zip interactions", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 52.37, longitude: 4.89 });

  let lastSchoolsUrl = "";
  await page.route("**/api/schools**", async (route) => {
    lastSchoolsUrl = route.request().url();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ schools: sortSchools(SAMPLE_SCHOOLS) }),
    });
  });

  await page.route("**/api/geocode-zip**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ lat: 52.371, lon: 4.892 }),
    });
  });

  await page.goto("/nl/schools");
  await page.getByRole("button", { name: /Afstand & fietstijd/i }).click();

  const zipInput = page.getByLabel("Postcode voor afstand");
  const useLocation = page.getByLabel("Gebruik mijn locatie (afstand)");
  const bikeSlider = page.locator('input[type="range"]');

  await useLocation.check();
  await expect(zipInput).toHaveValue("");

  await zipInput.fill("1017AB");
  await expect(useLocation).not.toBeChecked();
  await expect(page.getByText("Postcode wordt gebruikt voor afstand")).toBeVisible();

  await useLocation.check();
  await expect(zipInput).toHaveValue("");
  await expect(useLocation).toBeChecked();

  await expect(bikeSlider).toBeEnabled();
  await expect(page.getByText(/km · ~\d+ min fiets/).first()).toBeVisible();
  expect(lastSchoolsUrl).toContain("lat=");
  expect(lastSchoolsUrl).toContain("lon=");
  expect(lastSchoolsUrl).toContain("bikeMinutes=");
});

test("favorite toggle does not navigate", async ({ page }) => {
  await mockSchoolsApi(page);
  await page.goto("/nl/schools");

  const firstCard = page.locator('div[role="button"]').first();
  const favoriteButton = firstCard.getByRole("button");
  await page.waitForResponse((res) => res.url().includes("/api/profile/favorites") && res.ok());
  await favoriteButton.click();

  await expect(page).toHaveURL(/\/nl\/schools/);
  await expect(favoriteButton).toHaveAttribute("aria-label", "Remove favorite");
});

test("school card click opens details", async ({ page }) => {
  await mockSchoolsApi(page);
  await page.goto("/nl/schools");

  await page.locator('div[role="button"]', { hasText: "Alpha VWO" }).click();
  await expect(page).toHaveURL(/\/nl\/schools\/s1/);
});
