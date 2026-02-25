"use client";

import dynamic from "next/dynamic";
import * as React from "react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { useFavorites } from "@/lib/useFavorites";

type SchoolDTO = {
  id: string;
  name: string;
  brin: string | null;
  websiteUrl: string | null;
  street: string | null;
  houseNumber: string | null;
  postalCode: string | null;
  city: string | null;
  lat: number | null;
  lon: number | null;
  levels: string[];
  concepts: string[];
  denomination: string | null;
};

const SchoolsMap = dynamic(() => import("@/components/schools-map"), {
  ssr: false,
  loading: () => (
    <div className="h-[420px] w-full animate-pulse rounded-3xl bg-sky-100 dark:bg-sky-500/20" />
  ),
});

function buildQuery(params: Record<string, string | number | string[] | undefined>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) continue;
    if (Array.isArray(v)) {
      if (v.length === 0) continue;
      q.set(k, v.join(','));
    } else {
      const s = String(v).trim();
      if (!s) continue;
      q.set(k, s);
    }
  }
  return q.toString();
}

function haversineKm(aLat: number, aLon: number, bLat: number, bLon: number) {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLon = ((bLon - aLon) * Math.PI) / 180;
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLon / 2);
  const c =
    s1 * s1 +
    Math.cos((aLat * Math.PI) / 180) *
    Math.cos((bLat * Math.PI) / 180) *
    s2 *
    s2;
  const v = 2 * Math.atan2(Math.sqrt(c), Math.sqrt(1 - c));
  return R * v;
}

