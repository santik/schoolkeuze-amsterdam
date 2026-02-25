"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { useFavorites } from "@/lib/useFavorites";

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

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function normalizeLevel(level: string) {
  const upper = level.trim().toUpperCase();
  if (upper.startsWith("VMBO")) return "VMBO";
  return upper;
}

export function FavoritesClient({
  userLocation,
  adviceLevel,
}: {
  userLocation: { lat: number; lon: number } | null;
  adviceLevel: string;
}) {
  const tFav = useTranslations("Favorites");
  const tSchools = useTranslations("Schools");
  const { ids, setIds, remove, hydrated } = useFavorites();
  const [schools, setSchools] = React.useState<SchoolDTO[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [draggingId, setDraggingId] = React.useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = React.useState<string | null>(null);

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
      const bikeMin = Math.round((km / 15) * 60);
      m.set(id, tSchools("distanceEstimate", { km: km.toFixed(1), minutes: bikeMin }));
    }
    return m;
  }, [distanceById, tSchools]);

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

  const rankedText = React.useMemo(() => {
    if (schools.length === 0) return "";
    return schools
      .map((s, idx) => {
        const address = [
          [s.street, s.houseNumber].filter(Boolean).join(" "),
          [s.postalCode, s.city].filter(Boolean).join(" "),
        ]
          .filter(Boolean)
          .join(", ");
        return `${idx + 1}. ${s.name}${address ? ` — ${address}` : ""}`;
      })
      .join("\n");
  }, [schools]);

  function moveBy(id: string, direction: -1 | 1) {
    setIds((prev) => {
      const from = prev.indexOf(id);
      if (from === -1) return prev;
      const to = from + direction;
      if (to < 0 || to >= prev.length) return prev;
      const copy = [...prev];
      [copy[from], copy[to]] = [copy[to], copy[from]];
      return copy;
    });
  }

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
          · {tFav("dragToRank")} · {tFav("dragHint")}
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
            onClick={() => downloadText("schoolkeuze-ranking.txt", rankedText || "")}
          >
            {tFav("export")}
          </button>
        </div>
      </div>

      <ol className="grid gap-2">
        {schools.map((s, idx) => (
          (() => {
            const advice = normalizeLevel(adviceLevel);
            const offersAdvice = (s.levels ?? []).some((l) => normalizeLevel(l) === advice);
            const showMismatch = Boolean(advice) && !offersAdvice;

            return (
          <li
            key={s.id}
            className={`flex items-center justify-between gap-3 rounded-3xl border bg-white/90 p-4 shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md ${
              showMismatch
                ? "border-amber-300 dark:border-amber-300/30 dark:bg-amber-300/5"
                : "border-indigo-100 dark:border-indigo-300/20 dark:bg-white/5"
            } ${draggingId === s.id ? "opacity-70 ring-2 ring-violet-300/60 dark:ring-violet-300/40" : ""} ${
              dropTargetId === s.id && draggingId !== s.id
                ? "ring-2 ring-sky-300/70 dark:ring-sky-300/50"
                : ""
            }`}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("text/plain", s.id);
              e.dataTransfer.effectAllowed = "move";
              setDraggingId(s.id);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              setDropTargetId(s.id);
            }}
            onDragLeave={() => {
              if (dropTargetId === s.id) setDropTargetId(null);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setDropTargetId(null);
              const draggedId = e.dataTransfer.getData("text/plain");
              if (!draggedId || draggedId === s.id) return;
              setIds((prev) => {
                const from = prev.indexOf(draggedId);
                const to = prev.indexOf(s.id);
                if (from === -1 || to === -1) return prev;
                const copy = [...prev];
                copy.splice(from, 1);
                copy.splice(to, 0, draggedId);
                return copy;
              });
            }}
            onDragEnd={() => {
              setDraggingId(null);
              setDropTargetId(null);
            }}
          >
            <div className="flex min-w-0 items-start gap-3">
              <div
                className="inline-flex h-9 w-9 shrink-0 select-none items-center justify-center rounded-full border border-indigo-300 bg-indigo-50 text-base font-bold tracking-tight text-indigo-900 dark:border-indigo-300/30 dark:bg-indigo-500/10 dark:text-indigo-200"
                title={tFav("dragHandle")}
                aria-label={tFav("dragHandle")}
              >
                ≡
              </div>
              <div className="min-w-0">
              <div className="text-xs font-semibold text-indigo-700 dark:text-indigo-200">
                #{idx + 1}
              </div>
              <div className="truncate font-semibold text-indigo-950 dark:text-indigo-100">{s.name}</div>
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
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {idx > 0 ? (
                <button
                  type="button"
                  className="inline-flex h-9 items-center justify-center rounded-full border border-indigo-300 bg-indigo-50 px-3 text-sm font-semibold text-indigo-900 hover:bg-indigo-100 dark:border-indigo-300/30 dark:bg-indigo-500/10 dark:text-indigo-200 dark:hover:bg-indigo-500/20"
                  onClick={() => moveBy(s.id, -1)}
                  aria-label="Move up"
                >
                  ↑
                </button>
              ) : null}
              {idx < schools.length - 1 ? (
                <button
                  type="button"
                  className="inline-flex h-9 items-center justify-center rounded-full border border-indigo-300 bg-indigo-50 px-3 text-sm font-semibold text-indigo-900 hover:bg-indigo-100 dark:border-indigo-300/30 dark:bg-indigo-500/10 dark:text-indigo-200 dark:hover:bg-indigo-500/20"
                  onClick={() => moveBy(s.id, 1)}
                  aria-label="Move down"
                >
                  ↓
                </button>
              ) : null}
              <Link
                href={`/schools/${s.id}`}
                className="inline-flex h-9 items-center justify-center rounded-full border border-violet-300 bg-violet-50 px-3 text-sm font-semibold text-violet-900 hover:bg-violet-100 dark:border-violet-300/30 dark:bg-violet-500/10 dark:text-violet-200 dark:hover:bg-violet-500/20"
              >
                {tFav("details")}
              </Link>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-rose-300 bg-rose-50 text-base font-semibold leading-none text-rose-900 hover:bg-rose-100 dark:border-rose-300/30 dark:bg-rose-500/10 dark:text-rose-200 dark:hover:bg-rose-500/20"
                onClick={() => remove(s.id)}
                aria-label={tFav("remove")}
              >
                ×
              </button>
            </div>
          </li>
            );
          })()
        ))}
      </ol>
    </div>
  );
}
