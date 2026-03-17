import { test, expect } from "@playwright/test";
import {
  getFavoriteToggle,
  getMapContainer,
  getSchoolCards,
  getSchoolNames,
  getSchoolDistance,
  getSchoolLevelsFromCard,
  getSchoolNameFromCard,
  isProd,
  ensureProfileLoaded,
  seedProfileId,
} from "./test-utils";

type SchoolDTO = {
  id: string;
  name: string;
  street?: string | null;
  houseNumber?: string | null;
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
    street: "Herengracht",
    houseNumber: "1",
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
    street: "Keizersgracht",
    houseNumber: "10",
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
    street: "Kerkstraat",
    houseNumber: "5",
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
    street: "Prinsengracht",
    houseNumber: "20",
    levels: ["Praktijkonderwijs"],
    concepts: ["Praktijk"],
    postalCode: "1014DD",
    city: "Amsterdam",
    lat: 52.367,
    lon: 4.889,
  },
  {
    id: "s5",
    name: "Epsilon HAVO",
    street: "Rozengracht",
    houseNumber: "7",
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
    street: "Haarlemmerdijk",
    houseNumber: "30",
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

function orderGroup(levels: string[]) {
  const set = new Set(levels.map(normalizeLevel));
  const hasVwo = set.has("VWO");
  const hasHavo = set.has("HAVO");
  const hasVmbo = set.has("VMBO");

  if (hasVwo && !hasHavo && !hasVmbo) return 0;
  if (hasVwo && hasHavo && !hasVmbo) return 1;
  if (hasVwo && hasHavo && hasVmbo) return 2;
  if (!hasVwo && hasHavo && hasVmbo) return 3;
  if (!hasVwo && !hasHavo && hasVmbo) return 4;

  return 5;
}

function filterByLevels(schools: SchoolDTO[], selected: string[]) {
  if (!selected.length) return schools;
  const selectedNormalized = Array.from(new Set(selected.map(normalizeLevel)));
  return schools.filter((school) => {
    const levels = school.levels.map(normalizeLevel);
    const levelSet = new Set(levels);
    return selectedNormalized.every((lvl) => levelSet.has(lvl));
  });
}

function sortSchools(schools: SchoolDTO[]) {
  return [...schools].sort((a, b) => {
    const ar = orderGroup(a.levels);
    const br = orderGroup(b.levels);
    if (ar !== br) return ar - br;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
}

async function mockSchoolsApi(page: Parameters<typeof test>[1]["page"]) {
  if (isProd) return;
  await page.route("**/api/schools**", async (route) => {
    const url = new URL(route.request().url());
    const q = url.searchParams.get("q")?.trim().toLowerCase() ?? "";
    const levelsParam = url.searchParams.get("levels") ?? "";
    const levels = levelsParam ? levelsParam.split(",").filter(Boolean) : [];
    const take = Number(url.searchParams.get("take") ?? "0") || 0;

    let results = [...SAMPLE_SCHOOLS];
    if (q) {
      results = results.filter((s) => {
        const haystack = [
          s.name,
          s.street,
          s.houseNumber,
          s.postalCode,
          s.city,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      });
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
  if (isProd) return;
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
  if (isProd) return;
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
  await seedProfileId(page);
  await ensureProfileLoaded(page);
  await mockFavoritesApi(page);
  await mockProfileSettingsApi(page);
});

test("schools page renders filters and defaults", async ({ page }) => {
  if (!isProd) await mockSchoolsApi(page);
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

  if (isProd) {
    await expect(page.getByText(/\d+\s+scholen|\d+\s+schools/i)).toBeVisible();
  } else {
    await expect(page.getByTestId("schools-count")).toBeVisible();
  }
  await expect(page.getByText(/Vergelijken|Compare/i)).toHaveCount(0);
});

test("map popup opens with info button", async ({ page }) => {
  if (!isProd) await mockSchoolsApi(page);
  await page.goto("/nl/schools");

  const mapButton = page.getByRole("button", { name: "Kaart" });
  await mapButton.click();
  await expect(mapButton).toHaveAttribute("aria-expanded", "true");

  await expect(getMapContainer(page)).toBeVisible();
  await expect(page.locator(".leaflet-marker-icon").first()).toBeVisible();

  await page.evaluate(() => {
    const img = document.querySelector(".leaflet-marker-icon") as HTMLElement | null;
    if (img) img.click();
  });

  await page.waitForSelector(".leaflet-popup", { timeout: 20_000 });
  await expect(page.locator(".leaflet-popup-close-button")).toBeVisible();
  await expect(page.getByTestId("map-popup-info")).toBeVisible();
  const infoLink = page.getByTestId("map-popup-info");
  await expect(infoLink).toHaveAttribute("href", /\/schools\//);
});

test("map popup does not open on hover", async ({ page }) => {
  if (!isProd) await mockSchoolsApi(page);
  await page.goto("/nl/schools");

  const mapButton = page.getByRole("button", { name: "Kaart" });
  await mapButton.click();
  await expect(mapButton).toHaveAttribute("aria-expanded", "true");

  await expect(getMapContainer(page)).toBeVisible();
  const markerIcon = page.locator(".leaflet-marker-icon").first();
  await expect(markerIcon).toBeVisible();
  await page.evaluate(() => {
    const marker = document.querySelector(".leaflet-marker-icon");
    if (!marker) return;
    marker.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    marker.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
  });

  await expect(page.locator(".leaflet-popup")).toHaveCount(0);
});

test("map markers reflect selection and favorites", async ({ page, request }) => {
  if (!isProd) await mockSchoolsApi(page);

  if (isProd) {
    const res = await request.get("/api/schools?take=2");
    const body = (await res.json()) as { schools?: Array<{ id: string }> };
    const ids = (body.schools ?? []).map((s) => s.id).filter(Boolean);
    if (ids.length >= 1) {
      await request.put("/api/profile/favorites", {
        data: { profileId: "856ebfdf-ef05-49e2-b22b-0d851944062a", ids },
      });
    }
  }
  await page.goto("/nl/schools");

  const mapButton = page.getByRole("button", { name: "Kaart" });
  await mapButton.click();
  await expect(mapButton).toHaveAttribute("aria-expanded", "true");

  const cards = getSchoolCards(page);
  await expect.poll(async () => cards.count()).toBeGreaterThan(1);

  const firstName = (await getSchoolNames(page).first().textContent())?.trim() ?? "";
  const secondName = (await getSchoolNames(page).nth(1).textContent())?.trim() ?? "";

  if (!isProd) {
    const secondCard = cards.nth(1);
    const favoriteButton = getFavoriteToggle(secondCard);
    await favoriteButton.click();
    await expect(favoriteButton).toHaveAttribute("aria-label", /Remove favorite|Favoriet verwijderen|Verwijder/);
  }

  const firstCard = cards.first();
  await firstCard.scrollIntoViewIfNeeded();
  await firstCard.evaluate((card) => {
    card.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    card.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
  });
  if (isProd) {
    await expect
      .poll(async () => {
        return page.evaluate(() => {
          return Array.from(
            document.querySelectorAll<HTMLImageElement>("img.leaflet-marker-icon")
          ).some((img) => (img.getAttribute("src") || "").includes("red"));
        });
      })
      .toBeTruthy();
  } else {
    await expect
      .poll(async () => {
        return page.evaluate((name) => {
          const img = Array.from(
            document.querySelectorAll<HTMLImageElement>("img.leaflet-marker-icon")
          ).find((node) => node.getAttribute("title") === name);
          return img?.getAttribute("src") ?? "";
        }, firstName);
      })
      .toMatch(/red/i);
  }

  if (isProd) {
    await expect
      .poll(async () => {
        return page.evaluate(() => {
          return Array.from(
            document.querySelectorAll<HTMLImageElement>("img.leaflet-marker-icon")
          ).some((img) => (img.getAttribute("src") || "").includes("yellow"));
        });
      })
      .toBeTruthy();
  } else {
    await expect
      .poll(async () => {
        return page.evaluate((name) => {
          const img = Array.from(
            document.querySelectorAll<HTMLImageElement>("img.leaflet-marker-icon")
          ).find((node) => node.getAttribute("title") === name);
          return img?.getAttribute("src") ?? "";
        }, secondName);
      })
      .toMatch(/yellow/i);
  }
});

test("map shows user location marker when enabled", async ({ page, context }) => {
  if (!isProd) await mockSchoolsApi(page);
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 52.37, longitude: 4.89 });

  await page.goto("/nl/schools");
  await page.getByRole("button", { name: /Afstand & fietstijd/i }).click();
  await page.getByLabel("Gebruik mijn locatie (afstand)").check();

  const mapButton = page.getByRole("button", { name: "Kaart" });
  await mapButton.click();
  await expect(mapButton).toHaveAttribute("aria-expanded", "true");

  const userMarker = page.locator(".leaflet-marker-icon", { hasText: "🧍" });
  await expect(userMarker).toBeVisible();
});

test("schools filters do not overflow on mobile", async ({ page }) => {
  if (!isProd) await mockSchoolsApi(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/nl/schools");

  if (isProd) {
    const input = page.getByLabel("Zoek");
    await expect(input).toBeVisible();
    const fits = await input.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return rect.width <= window.innerWidth + 1;
    });
    expect(fits).toBeTruthy();
  } else {
    const container = page.getByTestId("schools-filters");
    await expect(container).toBeVisible();
    const fits = await container.evaluate(
      (el) => el.scrollWidth - el.clientWidth <= 1
    );
    expect(fits).toBeTruthy();
  }
});

test("schools list sorts by level group and name", async ({ page }) => {
  if (!isProd) await mockSchoolsApi(page);
  await page.goto("/nl/schools");

  if (isProd) {
    await expect
      .poll(async () => getSchoolCards(page).count())
      .toBeGreaterThan(0);
    const cards = getSchoolCards(page);
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);

    const seen: { name: string; group: number }[] = [];
    for (let i = 0; i < count; i += 1) {
      const card = cards.nth(i);
      const name = (await getSchoolNameFromCard(card).textContent())?.trim() ?? "";
      const line = (await getSchoolLevelsFromCard(card).textContent()) ?? "";
      const levelsPart = line.split("·")[0] ?? "";
      const levels = levelsPart
        .split("/")
        .map((lvl) => lvl.trim())
        .filter(Boolean);
      const group = orderGroup(levels);
      seen.push({ name, group });
    }

    expect(seen.length).toBeGreaterThan(1);

    for (let i = 1; i < seen.length; i += 1) {
      expect(seen[i - 1].group).toBeLessThanOrEqual(seen[i].group);
    }

    let idx = 0;
    while (idx < seen.length) {
      const start = idx;
      const group = seen[idx].group;
      while (idx < seen.length && seen[idx].group === group) idx += 1;
      const names = seen.slice(start, idx).map((x) => x.name);
      const sorted = [...names].sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: "base" })
      );
      expect(names).toEqual(sorted);
    }
    return;
  }

  const titles = page.locator('div[role="button"] .truncate');
  await expect.poll(async () => {
    const items = await titles.allTextContents();
    return items.map((t) => t.trim());
  }).toEqual([
    "Alpha VWO",
    "Beta HAVO/VWO",
    "Zeta VMBO/HAVO",
    "Gamma VMBO",
    "Delta Praktijk",
    "Epsilon HAVO",
  ]);
});

