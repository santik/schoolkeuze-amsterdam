export type CapacityGroup = {
  profile: string | null;
  capacity: number;
  pathways: string[];
  preselection: boolean;
};

export type MatchingGroup = {
  department: string;
  capacity: number | null;
  firstPreferences: number | null;
  secondPreferences: number | null;
  thirdPreferences: number | null;
  totalPlaced: number | null;
  placedFirstPreference: number | null;
  placedSecondPreference: number | null;
  placedThirdPreference: number | null;
  placedOtherPreference: number | null;
};

export type SchoolPlacementData = {
  capacityGroups: CapacityGroup[];
  matchingGroups: MatchingGroup[];
};

type DatasetSource = {
  academicYear: string;
  status: "preliminary" | "final";
  sourceLabel: string;
  sourceUrl: string;
};

export type PlacementDataset = {
  generatedAt: string;
  capacity: DatasetSource;
  matching: DatasetSource;
  schools: Record<string, SchoolPlacementData>;
};

export function buildPlacementSchoolKey(school: {
  sourceKey?: string | null;
  brin?: string | null;
  name: string;
}): string {
  if (school.sourceKey?.trim()) return school.sourceKey.trim().toLowerCase();
  const brin = school.brin?.trim().toLowerCase() || "no-brin";
  const slug = school.name.toLowerCase().replaceAll(/\W+/g, "-");
  return `sample:${brin}:${slug}`;
}

export function getPlacementDataForSchoolKey(
  dataset: PlacementDataset,
  schoolKey: string
): SchoolPlacementData | null {
  return dataset.schools[schoolKey.toLowerCase()] ?? null;
}

function isNonNegativeInteger(value: number | null) {
  return value == null || (Number.isInteger(value) && value >= 0);
}

function validateSource(label: string, source: DatasetSource, issues: string[]) {
  if (!/^\d{4}-\d{4}$/.test(source.academicYear)) {
    issues.push(`${label}: invalid academicYear`);
  }
  if (!source.sourceLabel.trim()) issues.push(`${label}: missing sourceLabel`);
  try {
    const url = new URL(source.sourceUrl);
    if (url.protocol !== "https:") issues.push(`${label}: sourceUrl must use HTTPS`);
  } catch {
    issues.push(`${label}: invalid sourceUrl`);
  }
}

export function validatePlacementDataset(
  dataset: PlacementDataset,
  knownSchoolNames: string[]
): string[] {
  const issues: string[] = [];
  const known = new Set(knownSchoolNames);

  validateSource("capacity", dataset.capacity, issues);
  validateSource("matching", dataset.matching, issues);

  for (const [schoolKey, school] of Object.entries(dataset.schools)) {
    if (!known.has(schoolKey)) issues.push(`${schoolKey}: no deterministic school mapping`);

    for (const [index, row] of school.capacityGroups.entries()) {
      if (!Number.isInteger(row.capacity) || row.capacity < 0) {
        issues.push(`${schoolKey} capacityGroups[${index}]: invalid capacity`);
      }
      if (row.pathways.length === 0 || row.pathways.some((pathway) => !pathway.trim())) {
        issues.push(`${schoolKey} capacityGroups[${index}]: pathways must not be empty`);
      }
    }

    for (const [index, row] of school.matchingGroups.entries()) {
      if (!row.department.trim()) {
        issues.push(`${schoolKey} matchingGroups[${index}]: missing department`);
      }
      const values = [
        row.capacity,
        row.firstPreferences,
        row.secondPreferences,
        row.thirdPreferences,
        row.totalPlaced,
        row.placedFirstPreference,
        row.placedSecondPreference,
        row.placedThirdPreference,
        row.placedOtherPreference,
      ];
      if (values.some((value) => !isNonNegativeInteger(value))) {
        issues.push(`${schoolKey} matchingGroups[${index}]: invalid count`);
      }
    }
  }

  return issues;
}
