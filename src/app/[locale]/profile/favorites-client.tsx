"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { jsPDF } from "jspdf";
import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from "@hello-pangea/dnd";

import { Link, useRouter } from "@/i18n/navigation";
import { bikeMinutesFromKm } from "@/lib/bike";
import { useFavorites } from "@/lib/useFavorites";
import { useProfileId } from "@/lib/useProfileId";

type SchoolDTO = {
  id: string;
  name: string;
  street: string | null;
  houseNumber: string | null;
  postalCode: string | null;
  city: string | null;
  lat?: number | null;
  lon?: number | null;
  levels: string[];
  concepts: string[];
};

type ImpressionMetrics = Record<string, unknown>;

type WeightedField = {
  key: string;
  weight: number;
};

type SectionConfig = {
  weight: number;
  fields: WeightedField[];
};

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

type ExportEntry = {
  rank: number;
  name: string;
  levels: string;
  concepts: string;
  address: string;
  distance: string;
};

function haversineKm(aLat: number, aLon: number, bLat: number, bLon: number) {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLon = ((bLon - aLon) * Math.PI) / 180;
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLon / 2);
  const c = s1 * s1 + Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * s2 * s2;
  const v = 2 * Math.atan2(Math.sqrt(c), Math.sqrt(1 - c));
  return R * v;
}

