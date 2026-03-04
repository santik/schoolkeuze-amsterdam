"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { useProfileId } from "@/lib/useProfileId";

type CompareSchool = {
  id: string;
  name: string;
  levels: string[];
  concepts: string[];
  websiteUrl: string | null;
  size: number | null;
  results: unknown;
};

type ImpressionMetrics = Record<string, unknown>;
type WeightedField = { key: string; weight: number };
type SectionConfig = { weight: number; fields: WeightedField[] };

const scoreSections: SectionConfig[] = [
  {
    weight: 0.28,
    fields: [
      { key: "canImagineYourself", weight: 1.2 },
      { key: "teachingImpression", weight: 1.2 },
      { key: "homeworkLoad", weight: 1 },
    ],
  },
  {
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
    weight: 0.16,
    fields: [
      { key: "bikeRoute", weight: 1 },
      { key: "publicTransportAccess", weight: 1 },
    ],
  },
  {
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
    weight: 0.18,
    fields: [
      { key: "hasProperGym", weight: 1 },
      { key: "hasChoirBandOrchestra", weight: 0.8 },
      { key: "hasSportsTeams", weight: 0.9 },
      { key: "hasClubs", weight: 1 },
    ],
  },
];

function formatPassRate(school: CompareSchool) {
  const results = (school.results as { examens_2023_2024?: unknown } | null)
    ?.examens_2023_2024 as
    | Record<string, { slagingspercentage?: unknown }>
    | null
    | undefined;
  if (!results || typeof results !== "object") return "—";

  const prefer = ["VWO", "HAVO", "VMBO_TL", "VMBO", "VMBO-KL", "VMBO_BL"];
  for (const key of prefer) {
    const p = results[key]?.slagingspercentage;
    if (typeof p === "number" && Number.isFinite(p)) return `${p.toFixed(1)}%`;
  }
  for (const v of Object.values(results)) {
    const p = v?.slagingspercentage;
    if (typeof p === "number" && Number.isFinite(p)) return `${p.toFixed(1)}%`;
  }
  return "—";
}

function impressionStorageKey(profileId: string, schoolId: string) {
  return `schoolkeuze:impression:v1:${profileId}:${schoolId}`;
}

function metricToPercent(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5) {
    return value * 20;
  }
  if (value === "yes") return 100;
  if (value === "no") return 0;
  return null;
}

function weightedScore(metrics: ImpressionMetrics, fields: WeightedField[]): number | null {
  const totalWeight = fields.reduce((acc, field) => acc + field.weight, 0);
  if (totalWeight <= 0) return null;
  let weightedTotal = 0;
  let answeredWeight = 0;
  for (const field of fields) {
    const value = metricToPercent(metrics[field.key]);
    if (value == null) continue;
    weightedTotal += value * field.weight;
    answeredWeight += field.weight;
  }
  if (answeredWeight <= 0) return null;
  return weightedTotal / answeredWeight;
}

function overallImpressionScore(metrics: ImpressionMetrics): number | null {
  const totalSectionWeight = scoreSections.reduce((acc, section) => acc + section.weight, 0);
  if (totalSectionWeight <= 0) return null;

  let totalScore = 0;
  let answeredSectionWeight = 0;
  for (const section of scoreSections) {
    const sectionScore = weightedScore(metrics, section.fields);
    if (sectionScore == null) continue;
    totalScore += sectionScore * section.weight;
    answeredSectionWeight += section.weight;
  }
  if (answeredSectionWeight <= 0) return null;
  return totalScore / answeredSectionWeight;
}

