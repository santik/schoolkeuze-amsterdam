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

export function FavoritesClient({
  userLocation,
}: {
  userLocation: { lat: number; lon: number } | null;
}) {
  const tFav = useTranslations("Favorites");
  const tSchools = useTranslations("Schools");
  const { ids, setIds, remove, hydrated } = useFavorites();
  const [schools, setSchools] = React.useState<SchoolDTO[]>([]);
  const [loading, setLoading] = React.useState(false);

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

  if (!hydrated) {
    return (
      <div className="rounded-2xl border border-black/5 bg-white p-6 text-sm text-zinc-700 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300">
        {tSchools("loading")}
      </div>
    );
  }

  if (ids.length === 0) {
    return (
      <div className="rounded-2xl border border-black/5 bg-white p-6 text-sm text-zinc-700 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300">
        {tFav("empty")}{" "}
        <Link href="/schools" className="underline">
          Scholen
        </Link>{" "}
        .
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-zinc-600 dark:text-zinc-400">
          {loading
            ? tSchools("loading")
            : tFav("count", { count: schools.length })}{" "}
          · {tFav("dragToRank")}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/compare?ids=${encodeURIComponent(ids.join(","))}`}
            className="inline-flex h-9 items-center justify-center rounded-full border border-black/10 px-4 text-sm hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
          >
            {tFav("compare")}
          </Link>
          <button
            type="button"
            className="inline-flex h-9 items-center justify-center rounded-full bg-black px-4 text-sm font-medium text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
            onClick={() => downloadText("schoolkeuze-ranking.txt", rankedText || "")}
          >
            {tFav("export")}
          </button>
        </div>
      </div>

      <ol className="grid gap-2">
        {schools.map((s, idx) => (
          <li
            key={s.id}
            className="flex items-center justify-between gap-3 rounded-2xl border border-black/5 bg-white p-4 dark:border-white/10 dark:bg-white/5"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("text/plain", s.id);
              e.dataTransfer.effectAllowed = "move";
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
            }}
            onDrop={(e) => {
              e.preventDefault();
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
          >
            <div className="min-w-0">
              <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                #{idx + 1}
              </div>
              <div className="truncate font-semibold">{s.name}</div>
              <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                {(s.levels ?? []).join(" / ") || "—"} ·{" "}
                {(s.concepts ?? []).slice(0, 3).join(", ") || "—"}
              </div>
              {userLocation && distanceLabelById.has(s.id) ? (
                <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                  {distanceLabelById.get(s.id)}
                </div>
              ) : null}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Link
                href={`/schools/${s.id}`}
                className="inline-flex h-9 items-center justify-center rounded-full border border-black/10 px-3 text-sm hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
              >
                {tFav("details")}
              </Link>
              <button
                type="button"
                className="inline-flex h-9 items-center justify-center rounded-full border border-black/10 px-3 text-sm hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
                onClick={() => remove(s.id)}
              >
                {tFav("remove")}
              </button>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
