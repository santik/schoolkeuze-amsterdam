import { test, expect } from "@playwright/test";
import {
  ensureProfileLoaded,
  getSchoolCards,
  isProd,
  PROD_PROFILE_ID,
  seedProfileId,
} from "./test-utils";

test.beforeEach(async ({ page }) => {
  await seedProfileId(page);
  await ensureProfileLoaded(page);
});

async function openFirstSchoolDetail(page: Parameters<typeof test>[1]["page"]) {
  if (isProd) {
    const res = await page.request.get("/api/schools?take=1");
    const body = (await res.json()) as { schools?: Array<{ id: string }> };
    const id = body.schools?.[0]?.id;
    const profileId =
      (await page.evaluate(() =>
        localStorage.getItem("schoolkeuze:profile:id:v1")
      )) ?? PROD_PROFILE_ID;
    if (id) {
      await page.goto(
        `/nl/schools/${id}?profileId=${encodeURIComponent(profileId)}`
      );
      await expect(page).toHaveURL(/\/nl\/schools\/[^/]+/);
      return;
    }
  }

  await page.goto("/nl/schools");
  await expect.poll(async () => getSchoolCards(page).count()).toBeGreaterThan(0);
  const firstCard = getSchoolCards(page).first();
  await firstCard.click();
  await expect(page).toHaveURL(/\/nl\/schools\/[^/]+/);
}

async function ensureImpressionReady(
  page: Parameters<typeof test>[1]["page"]
) {
  if (isProd) {
    const heading = page.getByRole("heading", {
      name: /Jouw indruk|Your Impression/i,
    });
    await heading.scrollIntoViewIfNeeded();
    await expect(heading).toBeVisible({ timeout: 15_000 });
    return heading.locator("..");
  }
  const section = page.getByTestId("impression-section");
  await section.scrollIntoViewIfNeeded();
  await expect(section).toBeVisible({ timeout: 15_000 });
  return section;
}

async function setRatingByLabel(
  page: Parameters<typeof test>[1]["page"],
  label: RegExp,
  stars: number
) {
  const row = page.getByText(label).locator("..");
  await row.getByRole("button", { name: new RegExp(`${stars} star`) }).click();
  return row;
}

async function readScorePercents(
  page: Parameters<typeof test>[1]["page"],
  sectionHeading: RegExp
) {
  const section = page.getByRole("heading", { name: sectionHeading }).locator("..");
  const values = await section
    .locator("span")
    .allTextContents()
    .then((texts) => texts.map((t) => t.trim()).filter((t) => t.endsWith("%")));
  return values;
}

test("details page shows core info and exam results", async ({ page }) => {
  await openFirstSchoolDetail(page);

  const hero = page.getByTestId("details-hero");
  if (await hero.count()) {
    await expect(hero).toBeVisible();
    await expect(page.getByTestId("details-name")).toBeVisible();
    await expect(page.getByTestId("details-levels")).toBeVisible();
    await expect(page.getByTestId("details-address")).toBeVisible();
    await expect(page.getByTestId("details-website")).toBeVisible();
    await expect(page.getByTestId("details-student-count")).toBeVisible();
  } else {
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText(/Aantal leerlingen|Student count/i)).toBeVisible();
  }
  await expect(page.getByRole("button", { name: /Add favorite|Remove favorite/i })).toBeVisible();
  await expect(page.getByText(/Terug naar scholen|Back to schools/i)).toHaveCount(0);
  await expect(page.getByText(/Vergelijken|Compare/i)).toHaveCount(0);

  const mapLink = page.getByTestId("details-map-link");
  if (await mapLink.count()) {
    await expect(mapLink).toHaveAttribute("href", /google\.com\/maps/);
  }
  const websiteLink = page.getByTestId("details-website-link");
  if (await websiteLink.count()) {
    await expect(websiteLink).toHaveAttribute("href", /https?:\/\//);
  }

  const examToggle =
    (await page.getByTestId("exam-toggle").count())
      ? page.getByTestId("exam-toggle")
      : page.getByRole("button", { name: /Examenresultaten|Exam results/i });
  await expect(examToggle).toHaveAttribute("aria-expanded", "false");
  await examToggle.click();
  await expect(examToggle).toHaveAttribute("aria-expanded", "true");

  const examTable = page.getByTestId("exam-table");
  const examEmpty = page.getByTestId("exam-empty");
  if (await examTable.count() || await examEmpty.count()) {
    await expect
      .poll(async () => (await examTable.count()) + (await examEmpty.count()))
      .toBeGreaterThan(0);
  } else {
    await expect(
      page.getByText(/Niveau|Level/i)
    ).toBeVisible();
  }
});

