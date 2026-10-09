import assert from "node:assert/strict";
import test from "node:test";

import openDaysData from "../../data/school-open-days.json";
import schools from "../../data/schools.sample.json";

import {
  amsterdamDateKey,
  buildOpenDaysSchoolKey,
  formatOpenDayTime,
  getOpenDaysForSchoolKey,
  localized,
  openDayLocale,
  splitOpenDays,
  validateOpenDaysDataset,
  type OpenDay,
  type OpenDaysDataset,
} from "../../src/lib/open-days";

function openDay(overrides: Partial<OpenDay> = {}): OpenDay {
  return {
    date: "2027-01-13",
    startTime: "15:30",
    endTime: "19:00",
    timeNote: null,
    description: { nl: "Open dag.", en: "Open day." },
    district: "Oost",
    locationNote: { nl: "C. van Eesterenlaan 50", en: "C. van Eesterenlaan 50" },
    signupUrl: "https://example.test/open-dag",
    ...overrides,
  };
}

const dataset: OpenDaysDataset = {
  generatedAt: "2026-10-08T20:00:00+00:00",
  source: {
    sourceLabel: "Schoolkeuze 020 – open dagen",
    sourceUrl: "https://example.test/open-dagen/",
    firstDate: "2026-10-24",
    lastDate: "2027-03-23",
  },
  schools: {
    "sample:00aa:barlaeus-gymnasium": {
      name: "Barlaeus Gymnasium",
      sourcePageUrl: "https://example.test/scholen/barlaeus-gymnasium/",
      openDays: [openDay({ date: "2026-11-25" }), openDay({ date: "2027-01-13" })],
    },
  },
};

test("school keys follow the shared dataset rule", () => {
  assert.equal(
    buildOpenDaysSchoolKey({ brin: "00AA", name: "Barlaeus Gymnasium" }),
    "sample:00aa:barlaeus-gymnasium"
  );
  assert.equal(
    buildOpenDaysSchoolKey({ sourceKey: "DUO:00AA", brin: "ZZ", name: "Other" }),
    "duo:00aa"
  );
});

test("lookup is case-insensitive and misses return null", () => {
  assert.equal(
    getOpenDaysForSchoolKey(dataset, "SAMPLE:00AA:BARLAEUS-GYMNASIUM")?.openDays.length,
    2
  );
  assert.equal(getOpenDaysForSchoolKey(dataset, "sample:zz:nope"), null);
});

test("an open day stays upcoming for the whole of its own Amsterdam day", () => {
  const days = dataset.schools["sample:00aa:barlaeus-gymnasium"]!.openDays;

  // 00:30 Amsterdam time on the day of the second event is still 2027-01-12 in UTC.
  const duringEventDay = new Date("2027-01-12T23:30:00Z");
  assert.equal(amsterdamDateKey(duringEventDay), "2027-01-13");
  const onTheDay = splitOpenDays(days, duringEventDay);
  assert.deepEqual(
    onTheDay.upcoming.map((day) => day.date),
    ["2027-01-13"]
  );
  assert.equal(onTheDay.past.length, 1);

  const afterSeason = splitOpenDays(days, new Date("2027-06-01T10:00:00Z"));
  assert.deepEqual(afterSeason.upcoming, []);
  assert.equal(afterSeason.past.length, 2);
});

test("time display prefers the parsed range and falls back to the published note", () => {
  const note = { nl: "10.00 en 12.30 uur", en: "10:00 and 12:30" };

  assert.equal(formatOpenDayTime(openDay(), "nl"), "15:30 – 19:00");
  assert.equal(formatOpenDayTime(openDay({ endTime: null }), "en"), "15:30");
  assert.equal(
    formatOpenDayTime(openDay({ startTime: null, endTime: null, timeNote: note }), "nl"),
    "10.00 en 12.30 uur"
  );
  assert.equal(
    formatOpenDayTime(openDay({ startTime: null, endTime: null, timeNote: note }), "en"),
    "10:00 and 12:30"
  );
  assert.equal(
    formatOpenDayTime(openDay({ startTime: null, endTime: null, timeNote: null }), "en"),
    null
  );
});

test("every locale resolves, and anything but nl reads as English", () => {
  assert.equal(openDayLocale("nl"), "nl");
  assert.equal(openDayLocale("en"), "en");
  assert.equal(openDayLocale("de"), "en");
  assert.equal(localized({ nl: "Open dag", en: "Open day" }, "nl"), "Open dag");
  assert.equal(localized({ nl: "Open dag", en: "Open day" }, "en"), "Open day");
  assert.equal(localized(null, "en"), null);
});