test("schools list does not reorder after favoriting", async ({ page }) => {
  if (!isProd) await mockSchoolsApi(page);
  await page.goto("/nl/schools");

  const cards = getSchoolCards(page);
  await expect.poll(async () => cards.count()).toBeGreaterThan(0);
  const before = await cards.locator(".truncate").allTextContents();

  const firstCard = cards.first();
  const favoriteButton = getFavoriteToggle(firstCard);
  const responsePromise = page.waitForResponse(
    (res) =>
      res.url().includes("/api/profile/favorites") &&
      res.request().method() === "PUT"
  ).catch(() => null);
  await favoriteButton.click();
  await responsePromise;

  const after = await cards.locator(".truncate").allTextContents();
  expect(after).toEqual(before);
});

test("schools search filters by text", async ({ page }) => {
  await mockSchoolsApi(page);
  await page.goto("/nl/schools");

  if (isProd) {
    await expect
      .poll(async () => getSchoolCards(page).count())
      .toBeGreaterThan(0);
    const initialTitles = await page
      .locator(isProd ? "main [role=\"button\"] .truncate" : "[data-testid=\"school-name\"]")
      .allTextContents();
    const firstName = initialTitles[0]?.trim() ?? "";
    const token = firstName.split(" ")[0] ?? firstName;
    await page.getByLabel("Zoek").fill(token);
    await expect
      .poll(async () => {
        const titles = await page
          .locator(isProd ? "main [role=\"button\"] .truncate" : "[data-testid=\"school-name\"]")
          .allTextContents();
        return titles.map((t) => t.trim());
      })
      .not.toEqual(initialTitles.map((t) => t.trim()));

    const titles = await page
      .locator(isProd ? "main [role=\"button\"] .truncate" : "[data-testid=\"school-name\"]")
      .allTextContents();
    expect(titles.length).toBeGreaterThan(0);
    const hasToken = titles.some((title) =>
      title.toLowerCase().includes(token.toLowerCase())
    );
    expect(hasToken).toBeTruthy();
    return;
  }

  await page.getByLabel("Zoek").fill("Alpha");
  const titles = page.locator('div[role="button"] .truncate');
  await expect(titles).toHaveText(["Alpha VWO"]);

  await page.getByLabel("Zoek").fill("1014DD");
  await expect(titles).toHaveText(["Delta Praktijk"]);

  await page.getByLabel("Zoek").fill("Kerkstraat");
  await expect(titles).toHaveText(["Gamma VMBO"]);
});

