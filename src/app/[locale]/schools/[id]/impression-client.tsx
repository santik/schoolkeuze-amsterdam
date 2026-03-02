"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import { useProfileId } from "@/lib/useProfileId";

type RatingValue = 1 | 2 | 3 | 4 | 5;
type YesNoValue = "yes" | "no";

type ImpressionMetrics = {
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

type ScoreSummary = {
  score: number | null;
  confidence: number;
};

const defaultMetrics: ImpressionMetrics = {
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

const sectionConfigs: SectionConfig[] = [
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

function calculateSummary(
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

function formatPercent(value: number | null): string {
  if (value == null) return "—";
  return `${Math.round(value)}%`;
}

function impressionStorageKey(profileId: string, schoolId: string) {
  return `schoolkeuze:impression:v1:${profileId}:${schoolId}`;
}

function normalizeMetrics(raw: unknown): ImpressionMetrics {
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

export function ImpressionClient({ schoolId }: { schoolId: string }) {
  const t = useTranslations("Impression");
  const { profileId, hydrated } = useProfileId();

  const [metrics, setMetrics] = React.useState<ImpressionMetrics>(defaultMetrics);
  const [isSaving, setIsSaving] = React.useState(false);
  const [showSaved, setShowSaved] = React.useState(false);

  const baselineRef = React.useRef<string>(JSON.stringify(defaultMetrics));
  const initializedRef = React.useRef(false);
  const dirtyRef = React.useRef(false);

  React.useEffect(() => {
    if (!hydrated || !profileId) return;
    let cancelled = false;

    fetch(
      `/api/profile/impression?profileId=${encodeURIComponent(profileId)}&schoolId=${encodeURIComponent(schoolId)}`
    )
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Request failed"))))
      .then((body: { metrics?: unknown }) => {
        if (cancelled) return;
        const normalized = normalizeMetrics(body.metrics);
        baselineRef.current = JSON.stringify(normalized);
        initializedRef.current = true;
        dirtyRef.current = false;
        setMetrics(normalized);
        localStorage.setItem(
          impressionStorageKey(profileId, schoolId),
          JSON.stringify(normalized)
        );
      })
      .catch(() => {
        if (cancelled) return;
        let normalized = defaultMetrics;
        try {
          const raw = localStorage.getItem(
            impressionStorageKey(profileId, schoolId)
          );
          if (raw) normalized = normalizeMetrics(JSON.parse(raw));
        } catch {
          normalized = defaultMetrics;
        }
        baselineRef.current = JSON.stringify(normalized);
        initializedRef.current = true;
        dirtyRef.current = false;
        setMetrics(normalized);
      });

    return () => {
      cancelled = true;
    };
  }, [hydrated, profileId, schoolId]);

  React.useEffect(() => {
    if (!hydrated || !profileId) return;
    if (!initializedRef.current) return;
    if (!dirtyRef.current) return;

    const current = JSON.stringify(metrics);
    if (current === baselineRef.current) return;

    setIsSaving(true);
    const timer = window.setTimeout(() => {
      localStorage.setItem(
        impressionStorageKey(profileId, schoolId),
        JSON.stringify(metrics)
      );
      void fetch("/api/profile/impression", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, schoolId, metrics }),
      })
        .catch(() => {
          // fallback is already written to localStorage
        })
        .finally(() => {
          baselineRef.current = JSON.stringify(metrics);
          dirtyRef.current = false;
          setShowSaved(true);
          window.setTimeout(() => setShowSaved(false), 1300);
          setIsSaving(false);
        });
    }, 350);

    return () => {
      window.clearTimeout(timer);
    };
  }, [metrics, hydrated, profileId, schoolId]);

  const setMetric = <K extends keyof ImpressionMetrics>(key: K, value: ImpressionMetrics[K]) => {
    dirtyRef.current = true;
    setMetrics((prev) => ({ ...prev, [key]: value }));
  };

  const sectionSummaries = React.useMemo(() => {
    return sectionConfigs.map((section) => ({
      ...section,
      summary: calculateSummary(metrics, section.fields),
    }));
  }, [metrics]);

  const overallSummary = React.useMemo<ScoreSummary>(() => {
    const totalWeight = sectionConfigs.reduce((acc, section) => acc + section.weight, 0);
    if (totalWeight <= 0) return { score: null, confidence: 0 };

    let weightedScoreTotal = 0;
    let answeredSectionWeight = 0;
    let weightedConfidenceTotal = 0;

    for (const section of sectionSummaries) {
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
  }, [sectionSummaries]);

  const ratingInput = (key: keyof ImpressionMetrics) => {
    const current = (metrics[key] as number | null) ?? null;
    return (
      <div className="inline-flex w-fit items-center gap-1 py-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={`${String(key)}-${n}`}
              type="button"
              onClick={() =>
                setMetric(
                  key,
                  (current === n ? null : n) as ImpressionMetrics[typeof key]
                )
              }
              className={[
                "text-xl leading-none transition-colors",
                current != null && n <= current
                  ? "text-amber-500"
                  : "text-zinc-300 dark:text-zinc-600",
              ].join(" ")}
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
            >
              ★
            </button>
          ))}
      </div>
    );
  };

  const yesNoInput = (key: keyof ImpressionMetrics) => {
    const current = (metrics[key] as YesNoValue | null) ?? null;
    const isYes = current === "yes";
    return (
      <button
        type="button"
        role="switch"
        aria-checked={isYes}
        onClick={() =>
          setMetric(
            key,
            (isYes ? "no" : "yes") as ImpressionMetrics[typeof key]
          )
        }
        className="inline-flex w-fit items-center gap-2 rounded-full border border-black/10 px-2 py-1 text-xs dark:border-white/15"
      >
        <span className={isYes ? "text-zinc-400 dark:text-zinc-500" : ""}>{t("no")}</span>
        <span
          className={[
            "relative inline-flex h-5 w-10 items-center rounded-full transition-colors",
            isYes ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700",
          ].join(" ")}
        >
          <span
            className={[
              "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
              isYes ? "translate-x-5" : "translate-x-1",
            ].join(" ")}
          />
        </span>
        <span className={isYes ? "" : "text-zinc-400 dark:text-zinc-500"}>{t("yes")}</span>
      </button>
    );
  };

  if (!hydrated || !profileId) return null;

  return (
    <section className="grid gap-3 rounded-3xl border border-black/5 bg-white p-8 dark:border-white/10 dark:bg-white/5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight">{t("title")}</h2>
        <div className="text-xs text-zinc-600 dark:text-zinc-400">
          {isSaving ? t("saving") : showSaved ? t("saved") : null}
        </div>
      </div>

      <div className="grid gap-3 text-sm">
        <div className="grid gap-2 rounded-2xl border border-black/10 p-3 dark:border-white/10">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">
              {t("overall")}
            </h3>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-600 dark:text-zinc-300">
              <div>
                <span className="font-medium">{t("scoreLabel")}: </span>
                <span>{formatPercent(overallSummary.score)}</span>
              </div>
              <div>
                <span className="font-medium">{t("confidenceLabel")}: </span>
                <span>{formatPercent(overallSummary.confidence)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-2 rounded-2xl border border-black/10 p-3 dark:border-white/10">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">
              {t("groupFitLearning")}
            </h3>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-600 dark:text-zinc-300">
              <div>
                <span className="font-medium">{t("scoreLabel")}: </span>
                <span>{formatPercent(sectionSummaries[0].summary.score)}</span>
              </div>
              <div>
                <span className="font-medium">{t("confidenceLabel")}: </span>
                <span>{formatPercent(sectionSummaries[0].summary.confidence)}</span>
              </div>
            </div>
          </div>
          <div className="grid gap-1">
            <span>{t("canImagineYourself")}</span>
            {ratingInput("canImagineYourself")}
          </div>
          <div className="grid gap-1">
            <span>{t("teachingImpression")}</span>
            {ratingInput("teachingImpression")}
          </div>
          <div className="grid gap-1">
            <span>{t("homeworkLoad")}</span>
            {ratingInput("homeworkLoad")}
          </div>
        </div>

        <div className="grid gap-2 rounded-2xl border border-black/10 p-3 dark:border-white/10">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">
              {t("groupAtmosphereBuilding")}
            </h3>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-600 dark:text-zinc-300">
              <div>
                <span className="font-medium">{t("scoreLabel")}: </span>
                <span>{formatPercent(sectionSummaries[1].summary.score)}</span>
              </div>
              <div>
                <span className="font-medium">{t("confidenceLabel")}: </span>
                <span>{formatPercent(sectionSummaries[1].summary.confidence)}</span>
              </div>
            </div>
          </div>
          <div className="grid gap-1">
            <span>{t("overallVibe")}</span>
            {ratingInput("overallVibe")}
          </div>
          <div className="grid gap-1">
            <span>{t("buildingVibe")}</span>
            {ratingInput("buildingVibe")}
          </div>
          <div className="grid gap-1">
            <span>{t("buildingModern")}</span>
            {ratingInput("buildingModern")}
          </div>
          <div className="grid gap-1">
            <span>{t("hasLockerForEveryStudent")}</span>
            {yesNoInput("hasLockerForEveryStudent")}
          </div>
          <div className="grid gap-1">
            <span>{t("hasIndoorBreakSpace")}</span>
            {yesNoInput("hasIndoorBreakSpace")}
          </div>
        </div>

        <div className="grid gap-2 rounded-2xl border border-black/10 p-3 dark:border-white/10">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">
              {t("groupTravelAccess")}
            </h3>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-600 dark:text-zinc-300">
              <div>
                <span className="font-medium">{t("scoreLabel")}: </span>
                <span>{formatPercent(sectionSummaries[2].summary.score)}</span>
              </div>
              <div>
                <span className="font-medium">{t("confidenceLabel")}: </span>
                <span>{formatPercent(sectionSummaries[2].summary.confidence)}</span>
              </div>
            </div>
          </div>
          <div className="grid gap-1">
            <span>{t("bikeRoute")}</span>
            {ratingInput("bikeRoute")}
          </div>
          <div className="grid gap-1">
            <span>{t("publicTransportAccess")}</span>
            {ratingInput("publicTransportAccess")}
          </div>
        </div>

        <div className="grid gap-2 rounded-2xl border border-black/10 p-3 dark:border-white/10">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">
              {t("groupFoodBreaks")}
            </h3>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-600 dark:text-zinc-300">
              <div>
                <span className="font-medium">{t("scoreLabel")}: </span>
                <span>{formatPercent(sectionSummaries[3].summary.score)}</span>
              </div>
              <div>
                <span className="font-medium">{t("confidenceLabel")}: </span>
                <span>{formatPercent(sectionSummaries[3].summary.confidence)}</span>
              </div>
            </div>
          </div>
          <div className="grid gap-1">
            <span>{t("hasCanteen")}</span>
            {yesNoInput("hasCanteen")}
          </div>
          <div className="grid gap-1">
            <span>{t("hasHealthyFood")}</span>
            {yesNoInput("hasHealthyFood")}
          </div>
          <div className="grid gap-1">
            <span>{t("canBringOwnLunch")}</span>
            {yesNoInput("canBringOwnLunch")}
          </div>
          <div className="grid gap-1">
            <span>{t("foodQuality")}</span>
            {ratingInput("foodQuality")}
          </div>
          <div className="grid gap-1">
            <span>{t("foodPrice")}</span>
            {ratingInput("foodPrice")}
          </div>
        </div>

        <div className="grid gap-2 rounded-2xl border border-black/10 p-3 dark:border-white/10">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">
              {t("groupActivitiesSports")}
            </h3>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-600 dark:text-zinc-300">
              <div>
                <span className="font-medium">{t("scoreLabel")}: </span>
                <span>{formatPercent(sectionSummaries[4].summary.score)}</span>
              </div>
              <div>
                <span className="font-medium">{t("confidenceLabel")}: </span>
                <span>{formatPercent(sectionSummaries[4].summary.confidence)}</span>
              </div>
            </div>
          </div>
          <div className="grid gap-1">
            <span>{t("hasProperGym")}</span>
            {yesNoInput("hasProperGym")}
          </div>
          <div className="grid gap-1">
            <span>{t("hasChoirBandOrchestra")}</span>
            {yesNoInput("hasChoirBandOrchestra")}
          </div>
          <div className="grid gap-1">
            <span>{t("hasSportsTeams")}</span>
            {yesNoInput("hasSportsTeams")}
          </div>
          <div className="grid gap-1">
            <span>{t("hasClubs")}</span>
            {ratingInput("hasClubs")}
          </div>
        </div>
      </div>
    </section>
  );
}
