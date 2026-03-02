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
  hasClubs: YesNoValue | null;
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
        <label className="grid gap-1">
          <span>{t("canImagineYourself")}</span>
          {ratingInput("canImagineYourself")}
        </label>
        <label className="grid gap-1">
          <span>{t("overallVibe")}</span>
          {ratingInput("overallVibe")}
        </label>
        <label className="grid gap-1">
          <span>{t("teachingImpression")}</span>
          {ratingInput("teachingImpression")}
        </label>
        <label className="grid gap-1">
          <span>{t("bikeRoute")}</span>
          {ratingInput("bikeRoute")}
        </label>

        <label className="grid gap-1">
          <span>{t("extracurricularMatch")}</span>
          {yesNoInput("extracurricularMatch")}
        </label>
        <label className="grid gap-1">
          <span>{t("hasLockerForEveryStudent")}</span>
          {yesNoInput("hasLockerForEveryStudent")}
        </label>
        <label className="grid gap-1">
          <span>{t("hasIndoorBreakSpace")}</span>
          {yesNoInput("hasIndoorBreakSpace")}
        </label>
        <label className="grid gap-1">
          <span>{t("hasProperGym")}</span>
          {yesNoInput("hasProperGym")}
        </label>

        <label className="grid gap-1">
          <span>{t("buildingModern")}</span>
          {ratingInput("buildingModern")}
        </label>
        <label className="grid gap-1">
          <span>{t("buildingVibe")}</span>
          {ratingInput("buildingVibe")}
        </label>

        <label className="grid gap-1">
          <span>{t("hasCanteen")}</span>
          {yesNoInput("hasCanteen")}
        </label>
        <label className="grid gap-1">
          <span>{t("hasHealthyFood")}</span>
          {yesNoInput("hasHealthyFood")}
        </label>
        <label className="grid gap-1">
          <span>{t("publicTransportAccess")}</span>
          {ratingInput("publicTransportAccess")}
        </label>
        <label className="grid gap-1">
          <span>{t("canBringOwnLunch")}</span>
          {yesNoInput("canBringOwnLunch")}
        </label>
        <label className="grid gap-1">
          <span>{t("foodQuality")}</span>
          {ratingInput("foodQuality")}
        </label>
        <label className="grid gap-1">
          <span>{t("foodPrice")}</span>
          {ratingInput("foodPrice")}
        </label>
        <label className="grid gap-1">
          <span>{t("homeworkLoad")}</span>
          {ratingInput("homeworkLoad")}
        </label>

        <label className="grid gap-1">
          <span>{t("hasChoirBandOrchestra")}</span>
          {yesNoInput("hasChoirBandOrchestra")}
        </label>
        <label className="grid gap-1">
          <span>{t("hasSportsTeams")}</span>
          {yesNoInput("hasSportsTeams")}
        </label>
        <label className="grid gap-1">
          <span>{t("hasClubs")}</span>
          {yesNoInput("hasClubs")}
        </label>
      </div>
    </section>
  );
}
