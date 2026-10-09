import openDaysData from "../../data/school-open-days.json";

import {
  buildOpenDaysSchoolKey,
  getOpenDaysForSchoolKey,
  splitOpenDays,
  type OpenDaysDataset,
} from "@/lib/open-days";

const dataset = openDaysData as OpenDaysDataset;

export function getSchoolOpenDays(school: {
  sourceKey?: string | null;
  brin?: string | null;
  name: string;
}) {
  return getOpenDaysForSchoolKey(dataset, buildOpenDaysSchoolKey(school));
}

/** Upcoming open days for a school, relative to the current Amsterdam date. */
export function getUpcomingSchoolOpenDays(
  school: { sourceKey?: string | null; brin?: string | null; name: string },
  now: Date = new Date()
) {
  const entry = getSchoolOpenDays(school);
  if (!entry) return { upcoming: [], past: [] };
  return splitOpenDays(entry.openDays, now);
}

export function getOpenDaysSource() {
  return dataset.source;
}

export function getOpenDaysGeneratedAt() {
  return dataset.generatedAt;
}