test("schools level filters require all selected levels", async ({ page }) => {
  await mockSchoolsApi(page);
  await page.goto("/nl/schools");

  if (isProd) {
    const cards = getSchoolCards(page);

    await page.getByLabel("VWO").check();
    const vwoLines = await (isProd ? cards.locator(".text-xs") : cards.getByTestId("school-levels")).allTextContents();
    for (const line of vwoLines) {
      const levels = (line.split("·")[0] ?? "").toUpperCase();
      expect(levels).toContain("VWO");
    }

    await page.getByLabel("VWO").uncheck();
    await page.getByLabel("HAVO").check();
    const havoLines = await (isProd ? cards.locator(".text-xs") : cards.getByTestId("school-levels")).allTextContents();
    for (const line of havoLines) {
      const levels = (line.split("·")[0] ?? "").toUpperCase();
      expect(levels).toContain("HAVO");
    }

    await page.getByLabel("HAVO").uncheck();
    await page.getByLabel("VMBO").check();
    const vmboLines = await (isProd ? cards.locator(".text-xs") : cards.getByTestId("school-levels")).allTextContents();
    for (const line of vmboLines) {
      const levels = (line.split("·")[0] ?? "").toUpperCase();
      expect(levels).toContain("VMBO");
    }

    await page.getByLabel("HAVO").check();
    const vmboHavoLines = await (isProd ? cards.locator(".text-xs") : cards.getByTestId("school-levels")).allTextContents();
    for (const line of vmboHavoLines) {
      const levels = (line.split("·")[0] ?? "").toUpperCase();
      expect(levels).toContain("VMBO");
      expect(levels).toContain("HAVO");
    }

    await page.getByLabel("VMBO").uncheck();
    await page.getByLabel("HAVO").uncheck();
    await page.getByLabel("Praktijk").check();
    const praktijkLines = await (isProd ? cards.locator(".text-xs") : cards.getByTestId("school-levels")).allTextContents();
    for (const line of praktijkLines) {
      const levels = (line.split("·")[0] ?? "").toUpperCase();
      expect(levels).toContain("PRAKTIJK");
    }

    return;
  }

  await page.getByLabel("VWO").check();
  await expect(page.locator('div[role="button"] .truncate')).toHaveText([
    "Alpha VWO",
    "Beta HAVO/VWO",
  ]);

  await page.getByLabel("VWO").uncheck();
  await page.getByLabel("HAVO").check();
  await expect.poll(async () => {
    const items = await page.locator('div[role="button"] .truncate').allTextContents();
    return items.map((t) => t.trim());
  }).toEqual([
    "Beta HAVO/VWO",
    "Zeta VMBO/HAVO",
    "Epsilon HAVO",
  ]);

  await page.getByLabel("HAVO").uncheck();
  await page.getByLabel("VMBO").check();
  await expect(page.locator('div[role="button"] .truncate')).toHaveText([
    "Zeta VMBO/HAVO",
    "Gamma VMBO",
  ]);

  await page.getByLabel("HAVO").check();
  await expect.poll(async () => {
    const items = await page.locator('div[role="button"] .truncate').allTextContents();
    return items.map((t) => t.trim());
  }).toEqual([
    "Zeta VMBO/HAVO",
  ]);

  await page.getByLabel("VMBO").uncheck();
  await page.getByLabel("HAVO").uncheck();
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
  if (!isProd) {
    await page.route("**/api/schools**", async (route) => {
      lastSchoolsUrl = route.request().url();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ schools: sortSchools(SAMPLE_SCHOOLS) }),
      });
    });
  }

  if (!isProd) {
    await page.route("**/api/geocode-zip**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ lat: 52.371, lon: 4.892 }),
      });
    });
  }

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
  await expect(getSchoolDistance(page).first()).toBeVisible();
  if (!isProd) {
    expect(lastSchoolsUrl).toContain("lat=");
    expect(lastSchoolsUrl).toContain("lon=");
    expect(lastSchoolsUrl).toContain("bikeMinutes=");
  }
});