export function SchoolsExplorer() {
  const t = useTranslations("Schools");
  const { has, toggle } = useFavorites();

  const [q, setQ] = React.useState("");
  const [selectedLevels, setSelectedLevels] = React.useState<string[]>([]);
  const [concept, setConcept] = React.useState("");
  const [postalCode, setPostalCode] = React.useState("");
  const [bikeMinutes, setBikeMinutes] = React.useState(30);
  const [useMyLocation, setUseMyLocation] = React.useState(false);
  const [lat, setLat] = React.useState<number | undefined>(undefined);
  const [lon, setLon] = React.useState<number | undefined>(undefined);

  const [schools, setSchools] = React.useState<SchoolDTO[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [compareIds, setCompareIds] = React.useState<string[]>([]);

  const sortedSchools = React.useMemo(() => {
    const normalize = (lvl: string) => (lvl.toUpperCase().startsWith("VMBO") ? "VMBO" : lvl.toUpperCase());
    const rank = (s: SchoolDTO) => {
      const set = new Set((s.levels ?? []).map(normalize));
      if (set.has("VWO")) return 2;
      if (set.has("HAVO")) return 1;
      if (set.has("VMBO")) return 0;
      if (set.has("PRAKTIJKONDERWIJS")) return -1;
      return -1;
    };

    return [...schools].sort((a, b) => {
      const aFav = has(a.id);
      const bFav = has(b.id);
      if (aFav !== bFav) return aFav ? -1 : 1;

      const ar = rank(a);
      const br = rank(b);
      if (ar !== br) return br - ar;

      return (a.name ?? "").localeCompare(b.name ?? "", undefined, { sensitivity: "base" });
    });
  }, [schools, has]);

  React.useEffect(() => {
    if (!useMyLocation) {
      setLat(undefined);
      setLon(undefined);
      return;
    }
    if (!navigator.geolocation) {
      setError("Geolocation is not available in this browser.");
      return;
    }

    const watch = navigator.geolocation.watchPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLon(pos.coords.longitude);
        setError(null);
      },
      () => {
        setError("Could not access your location.");
      },
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 10_000 }
    );
    return () => navigator.geolocation.clearWatch(watch);
  }, [useMyLocation]);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const query = buildQuery({
      q,
      levels: selectedLevels,
      concept,
      postalCode,
      lat,
      lon,
      bikeMinutes: useMyLocation ? bikeMinutes : undefined,
      take: 100,
    });

    fetch(`/api/schools?${query}`)
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body?.error ?? "Request failed");
        return body as { schools: SchoolDTO[] };
      })
      .then((body) => {
        if (cancelled) return;
        setSchools(body.schools);
        if (selectedId && !body.schools.some((s) => s.id === selectedId)) {
          setSelectedId(null);
        }
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.message ?? "Something went wrong.");
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, selectedLevels, concept, postalCode, lat, lon, bikeMinutes, useMyLocation]);

  function toggleLevel(level: string) {
    setSelectedLevels(prev => 
      prev.includes(level) 
        ? prev.filter(l => l !== level)
        : [...prev, level]
    );
  }

  function toggleCompare(id: string) {
    setCompareIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].slice(0, 6)
    );
  }

  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-[1fr_420px]">
      <div className="grid min-w-0 gap-3">
        <div className="grid gap-3 rounded-3xl border border-indigo-100 bg-gradient-to-br from-white via-indigo-50 to-sky-50 p-4 shadow-sm dark:border-indigo-300/20 dark:from-slate-900 dark:via-indigo-500/10 dark:to-sky-500/10">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="grid gap-1 text-sm">
              <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-200">
                {t("searchLabel")}
              </span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="h-10 w-full min-w-0 rounded-2xl border border-indigo-200 bg-white/85 px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200 dark:border-indigo-300/30 dark:bg-slate-900/50 dark:focus:ring-indigo-300/30"
              />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-200">
                {t("levelLabel")}
              </span>
              <div className="flex flex-wrap gap-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedLevels.includes("VMBO")}
                    onChange={() => toggleLevel("VMBO")}
                    className="rounded border-indigo-300 bg-white text-indigo-700 focus:ring-2 focus:ring-indigo-200 dark:border-indigo-300/30 dark:bg-indigo-500/10 dark:text-indigo-100 dark:focus:ring-indigo-300/30"
                  />
                  <span>VMBO</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedLevels.includes("HAVO")}
                    onChange={() => toggleLevel("HAVO")}
                    className="rounded border-indigo-300 bg-white text-indigo-700 focus:ring-2 focus:ring-indigo-200 dark:border-indigo-300/30 dark:bg-indigo-500/10 dark:text-indigo-100 dark:focus:ring-indigo-300/30"
                  />
                  <span>HAVO</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedLevels.includes("VWO")}
                    onChange={() => toggleLevel("VWO")}
                    className="rounded border-indigo-300 bg-white text-indigo-700 focus:ring-2 focus:ring-indigo-200 dark:border-indigo-300/30 dark:bg-indigo-500/10 dark:text-indigo-100 dark:focus:ring-indigo-300/30"
                  />
                  <span>VWO</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedLevels.includes("PRAKTIJKONDERWIJS")}
                    onChange={() => toggleLevel("PRAKTIJKONDERWIJS")}
                    className="rounded border-indigo-300 bg-white text-indigo-700 focus:ring-2 focus:ring-indigo-200 dark:border-indigo-300/30 dark:bg-indigo-500/10 dark:text-indigo-100 dark:focus:ring-indigo-300/30"
                  />
                  <span>PRO</span>
                </label>
              </div>
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-200">
                {t("conceptLabel")}
              </span>
              <input
                value={concept}
                onChange={(e) => setConcept(e.target.value)}
                placeholder={t("conceptPlaceholder")}
                className="h-10 w-full min-w-0 rounded-2xl border border-indigo-200 bg-white/85 px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200 dark:border-indigo-300/30 dark:bg-slate-900/50 dark:focus:ring-indigo-300/30"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-200">
                {t("postalCodeLabel")}
              </span>
              <input
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder={t("postalCodePlaceholder")}
                className="h-10 w-full min-w-0 rounded-2xl border border-indigo-200 bg-white/85 px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200 dark:border-indigo-300/30 dark:bg-slate-900/50 dark:focus:ring-indigo-300/30"
              />
            </label>
          </div>

          <div className="grid gap-3 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
            <label className="flex min-w-0 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={useMyLocation}
                onChange={(e) => setUseMyLocation(e.target.checked)}
              />
              {t("useLocation")}
            </label>

            <label className="grid min-w-0 gap-1 text-sm sm:flex sm:items-center sm:gap-2">
              <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-200">
                {t("bikeTimeLabel")}
              </span>
              <input
                type="range"
                className="w-full min-w-0 sm:w-44"
                min={5}
                max={45}
                step={5}
                value={bikeMinutes}
                onChange={(e) => setBikeMinutes(Number(e.target.value))}
                disabled={!useMyLocation}
              />
              <span className="tabular-nums">{bikeMinutes} min</span>
            </label>

            <Link
              href={`/compare?ids=${encodeURIComponent(compareIds.join(","))}`}
              className="inline-flex h-9 w-full items-center justify-center rounded-full border border-sky-300 bg-white px-4 text-sm font-semibold text-sky-800 hover:bg-sky-50 sm:w-auto dark:border-sky-300/30 dark:bg-sky-500/10 dark:text-sky-200 dark:hover:bg-sky-500/20"
            >
              {t("compareCta")} ({compareIds.length})
            </Link>
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm">
            {error}
          </div>
        ) : null}

        <div className="grid gap-3">
          <div className="flex items-center justify-between text-sm text-indigo-700/90 dark:text-indigo-200/90">
            <div>
              {loading
                ? t("loading")
                : t("schoolsCount", { count: sortedSchools.length })}
            </div>
          </div>

          <div className="grid gap-2">
            {sortedSchools.map((s) => (
              <div
                key={s.id}
                className={[
                  "rounded-3xl border bg-white/90 p-4 shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md dark:bg-white/5",
                  selectedId === s.id
                    ? "border-amber-300 dark:border-amber-300/40"
                    : "border-indigo-100 dark:border-indigo-300/20",
                ].join(" ")}
                onMouseEnter={() => setSelectedId(s.id)}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-indigo-950 dark:text-indigo-100">{s.name}</div>
                    <div className="mt-1 text-xs text-indigo-700/85 dark:text-indigo-200/80">
                      {(s.levels ?? []).join(" / ") || "—"} ·{" "}
                      {(s.concepts ?? []).slice(0, 3).join(", ") || "—"}
                    </div>
                    <div className="mt-1 text-xs text-indigo-700/85 dark:text-indigo-200/80">
                      {[s.postalCode, s.city].filter(Boolean).join(" ") || "—"}
                    </div>
                    {useMyLocation &&
                      lat != null &&
                      lon != null &&
                      s.lat != null &&
                      s.lon != null ? (
                      <div className="mt-1 text-xs text-indigo-700/85 dark:text-indigo-200/80">
                        {(() => {
                          const km = haversineKm(lat, lon, s.lat!, s.lon!);
                          const bikeMin = Math.round((km / 15) * 60);
                          return t("distanceEstimate", {
                            km: km.toFixed(1),
                            minutes: bikeMin,
                          });
                        })()}
                      </div>
                    ) : null}
                  </div>

                  <div className="w-full sm:w-auto">
                    <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:flex-nowrap sm:justify-end">
                      <button
                        className={[
                          "h-9 min-w-0 flex-1 rounded-full border px-3 text-lg leading-none font-semibold sm:flex-none",
                          has(s.id)
                            ? "border-amber-300 bg-amber-100 text-amber-700 hover:bg-amber-200 dark:border-amber-300/40 dark:bg-amber-400/15 dark:text-amber-200 dark:hover:bg-amber-400/25"
                            : "border-indigo-300 bg-indigo-50 text-indigo-900 hover:bg-indigo-100 dark:border-indigo-300/30 dark:bg-indigo-500/10 dark:text-indigo-200 dark:hover:bg-indigo-500/20",
                        ].join(" ")}
                        onClick={() => toggle(s.id)}
                        type="button"
                        aria-label={has(s.id) ? "Remove favorite" : "Add favorite"}
                      >
                        {has(s.id) ? t("favoriteOn") : t("favoriteOff")}
                      </button>
                      <button
                        className="h-9 min-w-0 flex-1 rounded-full border border-indigo-300 bg-indigo-50 px-3 text-sm font-semibold text-indigo-900 hover:bg-indigo-100 sm:flex-none dark:border-indigo-300/30 dark:bg-indigo-500/10 dark:text-indigo-200 dark:hover:bg-indigo-500/20"
                        onClick={() => toggleCompare(s.id)}
                        type="button"
                      >
                        {compareIds.includes(s.id) ? "✓" : "+"}
                      </button>
                      <Link
                        href={`/schools/${s.id}`}
                        className="inline-flex h-9 min-w-0 flex-1 items-center justify-center rounded-full border border-violet-300 bg-violet-50 px-3 text-sm font-semibold text-violet-900 hover:bg-violet-100 sm:flex-none dark:border-violet-300/30 dark:bg-violet-500/10 dark:text-violet-200 dark:hover:bg-violet-500/20"
                      >
                        {t("detailsCta")}
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="lg:sticky lg:top-20 lg:self-start">
        <SchoolsMap
          schools={sortedSchools}
          selectedId={selectedId}
          onSelect={(id: string) => setSelectedId(id)}
          userLocation={
            useMyLocation && lat != null && lon != null ? { lat, lon } : null
          }
        />
      </div>
    </div>
  );
}