test("details page shows impression, notes, and admissions", async ({ page }) => {
  await openFirstSchoolDetail(page);

  if (isProd) {
    await expect(page.getByRole("heading", { name: /Jouw indruk|Your Impression/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Totaalscore|Overall/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Match & leren|Fit/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Sfeer & gebouw|Atmosphere/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Reis & bereikbaarheid|Travel/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Eten & pauzes|Food/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Activiteiten|Activities/i })).toBeVisible();
  } else if (await page.getByTestId("impression-section").count()) {
    await expect(page.getByTestId("impression-section")).toBeVisible();
    await expect(page.getByTestId("impression-overall")).toBeVisible();
    await expect(page.getByTestId("impression-section-fit")).toBeVisible();
    await expect(page.getByTestId("impression-section-atmosphere")).toBeVisible();
    await expect(page.getByTestId("impression-section-travel")).toBeVisible();
    await expect(page.getByTestId("impression-section-food")).toBeVisible();
    await expect(page.getByTestId("impression-section-activities")).toBeVisible();
    const overall = page.getByTestId("impression-overall");
    await expect(
      overall.locator("span.font-medium", { hasText: /Score/i })
    ).toBeVisible();
    await expect(
      overall.locator("span.font-medium", { hasText: /Betrouwbaarheid|Confidence/i })
    ).toBeVisible();
  } else {
    await expect(page.getByRole("heading", { name: /Jouw indruk|Your Impression/i })).toBeVisible();
  }

  const stars = page.getByRole("button", { name: /star/ });
  expect(await stars.count()).toBeGreaterThanOrEqual(5);

  const radios = page.locator('[role="radiogroup"]');
  expect(await radios.count()).toBeGreaterThan(0);

  if (await page.getByTestId("notes-section").count()) {
    await expect(page.getByTestId("notes-section")).toBeVisible();
    await expect(page.getByTestId("notes-textarea")).toBeVisible();
  } else {
    await expect(page.getByRole("heading", { name: /Notities|Notes/i })).toBeVisible();
  }

  if (await page.getByTestId("details-admissions").count()) {
    await expect(page.getByTestId("details-admissions")).toBeVisible();
    const sources = page.getByTestId("admissions-sources");
    if (await sources.count()) {
      await expect(sources.locator("a").first()).toBeVisible();
    }
  } else {
    await expect(page.getByRole("heading", { name: /Toelating|Admissions/i })).toBeVisible();
  }
});

test("details page saves impression and notes", async ({ page }) => {
  await openFirstSchoolDetail(page);

  const profileId = await page.evaluate(() =>
    localStorage.getItem("schoolkeuze:profile:id:v1")
  );
  const schoolId = await page.evaluate(() => {
    const parts = window.location.pathname.split("/");
    return parts[parts.length - 1];
  });

  const impressionSection = await ensureImpressionReady(page);

  const ratingRow = isProd
    ? page.getByText(/Kun je jezelf hier zien|Can you imagine yourself here/i).locator("..")
    : page.getByTestId("rating-canImagineYourself");
  const initialStars = await ratingRow.evaluate((container) => {
    return Array.from(container.querySelectorAll("button")).filter((btn) =>
      btn.className.includes("text-amber-500")
    ).length;
  });
  expect(initialStars).not.toBe(3);
  const impressionRequest = page.waitForRequest(
    (req) =>
      req.url().includes("/api/profile/impression") &&
      req.method() === "PUT",
    { timeout: 15_000 }
  ).catch(() => null);
  if (isProd) {
    await setRatingByLabel(
      page,
      /Kun je jezelf hier zien|Can you imagine yourself here/i,
      3
    );
  } else {
    await page.evaluate(() => {
      const container = document.querySelector('[data-testid="rating-canImagineYourself"]');
      if (!container) return;
      const buttons = Array.from(container.querySelectorAll("button"));
      const target = buttons.find((btn) => (btn.getAttribute("aria-label") || "").includes("3"));
      target?.click();
    });
  }

  await impressionRequest;

  await expect(impressionSection).toBeVisible();
  const toggleRequest = page.waitForRequest(
    (req) =>
      req.url().includes("/api/profile/impression") &&
      req.method() === "PUT",
    { timeout: 15_000 }
  ).catch(() => null);
  if (isProd) {
    const toggleRow = page.getByText(/kantine|canteen/i).locator("..");
    const noOption = toggleRow.getByRole("radio", { name: /Nee|No/i });
    const yesOption = toggleRow.getByRole("radio", { name: /Ja|Yes/i });
    const isYes = await yesOption.getAttribute("aria-checked");
    if (isYes === "true") await noOption.click();
    await yesOption.click();
  } else {
    const toggle = page.getByTestId("toggle-hasCanteen");
    await expect(toggle).toBeVisible();
    const buttons = toggle.locator("button");
    const noOption = buttons.first();
    const yesOption = buttons.last();
    const isYes = await yesOption.getAttribute("aria-checked");
    if (isYes === "true") await noOption.click();
    await yesOption.click();
  }
  await toggleRequest;

  const notesRequest = page.waitForRequest(
    (req) =>
      req.url().includes("/api/profile/notes") &&
      req.method() === "PUT",
    { timeout: 15_000 }
  ).catch(() => null);
  const notes = (await page.getByTestId("notes-textarea").count())
    ? page.getByTestId("notes-textarea")
    : page.getByRole("textbox");
  await notes.fill("");
  await expect(notes).toHaveValue("");
  const note = `Test note ${Date.now()}`;
  await notes.fill(note);

  await notesRequest;

  await page.waitForTimeout(600);

  await page.reload();
  const notesAfterReload = (await page.getByTestId("notes-textarea").count())
    ? page.getByTestId("notes-textarea")
    : page.getByRole("textbox");
  await expect(notesAfterReload).toHaveValue(note);

  await page.waitForTimeout(600);
});