test("bike slider changes trigger new bikeMinutes request", async ({ page, context }) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 52.37, longitude: 4.89 });

  let lastUrl = "";
  if (!isProd) {
    await page.route("**/api/schools**", async (route) => {
      lastUrl = route.request().url();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ schools: sortSchools(SAMPLE_SCHOOLS) }),
      });
    });
  }

  await page.goto("/nl/schools");
  await page.getByRole("button", { name: /Afstand & fietstijd/i }).click();

  const useLocation = page.getByLabel("Gebruik mijn locatie (afstand)");
  await useLocation.check();

  const slider = page.locator('input[type="range"]');
  await expect(slider).toBeEnabled();

  const readyRequest = page.waitForRequest(
    (req) => req.url().includes("/api/schools?") && req.url().includes("lat="),
    { timeout: 15_000 }
  ).catch(() => null);
  await readyRequest;

  const requestPromise = page.waitForRequest(
    (req) =>
      req.url().includes("/api/schools?") &&
      req.url().includes("bikeMinutes=15"),
    { timeout: 15_000 }
  ).catch(() => null);

  await slider.focus();
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await expect(slider).toHaveValue("15");
  await requestPromise;

  if (!isProd) {
    expect(lastUrl).toContain("bikeMinutes=15");
  }
});

test("favorite toggle does not navigate", async ({ page }) => {
  if (!isProd) await mockSchoolsApi(page);
  await page.goto("/nl/schools");

  await expect
    .poll(async () => getSchoolCards(page).count())
    .toBeGreaterThan(0);

  const firstCard = getSchoolCards(page).first();
  const favoriteButton = getFavoriteToggle(firstCard);
  const responsePromise = page.waitForResponse(
    (res) =>
      res.url().includes("/api/profile/favorites") &&
      res.request().method() === "PUT"
  );
  const initialLabel = await favoriteButton.getAttribute("aria-label");
  await favoriteButton.click();
  await responsePromise;

  await expect(page).toHaveURL(/\/nl\/schools/);
  await expect
    .poll(async () => favoriteButton.getAttribute("aria-label"))
    .not.toBe(initialLabel);
});

test("school card click opens details", async ({ page }) => {
  if (!isProd) await mockSchoolsApi(page);
  await page.goto("/nl/schools");

  if (isProd) {
    const firstCard = getSchoolCards(page).first();
    await firstCard.click();
    await expect(page).toHaveURL(/\/nl\/schools\/[^/]+/);
    return;
  }

  await page.getByTestId("school-card").filter({ hasText: "Alpha VWO" }).click();
  await expect(page).toHaveURL(/\/nl\/schools\/s1/);
});
