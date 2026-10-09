import { test, expect, type Page } from "@playwright/test";

import openDaysData from "../../data/school-open-days.json";
import schools from "../../data/schools.sample.json";

import { ensureProfileLoaded, isProd, PROD_PROFILE_ID, seedProfileId } from "./test-utils";

import {
  buildOpenDaysSchoolKey,
  splitOpenDays,
  type OpenDaysDataset,
} from "../../src/lib/open-days";

const dataset = openDaysData as OpenDaysDataset;

/** A school the committed dataset still lists an upcoming open day for. */
function schoolWithUpcomingOpenDay() {
  const now = new Date();
  for (const school of schools) {
    const entry = dataset.schools[buildOpenDaysSchoolKey(school)];
    if (entry && splitOpenDays(entry.openDays, now).upcoming.length > 0) {
      return { name: school.name, entry };
    }
  }
  throw new Error("The committed open-day dataset has no upcoming dates left; re-run the ingest.");
}

function schoolWithoutOpenDays() {
  const school = schools.find((candidate) => !dataset.schools[buildOpenDaysSchoolKey(candidate)]);
  if (!school) throw new Error("Every school has open days; pick another fixture.");
  return school.name;
}

async function gotoSchoolByName(page: Page, locale: "nl" | "en", name: string) {
  const res = await page.request.get(`/api/schools?q=${encodeURIComponent(name)}`);
  const body = (await res.json()) as { schools?: Array<{ id: string; name: string }> };
  const match = body.schools?.find((school) => school.name === name);
  expect(match, `no school record for ${name}`).toBeTruthy();

  const query = isProd ? `?profileId=${encodeURIComponent(PROD_PROFILE_ID)}` : "";
  await page.goto(`/${locale}/schools/${match!.id}${query}`);
  await expect(page.getByTestId("details-name")).toHaveText(name);
}

test.beforeEach(async ({ page }) => {
  await seedProfileId(page);
  await ensureProfileLoaded(page);
});

test("detail page lists a school's upcoming open days with a sign-up link", async ({ page }) => {
  const { name, entry } = schoolWithUpcomingOpenDay();
  const upcoming = splitOpenDays(entry.openDays, new Date()).upcoming;

  await gotoSchoolByName(page, "nl", name);

  const section = page.getByTestId("open-days");
  await section.scrollIntoViewIfNeeded();
  await expect(section).toBeVisible();
  await expect(section.getByRole("heading", { name: /Open dagen/i })).toBeVisible();

  const rows = section.getByTestId("open-day");
  await expect(rows).toHaveCount(upcoming.length);

  // Past dates must not leak back into the list.
  const renderedDates = await rows.evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute("data-date") ?? "")
  );
  expect(renderedDates).toEqual(upcoming.map((day) => day.date));
  expect([...renderedDates]).toEqual([...renderedDates].sort());

  const firstSignup = section.getByTestId("open-day-signup").first();
  if (await firstSignup.count()) {
    await expect(firstSignup).toHaveAttribute("href", /^https?:\/\//);
    await expect(firstSignup).toHaveAttribute("target", "_blank");
    await expect(firstSignup).toHaveAttribute("rel", /noopener/);
  }

  await expect(section.getByTestId("open-days-range")).toBeVisible();
  await expect(section.getByTestId("open-days-empty")).toHaveCount(0);

  // The Dutch page shows the Dutch text for the first event.
  await expect(rows.first()).toContainText(upcoming[0]!.description!.nl);
});

test("open days read in English on the English site", async ({ page }) => {
  const { name, entry } = schoolWithUpcomingOpenDay();
  const first = splitOpenDays(entry.openDays, new Date()).upcoming[0]!;

  await gotoSchoolByName(page, "en", name);

  const section = page.getByTestId("open-days");
  await section.scrollIntoViewIfNeeded();
  await expect(section.getByRole("heading", { name: /Open days/i })).toBeVisible();

  const firstRow = section.getByTestId("open-day").first();
  await expect(firstRow).toContainText(first.description!.en);

  // No Dutch source text, and no mention of where the dates came from.
  const sectionText = (await section.innerText()).toLowerCase();
  for (const dutch of ["aanmelden", "inschrijven", "lesjesmiddag", "schoolkeuze020", "schoolkeuze 020"]) {
    expect(sectionText, `"${dutch}" should not appear in the English section`).not.toContain(dutch);
  }
});

test("detail page says so when a school publishes no open days", async ({ page }) => {
  await gotoSchoolByName(page, "en", schoolWithoutOpenDays());

  const section = page.getByTestId("open-days");
  await section.scrollIntoViewIfNeeded();
  await expect(section.getByRole("heading", { name: /Open days/i })).toBeVisible();
  await expect(section.getByTestId("open-days-empty")).toBeVisible();
  await expect(section.getByTestId("open-day")).toHaveCount(0);
});
