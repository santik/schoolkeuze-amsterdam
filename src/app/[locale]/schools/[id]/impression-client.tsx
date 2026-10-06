"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import { useProfileId } from "@/lib/useProfileId";

import {
  type ImpressionMetrics, type YesNoValue,
  defaultMetrics, sectionConfigs, calculateSummary, calculateImpressionSummary,
  formatPercent, impressionStorageKey, normalizeMetrics,
} from "@/lib/impression-score";

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

  const overallSummary = React.useMemo(() => calculateImpressionSummary(metrics), [metrics]);

  const ratingInput = (key: keyof ImpressionMetrics) => {
    const current = (metrics[key] as number | null) ?? null;
    return (
      <div
        data-testid={`rating-${String(key)}`}
        className="inline-flex w-fit items-center gap-1 py-1"
      >
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
    const isNo = current === "no";
    return (
      <div
        data-testid={`toggle-${String(key)}`}
        role="radiogroup"
        aria-label={String(key)}
        className="inline-flex w-fit items-center gap-0.5 rounded-full border border-black/10 bg-zinc-100 p-0.5 text-[10px] shadow-inner dark:border-white/15 dark:bg-white/10"
      >
        <button
          type="button"
          role="radio"
          aria-checked={isNo}
          onClick={() => setMetric(key, "no" as ImpressionMetrics[typeof key])}
          className={[
            "h-6 min-w-[36px] rounded-full px-2 font-semibold leading-none transition-colors",
            isNo
              ? "bg-red-500 text-white shadow-sm"
              : "bg-white/70 text-zinc-700 hover:bg-white dark:bg-white/10 dark:text-zinc-200 dark:hover:bg-white/15",
          ].join(" ")}
        >
          {t("no")}
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={current == null}
          onClick={() => setMetric(key, null as ImpressionMetrics[typeof key])}
          className={[
            "h-6 min-w-[36px] rounded-full px-2 font-semibold leading-none transition-colors",
            current == null
              ? "bg-zinc-400 text-zinc-900 shadow-sm dark:bg-zinc-600 dark:text-zinc-100"
              : "bg-white/70 text-zinc-700 hover:bg-white dark:bg-white/10 dark:text-zinc-200 dark:hover:bg-white/15",
          ].join(" ")}
          aria-label="Unresolved"
        >
          —
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={isYes}
          onClick={() => setMetric(key, "yes" as ImpressionMetrics[typeof key])}
          className={[
            "h-6 min-w-[36px] rounded-full px-2 font-semibold leading-none transition-colors",
            isYes
              ? "bg-emerald-500 text-white shadow-sm"
              : "bg-white/70 text-zinc-700 hover:bg-white dark:bg-white/10 dark:text-zinc-200 dark:hover:bg-white/15",
          ].join(" ")}
        >
          {t("yes")}
        </button>
      </div>
    );
  };

  if (!hydrated || !profileId) return null;

  return (
    <section
      data-testid="impression-section"
      className="grid gap-3 rounded-3xl border border-black/5 bg-white p-8 dark:border-white/10 dark:bg-white/5"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight">{t("title")}</h2>
        <div className="text-xs text-zinc-600 dark:text-zinc-400">
          {isSaving ? t("saving") : showSaved ? t("saved") : null}
        </div>
      </div>

      <div className="grid gap-3 text-sm">
        <div
          data-testid="impression-overall"
          className="grid gap-2 rounded-2xl border border-black/10 p-3 dark:border-white/10"
        >
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

        <div
          data-testid="impression-section-fit"
          className="grid gap-2 rounded-2xl border border-black/10 p-3 dark:border-white/10"
        >
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

        <div
          data-testid="impression-section-atmosphere"
          className="grid gap-2 rounded-2xl border border-black/10 p-3 dark:border-white/10"
        >
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

        <div
          data-testid="impression-section-travel"
          className="grid gap-2 rounded-2xl border border-black/10 p-3 dark:border-white/10"
        >
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

        <div
          data-testid="impression-section-food"
          className="grid gap-2 rounded-2xl border border-black/10 p-3 dark:border-white/10"
        >
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

        <div
          data-testid="impression-section-activities"
          className="grid gap-2 rounded-2xl border border-black/10 p-3 dark:border-white/10"
        >
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