test("impression math matches documented weights", async ({ page, request }) => {
  const mathProfileId = `MathProfile${Date.now()}`;
  await page.addInitScript(
    ([key, value]) => {
      localStorage.setItem(key, value);
    },
    ["schoolkeuze:profile:id:v1", mathProfileId]
  );

  await openFirstSchoolDetail(page);

  if (isProd) {
    const url = new URL(page.url());
    url.searchParams.set("profileId", mathProfileId);
    await page.goto(url.toString());
  }

  const schoolId = await page.evaluate(() => {
    const parts = window.location.pathname.split("/");
    return parts[parts.length - 1];
  });

  await request
    .put("/api/profile/impression", {
      data: { profileId: mathProfileId, schoolId, metrics: {} },
    })
    .catch(() => null);

  if (isProd) {
    await setRatingByLabel(
      page,
      /Kun je jezelf hier zien|Can you imagine yourself here/i,
      5
    );
    await setRatingByLabel(
      page,
      /Indruk van het lesgeven|Teaching impression/i,
      5
    );
  } else {
    const setFiveStars = async (key: string) => {
      await page.evaluate((k) => {
        const container = document.querySelector(`[data-testid="rating-${k}"]`);
        if (!container) return;
        const buttons = Array.from(container.querySelectorAll("button"));
        const target = buttons.find((btn) =>
          (btn.getAttribute("aria-label") || "").includes("5")
        );
        target?.click();
      }, key);
    };

    await setFiveStars("canImagineYourself");
    await setFiveStars("teachingImpression");
  }

  const impressionSection = await ensureImpressionReady(page);
  if (isProd) {
    await expect(
      page.getByRole("heading", { name: /Totaalscore|Overall/i })
    ).toBeVisible();
  } else {
    await expect(page.getByTestId("impression-overall")).toBeVisible();
  }

  if (isProd) {
    await expect
      .poll(async () => readScorePercents(page, /Totaalscore|Overall/i))
      .toEqual(["100%", "20%"]);
    await expect
      .poll(async () => readScorePercents(page, /Match & leren|Fit/i))
      .toEqual(["100%", "71%"]);
  } else {
    const overallValues = async () =>
      page.evaluate(() => {
        const overall = document.querySelector('[data-testid="impression-overall"]');
        if (!overall) return [];
        return Array.from(overall.querySelectorAll("span"))
          .map((s) => s.textContent?.trim() ?? "")
          .filter((t) => t.endsWith("%"));
      });

    await expect
      .poll(async () => overallValues())
      .toEqual(["100%", "20%"]);

    const fitValues = async () =>
      page.evaluate(() => {
        const section = document.querySelector('[data-testid="impression-section-fit"]');
        if (!section) return [];
        return Array.from(section.querySelectorAll("span"))
          .map((s) => s.textContent?.trim() ?? "")
          .filter((t) => t.endsWith("%"));
      });

    await expect
      .poll(async () => fitValues())
      .toEqual(["100%", "71%"]);
  }
});
