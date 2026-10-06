export type RatingValue = 1 | 2 | 3 | 4 | 5;
export type YesNoValue = "yes" | "no";

export type ImpressionMetrics = {
  canImagineYourself: RatingValue | null;
  overallVibe: RatingValue | null;
  teachingImpression: RatingValue | null;
  bikeRoute: RatingValue | null;
  extracurricularMatch: YesNoValue | null;
  hasLockerForEveryStudent: YesNoValue | null;
  hasIndoorBreakSpace: YesNoValue | null;
  hasProperGym: YesNoValue | null;
  buildingModern: RatingValue | null;
  buildingVibe: RatingValue | null;
  hasCanteen: YesNoValue | null;
  hasHealthyFood: YesNoValue | null;
  publicTransportAccess: RatingValue | null;
  canBringOwnLunch: YesNoValue | null;
  foodQuality: RatingValue | null;
  foodPrice: RatingValue | null;
  homeworkLoad: RatingValue | null;
  hasChoirBandOrchestra: YesNoValue | null;
  hasSportsTeams: YesNoValue | null;
  hasClubs: RatingValue | null;
};

type MetricKey = keyof ImpressionMetrics;

type WeightedField = {
  key: MetricKey;
  weight: number;
};

type SectionConfig = {
  id: string;
  titleKey:
    | "groupFitLearning"
    | "groupAtmosphereBuilding"
    | "groupTravelAccess"
    | "groupFoodBreaks"
    | "groupActivitiesSports";
  weight: number;
  fields: WeightedField[];
};

export type ScoreSummary = {
  score: number | null;
  confidence: number;
};

export const defaultMetrics: ImpressionMetrics = {
  canImagineYourself: null,
  overallVibe: null,
  teachingImpression: null,
  bikeRoute: null,
  extracurricularMatch: null,
  hasLockerForEveryStudent: null,
  hasIndoorBreakSpace: null,
  hasProperGym: null,
  buildingModern: null,
  buildingVibe: null,
  hasCanteen: null,
  hasHealthyFood: null,
  publicTransportAccess: null,
  canBringOwnLunch: null,
  foodQuality: null,
  foodPrice: null,
  homeworkLoad: null,
  hasChoirBandOrchestra: null,
  hasSportsTeams: null,
  hasClubs: null,
};

export const sectionConfigs: SectionConfig[] = [
  {
    id: "fit-learning",
    titleKey: "groupFitLearning",
    weight: 0.28,
    fields: [
      { key: "canImagineYourself", weight: 1.2 },
      { key: "teachingImpression", weight: 1.2 },
      { key: "homeworkLoad", weight: 1 },
    ],
  },
  {
    id: "atmosphere-building",
    titleKey: "groupAtmosphereBuilding",
    weight: 0.24,
    fields: [
      { key: "overallVibe", weight: 1.2 },
      { key: "buildingVibe", weight: 1.1 },
      { key: "buildingModern", weight: 1 },
      { key: "hasLockerForEveryStudent", weight: 0.8 },
      { key: "hasIndoorBreakSpace", weight: 0.8 },
    ],
  },
  {
    id: "travel-access",
    titleKey: "groupTravelAccess",
    weight: 0.16,
    fields: [
      { key: "bikeRoute", weight: 1 },
      { key: "publicTransportAccess", weight: 1 },
    ],
  },
  {
    id: "food-breaks",
    titleKey: "groupFoodBreaks",
    weight: 0.14,
    fields: [
      { key: "hasCanteen", weight: 0.9 },
      { key: "hasHealthyFood", weight: 1 },
      { key: "canBringOwnLunch", weight: 0.8 },
      { key: "foodQuality", weight: 1 },
      { key: "foodPrice", weight: 0.9 },
    ],
  },
  {
    id: "activities-sports",
    titleKey: "groupActivitiesSports",
    weight: 0.18,
    fields: [
      { key: "hasProperGym", weight: 1 },
      { key: "hasChoirBandOrchestra", weight: 0.8 },
      { key: "hasSportsTeams", weight: 0.9 },
      { key: "hasClubs", weight: 1 },
    ],
  },
];

function metricToPercent(value: ImpressionMetrics[MetricKey]): number | null {
  if (value == null) return null;
  if (typeof value === "number") return value * 20;
  return value === "yes" ? 100 : 0;
}

export function calculateSummary(
  metrics: ImpressionMetrics,
  fields: WeightedField[]
): ScoreSummary {
  const totalWeight = fields.reduce((acc, field) => acc + field.weight, 0);
  if (totalWeight <= 0) {
    return { score: null, confidence: 0 };
  }

  let answeredWeight = 0;
  let weightedTotal = 0;

  for (const field of fields) {
    const score = metricToPercent(metrics[field.key]);
    if (score == null) continue;
    answeredWeight += field.weight;
    weightedTotal += score * field.weight;
  }

  const confidence = (answeredWeight / totalWeight) * 100;
  if (answeredWeight <= 0) {
    return { score: null, confidence };
  }

  const score = weightedTotal / answeredWeight;
  return { score, confidence };
}

export function formatPercent(value: number | null): string {
  if (value == null) return "—";
  return `${Math.round(value)}%`;
}

export function impressionStorageKey(profileId: string, schoolId: string) {
  return `schoolkeuze:impression:v1:${profileId}:${schoolId}`;
}

export function normalizeMetrics(raw: unknown): ImpressionMetrics {
  if (!raw || typeof raw !== "object") return defaultMetrics;
  const src = raw as Record<string, unknown>;
  const next = { ...defaultMetrics };

  for (const key of Object.keys(defaultMetrics) as Array<keyof ImpressionMetrics>) {
    const value = src[key as string];
    if (value == null) {
      (next as Record<string, unknown>)[key] = null;
      continue;
    }
    if (
      typeof value === "number" &&
      Number.isInteger(value) &&
      value >= 1 &&
      value <= 5
    ) {
      (next as Record<string, unknown>)[key] = value as RatingValue;
      continue;
    }
    if (value === "yes" || value === "no") {
      (next as Record<string, unknown>)[key] = value;
      continue;
    }
    (next as Record<string, unknown>)[key] = null;
  }

  return next;
}


export function calculateImpressionSummary(metrics: unknown): ScoreSummary {
    const totalWeight = sectionConfigs.reduce((acc, section) => acc + section.weight, 0);
    if (totalWeight <= 0) return { score: null, confidence: 0 };

    let weightedScoreTotal = 0;
    let answeredSectionWeight = 0;
    let weightedConfidenceTotal = 0;

    for (const section of sectionConfigs.map(section => ({ ...section, summary: calculateSummary(normalizeMetrics(metrics), section.fields) }))) {
      weightedConfidenceTotal += section.summary.confidence * section.weight;
      if (section.summary.score == null) continue;
      answeredSectionWeight += section.weight;
      weightedScoreTotal += section.summary.score * section.weight;
    }

    const confidence = weightedConfidenceTotal / totalWeight;
    if (answeredSectionWeight <= 0) {
      return { score: null, confidence };
    }
    const score = weightedScoreTotal / answeredSectionWeight;
    return { score, confidence };
}
