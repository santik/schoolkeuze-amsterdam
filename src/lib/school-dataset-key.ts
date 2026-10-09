/**
 * Stable key used to attach scraped datasets (placement history, open days) to
 * a school record. Keeping one rule means every dataset matches schools the
 * same way, whether the record came from the database or the sample file.
 */
export function buildSchoolDatasetKey(school: {
  sourceKey?: string | null;
  brin?: string | null;
  name: string;
}): string {
  if (school.sourceKey?.trim()) return school.sourceKey.trim().toLowerCase();
  const brin = school.brin?.trim().toLowerCase() || "no-brin";
  const slug = school.name.toLowerCase().replaceAll(/\W+/g, "-");
  return `sample:${brin}:${slug}`;
}
