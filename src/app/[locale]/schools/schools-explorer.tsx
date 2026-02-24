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
    <div className="h-[420px] w-full animate-pulse rounded-2xl bg-black/5 dark:bg-white/10" />
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
  const [radiusKm, setRadiusKm] = React.useState(3);
  const [useMyLocation, setUseMyLocation] = React.useState(false);
  const [lat, setLat] = React.useState<number | undefined>(undefined);
  const [lon, setLon] = React.useState<number | undefined>(undefined);

  const [schools, setSchools] = React.useState<SchoolDTO[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [compareIds, setCompareIds] = React.useState<string[]>([]);

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
      radiusKm: useMyLocation ? radiusKm : undefined,
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
  }, [q, selectedLevels, concept, postalCode, lat, lon, radiusKm, useMyLocation]);

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
    <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
      <div className="grid gap-3">
        <div className="grid gap-3 rounded-2xl border border-black/5 bg-white p-4 dark:border-white/10 dark:bg-white/5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="grid gap-1 text-sm">
              <span className="text-xs text-zinc-600 dark:text-zinc-400">
                {t("searchLabel")}
              </span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="h-10 w-full min-w-0 rounded-xl border border-black/10 bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-black/10 dark:border-white/15 dark:focus:ring-white/15"
              />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="text-xs text-zinc-600 dark:text-zinc-400">
                {t("levelLabel")}
              </span>
              <div className="flex flex-wrap gap-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedLevels.includes("VMBO")}
                    onChange={() => toggleLevel("VMBO")}
                    className="rounded border-black/10 bg-transparent text-black focus:ring-2 focus:ring-black/10 dark:border-white/15 dark:bg-white/10 dark:text-white dark:focus:ring-white/15"
                  />
                  <span>VMBO</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedLevels.includes("HAVO")}
                    onChange={() => toggleLevel("HAVO")}
                    className="rounded border-black/10 bg-transparent text-black focus:ring-2 focus:ring-black/10 dark:border-white/15 dark:bg-white/10 dark:text-white dark:focus:ring-white/15"
                  />
                  <span>HAVO</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedLevels.includes("VWO")}
                    onChange={() => toggleLevel("VWO")}
                    className="rounded border-black/10 bg-transparent text-black focus:ring-2 focus:ring-black/10 dark:border-white/15 dark:bg-white/10 dark:text-white dark:focus:ring-white/15"
                  />
                  <span>VWO</span>
                </label>
              </div>
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs text-zinc-600 dark:text-zinc-400">
                {t("conceptLabel")}
              </span>
              <input
                value={concept}
                onChange={(e) => setConcept(e.target.value)}
                placeholder={t("conceptPlaceholder")}
                className="h-10 w-full min-w-0 rounded-xl border border-black/10 bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-black/10 dark:border-white/15 dark:focus:ring-white/15"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs text-zinc-600 dark:text-zinc-400">
                {t("postalCodeLabel")}
              </span>
              <input
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder={t("postalCodePlaceholder")}
                className="h-10 w-full min-w-0 rounded-xl border border-black/10 bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-black/10 dark:border-white/15 dark:focus:ring-white/15"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={useMyLocation}
                onChange={(e) => setUseMyLocation(e.target.checked)}
              />
              {t("useLocation")}
            </label>

            <label className="flex items-center gap-2 text-sm">
              <span className="text-xs text-zinc-600 dark:text-zinc-400">
                {t("radiusLabel")}
              </span>
              <input
                type="range"
                min={1}
                max={10}
                value={radiusKm}
                onChange={(e) => setRadiusKm(Number(e.target.value))}
                disabled={!useMyLocation}
              />
              <span className="tabular-nums">{radiusKm} km</span>
            </label>

            <Link
              href={`/compare?ids=${encodeURIComponent(compareIds.join(","))}`}
              className="inline-flex h-9 items-center justify-center rounded-full border border-black/10 px-4 text-sm hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
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
          <div className="flex items-center justify-between text-sm text-zinc-600 dark:text-zinc-400">
            <div>
              {loading
                ? t("loading")
                : t("schoolsCount", { count: schools.length })}
            </div>
          </div>

          <div className="grid gap-2">
            {schools.map((s) => (
              <div
                key={s.id}
                className={[
                  "rounded-2xl border bg-white p-4 dark:bg-white/5",
                  selectedId === s.id
                    ? "border-black/20 dark:border-white/30"
                    : "border-black/5 dark:border-white/10",
                ].join(" ")}
                onMouseEnter={() => setSelectedId(s.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{s.name}</div>
                    <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                      {(s.levels ?? []).join(" / ") || "—"} ·{" "}
                      {(s.concepts ?? []).slice(0, 3).join(", ") || "—"}
                    </div>
                    <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                      {[s.postalCode, s.city].filter(Boolean).join(" ") || "—"}
                    </div>
                    {useMyLocation &&
                      lat != null &&
                      lon != null &&
                      s.lat != null &&
                      s.lon != null ? (
                      <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
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

                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <div className="flex gap-2">
                      <button
                        className="h-9 rounded-full border border-black/10 px-3 text-sm hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
                        onClick={() => toggle(s.id)}
                        type="button"
                      >
                        {has(s.id) ? t("favoriteOn") : t("favoriteOff")}
                      </button>
                      <button
                        className="h-9 rounded-full border border-black/10 px-3 text-sm hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
                        onClick={() => toggleCompare(s.id)}
                        type="button"
                      >
                        {compareIds.includes(s.id) ? "✓" : "+"}
                      </button>
                      <Link
                        href={`/schools/${s.id}`}
                        className="inline-flex h-9 items-center rounded-full bg-black px-3 text-sm font-medium text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
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
          schools={schools}
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

