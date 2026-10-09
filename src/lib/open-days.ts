import { buildSchoolDatasetKey } from "@/lib/school-dataset-key";

/** A Dutch source text paired with its English rendering. */
export type LocalizedText = {
  nl: string;
  en: string;
};

export type OpenDayLocale = keyof LocalizedText;

/** One published open day, info evening or trial-lesson afternoon. */
export type OpenDay = {
  /** Calendar date in Amsterdam, as `YYYY-MM-DD`. */
  date: string;
  /** `HH:MM` start, or null when the source published no usable time. */
  startTime: string | null;
  /** `HH:MM` end, or null for a single start time. */
  endTime: string | null;
  /** Source time text kept when it is not a plain range, in both languages. */
  timeNote: LocalizedText | null;
  /** What the school published about the event: type, sign-up requirement, extras. */
  description: LocalizedText | null;
  district: string | null;
  /** Address published for this event; schools with several locations differ. */
  locationNote: LocalizedText | null;
  signupUrl: string | null;
};

export type SchoolOpenDays = {
  name: string;
  sourcePageUrl: string;
  openDays: OpenDay[];
};

export type OpenDaysSource = {
  sourceLabel: string;
  sourceUrl: string;
  firstDate: string;
  lastDate: string;
};

export type OpenDaysDataset = {
  generatedAt: string;
  source: OpenDaysSource;
  schools: Record<string, SchoolOpenDays>;
};

export const buildOpenDaysSchoolKey = buildSchoolDatasetKey;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export function getOpenDaysForSchoolKey(
  dataset: OpenDaysDataset,
  schoolKey: string
): SchoolOpenDays | null {
  return dataset.schools[schoolKey.toLowerCase()] ?? null;
}

/** `YYYY-MM-DD` for the given instant in Amsterdam, so "upcoming" matches local days. */
export function amsterdamDateKey(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Open days that have not passed yet; an event is kept for the whole of its own day. */
export function splitOpenDays(openDays: OpenDay[], now: Date) {
  const today = amsterdamDateKey(now);
  return {
    upcoming: openDays.filter((day) => day.date >= today),
    past: openDays.filter((day) => day.date < today),
  };
}

export function formatOpenDayDate(date: string, locale: string): string {
  const parsed = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat(locale === "nl" ? "nl-NL" : "en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Amsterdam",
  }).format(parsed);
}

/** The language to render an open day in; anything but `nl` reads as English. */
export function openDayLocale(locale: string): OpenDayLocale {
  return locale === "nl" ? "nl" : "en";
}

export function localized(text: LocalizedText | null, locale: OpenDayLocale): string | null {
  return text ? text[locale] : null;
}

/** Display string for an event's time, falling back to the published note. */
export function formatOpenDayTime(day: OpenDay, locale: OpenDayLocale): string | null {
  if (day.startTime && day.endTime) return `${day.startTime} – ${day.endTime}`;
  if (day.startTime) return day.startTime;
  return localized(day.timeNote, locale);
}

function validateSource(source: OpenDaysSource, issues: string[]) {
  if (!source.sourceLabel.trim()) issues.push("source: missing sourceLabel");
  try {
    const url = new URL(source.sourceUrl);
    if (url.protocol !== "https:") issues.push("source: sourceUrl must use HTTPS");
  } catch {
    issues.push("source: invalid sourceUrl");
  }
  for (const [label, value] of [
    ["firstDate", source.firstDate],
    ["lastDate", source.lastDate],
  ] as const) {
    if (!ISO_DATE.test(value)) issues.push(`source: invalid ${label}`);
  }
  if (ISO_DATE.test(source.firstDate) && ISO_DATE.test(source.lastDate)) {
    if (source.firstDate > source.lastDate) issues.push("source: firstDate after lastDate");
  }
}

export function validateOpenDaysDataset(
  dataset: OpenDaysDataset,
  knownSchoolKeys: string[]
): string[] {
  const issues: string[] = [];
  const known = new Set(knownSchoolKeys);

  validateSource(dataset.source, issues);

  for (const [schoolKey, school] of Object.entries(dataset.schools)) {
    if (!known.has(schoolKey)) issues.push(`${schoolKey}: no deterministic school mapping`);
    if (school.openDays.length === 0) issues.push(`${schoolKey}: no open days`);

    try {
      const url = new URL(school.sourcePageUrl);
      if (url.protocol !== "https:") issues.push(`${schoolKey}: sourcePageUrl must use HTTPS`);
    } catch {
      issues.push(`${schoolKey}: invalid sourcePageUrl`);
    }

    let previous = "";
    for (const [index, day] of school.openDays.entries()) {
      const at = `${schoolKey} openDays[${index}]`;
      if (!ISO_DATE.test(day.date) || Number.isNaN(Date.parse(day.date))) {
        issues.push(`${at}: invalid date`);
      } else {
        if (day.date < previous) issues.push(`${at}: dates are not sorted`);
        previous = day.date;
        if (day.date < dataset.source.firstDate || day.date > dataset.source.lastDate) {
          issues.push(`${at}: date outside the published range`);
        }
      }
      for (const [label, value] of [
        ["startTime", day.startTime],
        ["endTime", day.endTime],
      ] as const) {
        if (value !== null && !ISO_TIME.test(value)) issues.push(`${at}: invalid ${label}`);
      }
      if (day.endTime && !day.startTime) issues.push(`${at}: endTime without startTime`);
      if (day.startTime && day.timeNote) {
        issues.push(`${at}: timeNote is only for times that could not be parsed`);
      }
      for (const [label, text] of [
        ["description", day.description],
        ["locationNote", day.locationNote],
        ["timeNote", day.timeNote],
      ] as const) {
        if (text && (!text.nl.trim() || !text.en.trim())) {
          issues.push(`${at}: ${label} is missing a language`);
        }
      }
      if (day.signupUrl) {
        try {
          const url = new URL(day.signupUrl);
          if (!["https:", "http:"].includes(url.protocol)) {
            issues.push(`${at}: signupUrl must be HTTP(S)`);
          }
        } catch {
          issues.push(`${at}: invalid signupUrl`);
        }
      }
    }
  }

  return issues;
}