function downloadPdf(filename: string, title: string, entries: ExportEntry[]) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 48;
  const contentWidth = pageWidth - margin * 2;

  function drawHeader(count: number) {
    doc.setFillColor(36, 54, 114);
    doc.roundedRect(margin, margin - 8, contentWidth, 74, 16, 16, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text(title, margin + 16, margin + 20);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(210, 220, 255);
    doc.text(
      `${new Date().toLocaleDateString()}  •  ${count} schools`,
      margin + 16,
      margin + 40
    );

    doc.setTextColor(28, 31, 45);
  }

  drawHeader(entries.length);

  let y = margin + 84;

  for (const entry of entries) {
    const cardX = margin;
    const cardW = contentWidth;
    const cardH = 92;

    if (y + cardH > pageHeight - margin) {
      doc.addPage();
      drawHeader(entries.length);
      y = margin + 84;
    }

    doc.setFillColor(244, 247, 255);
    doc.roundedRect(cardX, y, cardW, cardH, 12, 12, "F");

    doc.setFillColor(108, 129, 214);
    doc.circle(cardX + 18, y + 18, 10, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(String(entry.rank), cardX + 15.2, y + 21.5);

    doc.setTextColor(35, 43, 79);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(entry.name, cardX + 36, y + 22, { maxWidth: cardW - 48 });

    doc.setFont("helvetica", "normal");
    doc.setTextColor(85, 94, 130);
    doc.setFontSize(10);
    const metaLine = `${entry.levels || "—"} • ${entry.concepts || "—"}`;
    doc.text(metaLine, cardX + 36, y + 39, { maxWidth: cardW - 48 });

    doc.setTextColor(66, 74, 107);
    const addressLines = doc.splitTextToSize(entry.address || "—", cardW - 48);
    doc.text(addressLines.slice(0, 2), cardX + 36, y + 56);

    doc.setTextColor(23, 99, 173);
    doc.text(entry.distance || " ", cardX + 36, y + 78, { maxWidth: cardW - 48 });

    y += cardH + 10;
  }

  doc.save(filename);
}

function normalizeLevel(level: string) {
  const upper = level.trim().toUpperCase();
  if (upper.startsWith("VMBO")) return "VMBO";
  return upper;
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

export function FavoritesClient({
  userLocation,
  adviceLevel,
}: {
  userLocation: { lat: number; lon: number } | null;
  adviceLevel: string;
}) {
  const router = useRouter();
  const tFav = useTranslations("Favorites");
  const tSchools = useTranslations("Schools");
  const { profileId, hydrated: profileHydrated } = useProfileId();
  const { ids, setIds, remove, hydrated } = useFavorites();
  const [schools, setSchools] = React.useState<SchoolDTO[]>([]);
  const [scoreBySchoolId, setScoreBySchoolId] = React.useState<Map<string, number>>(
    () => new Map()
  );
  const [loading, setLoading] = React.useState(false);
  const [draggingId, setDraggingId] = React.useState<string | null>(null);
  const suppressNextClickRef = React.useRef(false);

  const handleDragEnd = React.useCallback(
    (result: DropResult) => {
      setDraggingId(null);
      window.setTimeout(() => {
        suppressNextClickRef.current = false;
      }, 0);

      const destination = result.destination;
      if (!destination) return;
      if (destination.index === result.source.index) return;

      setSchools((prevSchools) => {
        const copy = [...prevSchools];
        const [moved] = copy.splice(result.source.index, 1);
        if (!moved) return prevSchools;
        copy.splice(destination.index, 0, moved);
        const reorderedVisibleIds = copy.map((s) => s.id);
        setIds((prevIds) => {
          const visible = new Set(reorderedVisibleIds);
          const rest = prevIds.filter((id) => !visible.has(id));
          return [...reorderedVisibleIds, ...rest];
        });
        return copy;
      });
    },
    [setIds]
  );

  const distanceById = React.useMemo(() => {
    if (!userLocation) return new Map<string, number>();
    const m = new Map<string, number>();
    for (const s of schools) {
      if (typeof s.lat !== "number" || typeof s.lon !== "number") continue;
      m.set(s.id, haversineKm(userLocation.lat, userLocation.lon, s.lat, s.lon));
    }
    return m;
  }, [schools, userLocation]);

  const distanceLabelById = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const [id, km] of distanceById.entries()) {
      const bikeMin = bikeMinutesFromKm(km);
      m.set(id, tSchools("distanceEstimate", { km: km.toFixed(1), minutes: bikeMin }));
    }
    return m;
  }, [distanceById, tSchools]);

  React.useEffect(() => {
    if (!hydrated || !profileHydrated || !profileId) {
      setScoreBySchoolId(new Map());
      return;
    }
    if (ids.length === 0) {
      setScoreBySchoolId(new Map());
      return;
    }
    let cancelled = false;

    fetch(
      `/api/profile/impression?profileId=${encodeURIComponent(profileId)}&schoolIds=${encodeURIComponent(ids.join(","))}`
    )
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Request failed"))))
      .then((body: { items?: Array<{ schoolId: string; metrics?: unknown }> }) => {
        if (cancelled) return;
        const next = new Map<string, number>();
        const items = Array.isArray(body.items) ? body.items : [];

        for (const item of items) {
          if (!item || typeof item.schoolId !== "string") continue;
          const metrics =
            item.metrics && typeof item.metrics === "object"
              ? (item.metrics as ImpressionMetrics)
              : {};
          const score = overallImpressionScore(metrics);
          if (score != null) next.set(item.schoolId, score);
        }

        for (const schoolId of ids) {
          if (next.has(schoolId)) continue;
          try {
            const raw = localStorage.getItem(impressionStorageKey(profileId, schoolId));
            if (!raw) continue;
            const parsed = JSON.parse(raw) as ImpressionMetrics;
            const score = overallImpressionScore(parsed);
            if (score != null) next.set(schoolId, score);
          } catch {
            // best-effort local fallback
          }
        }
        setScoreBySchoolId(next);
      })
      .catch(() => {
        if (cancelled) return;
        const next = new Map<string, number>();
        for (const schoolId of ids) {
          try {
            const raw = localStorage.getItem(impressionStorageKey(profileId, schoolId));
            if (!raw) continue;
            const parsed = JSON.parse(raw) as ImpressionMetrics;
            const score = overallImpressionScore(parsed);
            if (score != null) next.set(schoolId, score);
          } catch {
            // best-effort local fallback
          }
        }
        setScoreBySchoolId(next);
      });

    return () => {
      cancelled = true;
    };
  }, [hydrated, profileHydrated, profileId, ids]);

  React.useEffect(() => {
    if (!hydrated) return;
    if (ids.length === 0) {
      setSchools([]);
      return;
    }
    let cancelled = false;
    setLoading(true);

    fetch(`/api/compare?ids=${encodeURIComponent(ids.join(","))}`)
      .then((r) => r.json())
      .then((body: { schools: SchoolDTO[] }) => {
        if (cancelled) return;
        // Preserve ranking order
        const byId = new Map(body.schools.map((s) => [s.id, s]));
        setSchools(ids.map((id) => byId.get(id)).filter(Boolean) as SchoolDTO[]);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [hydrated, ids]);

  const exportEntries = React.useMemo<ExportEntry[]>(() => {
    return schools.map((s, idx) => ({
      rank: idx + 1,
      name: s.name,
      levels: (s.levels ?? []).join(" / "),
      concepts: (s.concepts ?? []).slice(0, 3).join(", "),
      address: [
        [s.street, s.houseNumber].filter(Boolean).join(" "),
        [s.postalCode, s.city].filter(Boolean).join(" "),
      ]
        .filter(Boolean)
        .join(", "),
      distance: distanceLabelById.get(s.id) ?? "",
    }));
  }, [schools, distanceLabelById]);

  if (!hydrated) {
    return (
      <div className="rounded-3xl border border-indigo-100 bg-white/85 p-6 text-sm text-indigo-800 dark:border-indigo-300/20 dark:bg-white/5 dark:text-indigo-200">
        {tSchools("loading")}
      </div>
    );
  }

  if (ids.length === 0) {
    return (
      <div className="rounded-3xl border border-indigo-100 bg-white/85 p-6 text-sm text-indigo-800 dark:border-indigo-300/20 dark:bg-white/5 dark:text-indigo-200">
        {tFav("empty")}{" "}
        <Link href="/schools" className="font-semibold underline decoration-indigo-300 underline-offset-2">
          Scholen
        </Link>{" "}
        .
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-indigo-700/90 dark:text-indigo-200/90">
          {loading
            ? tSchools("loading")
            : tFav("count", { count: schools.length })}{" "}
          · {tFav("dragToRank")}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/compare?ids=${encodeURIComponent(ids.join(","))}`}
            className="inline-flex h-9 items-center justify-center rounded-full border border-sky-300 bg-white px-4 text-sm font-semibold text-sky-800 hover:bg-sky-50 dark:border-sky-300/30 dark:bg-sky-500/10 dark:text-sky-200 dark:hover:bg-sky-500/20"
          >
            {tFav("compare")}
          </Link>
          <button
            type="button"
            className="inline-flex h-9 items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-pink-500 px-4 text-sm font-bold text-white hover:from-orange-400 hover:to-pink-400"
            onClick={() => downloadPdf("schoolkeuze-ranking.pdf", "Schoolkeuze ranking", exportEntries)}
          >
            {tFav("export")}
          </button>
        </div>
      </div>

      <DragDropContext
        onDragStart={(start) => {
          suppressNextClickRef.current = true;
          setDraggingId(start.draggableId);
        }}
        onDragEnd={handleDragEnd}
      >
        <Droppable droppableId="favorites-list">
          {(dropProvided) => (
            <ol
              ref={dropProvided.innerRef}
              {...dropProvided.droppableProps}
              className="grid gap-2"
            >
              {schools.map((s, idx) => {
                const advice = normalizeLevel(adviceLevel);
                const offersAdvice = (s.levels ?? []).some(
                  (l) => normalizeLevel(l) === advice
                );
                const showMismatch = Boolean(advice) && !offersAdvice;

                return (
                  <Draggable key={s.id} draggableId={s.id} index={idx}>
                    {(dragProvided, dragSnapshot) => (
                      <li
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        {...dragProvided.dragHandleProps}
                        className={`flex items-center justify-between gap-3 rounded-3xl border bg-white/90 p-4 shadow-sm transition-shadow hover:shadow-md ${
                          showMismatch
                            ? "border-amber-300 dark:border-amber-300/30 dark:bg-amber-300/5"
                            : "border-indigo-100 dark:border-indigo-300/20 dark:bg-white/5"
                        } ${
                          draggingId === s.id || dragSnapshot.isDragging
                            ? "opacity-70 ring-2 ring-violet-300/60 dark:ring-violet-300/40"
                            : ""
                        }`}
                        onClick={() => {
                          if (suppressNextClickRef.current) return;
                          router.push(`/schools/${s.id}`);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            if (suppressNextClickRef.current) return;
                            router.push(`/schools/${s.id}`);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-indigo-700 dark:text-indigo-200">
                            #{idx + 1}
                          </div>
                          <div className="truncate font-semibold text-indigo-950 dark:text-indigo-100">
                            {s.name}
                          </div>
                          {scoreBySchoolId.has(s.id) ? (
                            <div className="mt-1 text-xs font-semibold text-indigo-800 dark:text-indigo-200">
                              {tFav("score")}: {Math.round(scoreBySchoolId.get(s.id) ?? 0)}%
                            </div>
                          ) : null}
                          <div className="mt-1 text-xs text-indigo-700/85 dark:text-indigo-200/80">
                            {(s.levels ?? []).join(" / ") || "—"} ·{" "}
                            {(s.concepts ?? []).slice(0, 3).join(", ") || "—"}
                          </div>
                          {showMismatch ? (
                            <div className="mt-1 text-xs font-medium text-amber-800 dark:text-amber-300">
                              {tFav("levelMismatch", { level: advice })}
                            </div>
                          ) : null}
                          {userLocation && distanceLabelById.has(s.id) ? (
                            <div className="mt-1 text-xs text-indigo-700/85 dark:text-indigo-200/80">
                              {distanceLabelById.get(s.id)}
                            </div>
                          ) : null}
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            type="button"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-rose-300 bg-rose-50 text-base font-semibold leading-none text-rose-900 hover:bg-rose-100 dark:border-rose-300/30 dark:bg-rose-500/10 dark:text-rose-200 dark:hover:bg-rose-500/20"
                            onClick={(e) => {
                              e.stopPropagation();
                              remove(s.id);
                            }}
                            aria-label={tFav("remove")}
                          >
                            ×
                          </button>
                        </div>
                      </li>
                    )}
                  </Draggable>
                );
              })}
              {dropProvided.placeholder}
            </ol>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}