export function CompareTableClient({ schools }: { schools: CompareSchool[] }) {
  const tTable = useTranslations("CompareTable");
  const { profileId, hydrated } = useProfileId();
  const [scoreBySchoolId, setScoreBySchoolId] = React.useState<Map<string, number>>(
    () => new Map()
  );

  React.useEffect(() => {
    if (!hydrated || !profileId || schools.length === 0) {
      setScoreBySchoolId(new Map());
      return;
    }

    let cancelled = false;
    const ids = schools.map((s) => s.id);

    fetch(
      `/api/profile/impression?profileId=${encodeURIComponent(profileId)}&schoolIds=${encodeURIComponent(ids.join(","))}`
    )
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Request failed"))))
      .then((body: { items?: Array<{ schoolId: string; metrics?: unknown }> }) => {
        if (cancelled) return;
        const next = new Map<string, number>();
        for (const item of body.items ?? []) {
          const metrics =
            item.metrics && typeof item.metrics === "object" && !Array.isArray(item.metrics)
              ? (item.metrics as ImpressionMetrics)
              : {};
          const score = overallImpressionScore(metrics);
          if (score != null) next.set(item.schoolId, score);
        }
        setScoreBySchoolId(next);
      })
      .catch(() => {
        if (cancelled) return;
        const next = new Map<string, number>();
        for (const school of schools) {
          try {
            const raw = localStorage.getItem(impressionStorageKey(profileId, school.id));
            if (!raw) continue;
            const parsed = JSON.parse(raw) as ImpressionMetrics;
            const score = overallImpressionScore(parsed);
            if (score != null) next.set(school.id, score);
          } catch {
            // ignore broken local cache
          }
        }
        setScoreBySchoolId(next);
      });

    return () => {
      cancelled = true;
    };
  }, [hydrated, profileId, schools]);

  return (
    <div className="overflow-x-auto rounded-2xl border border-black/5 bg-white dark:border-white/10 dark:bg-white/5">
      <table className="min-w-[720px] w-full text-left text-sm">
        <thead className="border-b border-black/5 dark:border-white/10">
          <tr>
            <th className="p-4 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
              {tTable("property")}
            </th>
            {schools.map((s) => (
              <th key={s.id} className="p-4 font-semibold">
                <Link href={`/schools/${s.id}`} className="hover:underline">
                  {s.name}
                </Link>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-black/5 dark:border-white/10">
            <td className="p-4 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
              {tTable("level")}
            </td>
            {schools.map((s) => (
              <td key={s.id} className="p-4">
                {(s.levels ?? []).join(" / ") || "—"}
              </td>
            ))}
          </tr>
          <tr className="border-b border-black/5 dark:border-white/10">
            <td className="p-4 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
              {tTable("passRate")}
            </td>
            {schools.map((s) => (
              <td key={s.id} className="p-4">
                {formatPassRate(s)}
              </td>
            ))}
          </tr>
          <tr className="border-b border-black/5 dark:border-white/10">
            <td className="p-4 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
              {tTable("concept")}
            </td>
            {schools.map((s) => (
              <td key={s.id} className="p-4">
                {(s.concepts ?? []).join(", ") || "—"}
              </td>
            ))}
          </tr>
          <tr className="border-b border-black/5 dark:border-white/10">
            <td className="p-4 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
              {tTable("size")}
            </td>
            {schools.map((s) => (
              <td key={s.id} className="p-4">
                {typeof s.size === "number" ? s.size.toLocaleString() : "—"}
              </td>
            ))}
          </tr>
          <tr className="border-b border-black/5 dark:border-white/10">
            <td className="p-4 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
              {tTable("score")}
            </td>
            {schools.map((s) => (
              <td key={s.id} className="p-4">
                {scoreBySchoolId.has(s.id)
                  ? `${Math.round(scoreBySchoolId.get(s.id) ?? 0)}%`
                  : "—"}
              </td>
            ))}
          </tr>
          <tr>
            <td className="p-4 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
              {tTable("website")}
            </td>
            {schools.map((s) => (
              <td key={s.id} className="p-4">
                {s.websiteUrl ? (
                  <a href={s.websiteUrl} target="_blank" rel="noreferrer" className="underline">
                    {s.websiteUrl}
                  </a>
                ) : (
                  "—"
                )}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
