"use client";

import * as React from "react";
import { ExamResults } from "@/components/exam-results";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import type { SchoolPlacementData } from "@/lib/placement-history";
import { calculateImpressionSummary, impressionStorageKey } from "@/lib/impression-score";
import { useProfileId } from "@/lib/useProfileId";

type CompareSchool = {
  id: string;
  name: string;
  levels: string[];
  concepts: string[];
  websiteUrl: string | null;
  size: number | null;
  results: unknown;
  placement: SchoolPlacementData | null;
};

type PlacementSource = {
  academicYear: string;
  sourceLabel: string;
  sourceUrl: string;
};

type ImpressionMetrics = Record<string, unknown>;

export function CompareTableClient({
  schools,
  capacitySource,
  matchingSource,
}: {
  schools: CompareSchool[];
  capacitySource: PlacementSource;
  matchingSource: PlacementSource;
}) {
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
          const score = calculateImpressionSummary(metrics).score;
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
            const score = calculateImpressionSummary(parsed).score;
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
      <table data-testid="compare-table" className="min-w-[720px] w-full text-left text-sm">
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
          <tr data-testid="compare-row-level" className="border-b border-black/5 dark:border-white/10">
            <td className="p-4 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
              {tTable("level")}
            </td>
            {schools.map((s) => (
              <td key={s.id} className="p-4">
                {(s.levels ?? []).join(" / ") || "—"}
              </td>
            ))}
          </tr>
          <tr data-testid="compare-row-passrate" className="border-b border-black/5 dark:border-white/10">
            <td className="p-4 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
              {tTable("passRate")}
            </td>
            {schools.map((s) => (
              <td key={s.id} className="p-4">
                <ExamResults results={s.results} levels={s.levels} compact />
              </td>
            ))}
          </tr>
          <tr data-testid="compare-row-concept" className="border-b border-black/5 dark:border-white/10">
            <td className="p-4 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
              {tTable("concept")}
            </td>
            {schools.map((s) => (
              <td key={s.id} className="p-4">
                {(s.concepts ?? []).join(", ") || "—"}
              </td>
            ))}
          </tr>
          <tr data-testid="compare-row-size" className="border-b border-black/5 dark:border-white/10">
            <td className="p-4 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
              {tTable("size")}
            </td>
            {schools.map((s) => (
              <td key={s.id} className="p-4">
                {typeof s.size === "number" ? s.size.toLocaleString() : "—"}
              </td>
            ))}
          </tr>
          <tr data-testid="compare-row-capacity" className="border-b border-black/5 dark:border-white/10">
            <td className="p-4 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
              {tTable("capacity", { year: capacitySource.academicYear })}
            </td>
            {schools.map((s) => (
              <td key={s.id} className="p-4 align-top text-xs">
                {(s.placement?.capacityGroups.length ?? 0) > 0 ? (
                  <ul className="grid gap-1">
                    {s.placement!.capacityGroups.map((row, index) => (
                      <li key={`${row.profile ?? "regular"}:${index}`}>
                        <span className="font-semibold">{row.capacity}</span>{" "}
                        {row.profile ?? row.pathways.join(", ")}
                      </li>
                    ))}
                  </ul>
                ) : "—"}
              </td>
            ))}
          </tr>
          <tr data-testid="compare-row-matching" className="border-b border-black/5 dark:border-white/10">
            <td className="p-4 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
              {tTable("previousDemand", { year: matchingSource.academicYear })}
            </td>
            {schools.map((s) => (
              <td key={s.id} className="p-4 align-top text-xs">
                {(s.placement?.matchingGroups.length ?? 0) > 0 ? (
                  <ul className="grid gap-1">
                    {s.placement!.matchingGroups.map((row, index) => (
                      <li key={`${row.department}:${index}`}>
                        {row.department}: {row.firstPreferences ?? "—"} / {row.capacity ?? "—"}
                      </li>
                    ))}
                  </ul>
                ) : "—"}
              </td>
            ))}
          </tr>
          <tr data-testid="compare-row-score" className="border-b border-black/5 dark:border-white/10">
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
          <tr data-testid="compare-row-website">
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