test("validation rejects unmapped schools, bad dates, times and URLs", () => {
  const invalid: OpenDaysDataset = {
    ...dataset,
    source: { ...dataset.source, sourceUrl: "http://example.test/open-dagen/" },
    schools: {
      "sample:unmapped": {
        name: "Unmapped",
        sourcePageUrl: "not-a-url",
        openDays: [
          openDay({ date: "13-01-2027" }),
          openDay({ date: "2027-01-13", startTime: "25:00" }),
          openDay({ date: "2026-01-13" }),
          openDay({ date: "2027-02-01", startTime: null, endTime: "19:00" }),
          openDay({
            date: "2027-02-02",
            timeNote: { nl: "15.30 - 19.00 uur", en: "15:30 - 19:00" },
          }),
          openDay({ date: "2027-02-04", description: { nl: "Open dag.", en: "  " } }),
          openDay({ date: "2027-02-03", signupUrl: "javascript:alert(1)" }),
        ],
      },
      "sample:00aa:barlaeus-gymnasium": {
        name: "Barlaeus Gymnasium",
        sourcePageUrl: "https://example.test/scholen/barlaeus-gymnasium/",
        openDays: [],
      },
    },
  };

  const issues = validateOpenDaysDataset(invalid, ["sample:00aa:barlaeus-gymnasium"]);
  const joined = issues.join("\n");
  for (const expected of [
    "sourceUrl must use HTTPS",
    "sample:unmapped: no deterministic school mapping",
    "invalid sourcePageUrl",
    "invalid date",
    "invalid startTime",
    "date outside the published range",
    "endTime without startTime",
    "timeNote is only for times that could not be parsed",
    "description is missing a language",
    "signupUrl must be HTTP(S)",
    "sample:00aa:barlaeus-gymnasium: no open days",
  ]) {
    assert.ok(joined.includes(expected), `missing issue: ${expected}\n${joined}`);
  }
});

test("validation flags unsorted open days", () => {
  const unsorted: OpenDaysDataset = {
    ...dataset,
    schools: {
      "sample:00aa:barlaeus-gymnasium": {
        name: "Barlaeus Gymnasium",
        sourcePageUrl: "https://example.test/scholen/barlaeus-gymnasium/",
        openDays: [openDay({ date: "2027-01-13" }), openDay({ date: "2026-11-25" })],
      },
    },
  };
  assert.ok(
    validateOpenDaysDataset(unsorted, ["sample:00aa:barlaeus-gymnasium"]).some((issue) =>
      issue.includes("dates are not sorted")
    )
  );
});

test("committed Schoolkeuze 020 dataset maps cleanly onto our schools", () => {
  const actual = openDaysData as OpenDaysDataset;
  const schoolKeys = schools.map((school) => buildOpenDaysSchoolKey(school));

  assert.deepEqual(validateOpenDaysDataset(actual, schoolKeys), []);

  const total = Object.values(actual.schools).reduce(
    (sum, entry) => sum + entry.openDays.length,
    0
  );
  assert.ok(total > 150, `expected a full season of open days, got ${total}`);
  assert.ok(Object.keys(actual.schools).length > 50);

  const texts = Object.values(actual.schools).flatMap((entry) =>
    entry.openDays.flatMap((day) => [day.description, day.locationNote, day.timeNote])
  );
  const present = texts.filter((text) => text !== null);
  assert.ok(present.length > 300);
  for (const text of present) {
    assert.ok(text.nl.trim().length > 0 && text.en.trim().length > 0);
  }
  // Dutch-only prose must not leak onto the English side.
  const dutchGiveaways = /\b(aanmelden|inschrijven|lesjes|middag|avond|schoolwebsite|niet nodig)\b/i;
  const untranslated = present
    .map((text) => text.en)
    .filter((english) => dutchGiveaways.test(english));
  assert.deepEqual(untranslated, []);

  // Spot-check a school whose open days were read off the source page by hand.
  const ignatius = actual.schools["sample:01et:st-ignatiusgymnasium"];
  assert.deepEqual(
    ignatius?.openDays.map((day) => [day.date, day.startTime, day.endTime]),
    [
      ["2027-02-16", "18:00", "21:00"],
      ["2027-02-17", "15:00", "18:00"],
      ["2027-02-18", "14:00", "16:00"],
    ]
  );
  const kairos = actual.schools["sample:17vf:kairos-college"]?.openDays[0];
  assert.equal(kairos?.date, "2026-10-24");
  assert.deepEqual(kairos?.description, {
    nl: "Open dag met vast programma. Aanmelden is verplicht.",
    en: "Open day with a fixed programme. Registration is required.",
  });
});
