"use client";

import dynamic from "next/dynamic";
import * as React from "react";
import { useTranslations } from "next-intl";

import { useRouter } from "@/i18n/navigation";
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
  const router = useRouter();
  const { has, toggle } = useFavorites();

  const [q, setQ] = React.useState("");
  const [selectedLevels, setSelectedLevels] = React.useState<string[]>([]);
  const [bikeMinutes, setBikeMinutes] = React.useState(30);
  const [useMyLocation, setUseMyLocation] = React.useState(false);
  const [isDistanceOpen, setIsDistanceOpen] = React.useState(false);
  const [zipCode, setZipCode] = React.useState("");
  const [zipLocation, setZipLocation] = React.useState<{ lat: number; lon: number } | null>(null);
  const [zipLoading, setZipLoading] = React.useState(false);
  const [zipError, setZipError] = React.useState<string | null>(null);
  const [isMapOpen, setIsMapOpen] = React.useState(false);
  const [lat, setLat] = React.useState<number | undefined>(undefined);
  const [lon, setLon] = React.useState<number | undefined>(undefined);

  const [schools, setSchools] = React.useState<SchoolDTO[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const rowRefs = React.useRef<Record<string, HTMLDivElement | null>>({});

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
      const ar = rank(a);
      const br = rank(b);
      if (ar !== br) return br - ar;

      return (a.name ?? "").localeCompare(b.name ?? "", undefined, { sensitivity: "base" });
    });
  }, [schools]);

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

  const normalizedZip = React.useMemo(
    () => zipCode.trim().toUpperCase().replace(/\s+/g, ""),
    [zipCode]
  );
  const validZip = /^\d{4}[A-Z]{2}$/.test(normalizedZip);

  React.useEffect(() => {
    if (!normalizedZip) {
      setZipLocation(null);
      setZipError(null);
      setZipLoading(false);
      return;
    }
    if (!validZip) {
      setZipLocation(null);
      setZipLoading(false);
      setZipError("Enter a valid zip code (e.g. 1017AB)");
      return;
    }

    let cancelled = false;
    setZipLoading(true);
    setZipError(null);

    const timer = window.setTimeout(() => {
      fetch(`/api/geocode-zip?zip=${encodeURIComponent(normalizedZip)}`)
        .then(async (r) => {
          const body = await r.json();
          if (!r.ok) throw new Error(body?.error ?? "Zip lookup failed");
          return body as { lat: number; lon: number };
        })
        .then((body) => {
          if (cancelled) return;
          setZipLocation({ lat: body.lat, lon: body.lon });
          setZipError(null);
        })
        .catch((e) => {
          if (cancelled) return;
          setZipLocation(null);
          setZipError(e?.message ?? "Zip lookup failed");
        })
        .finally(() => {
          if (cancelled) return;
          setZipLoading(false);
        });
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [normalizedZip, validZip]);

  const distanceOrigin = React.useMemo(
    () =>
      useMyLocation && lat != null && lon != null
        ? { lat, lon }
        : zipLocation
          ? { lat: zipLocation.lat, lon: zipLocation.lon }
          : null,
    [zipLocation, useMyLocation, lat, lon]
  );

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const query = buildQuery({
      q,
      levels: selectedLevels,
      lat: distanceOrigin?.lat,
      lon: distanceOrigin?.lon,
      bikeMinutes: distanceOrigin ? bikeMinutes : undefined,
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
  }, [q, selectedLevels, bikeMinutes, distanceOrigin]);

  function toggleLevel(level: string) {
    setSelectedLevels(prev => 
      prev.includes(level) 
        ? prev.filter(l => l !== level)
        : [...prev, level]
    );
  }

  const handleMapSelect = React.useCallback((id: string) => {
    setSelectedId(id);
    const el = rowRefs.current[id];
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  return (
    <div className="grid min-w-0 gap-4">
      <div className="grid min-w-0 gap-3">
        <div className="grid gap-3 rounded-3xl border border-indigo-100 bg-gradient-to-br from-white via-indigo-50 to-sky-50 p-4 shadow-sm dark:border-indigo-300/20 dark:from-slate-900 dark:via-indigo-500/10 dark:to-sky-500/10">
          <div className="grid gap-3 sm:grid-cols-2">
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
                    checked={selectedLevels.includes("PRAKTIJKONDERWIJS")}
                    onChange={() => toggleLevel("PRAKTIJKONDERWIJS")}
                    className="rounded border-indigo-300 bg-white text-indigo-700 focus:ring-2 focus:ring-indigo-200 dark:border-indigo-300/30 dark:bg-indigo-500/10 dark:text-indigo-100 dark:focus:ring-indigo-300/30"
                  />
                  <span>Praktijk</span>
                </label>
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
              </div>
            </label>
          </div>

          <div className="grid gap-3">
            <div className="grid gap-2 rounded-2xl border border-indigo-200 bg-white/70 p-3 dark:border-indigo-300/30 dark:bg-indigo-500/10">
              <button
                type="button"
                onClick={() => setIsDistanceOpen((prev) => !prev)}
                aria-expanded={isDistanceOpen}
                className="flex items-center justify-between text-left text-sm font-semibold text-indigo-900 dark:text-indigo-100"
              >
                <span>Distance & bike time</span>
                <span>{isDistanceOpen ? "▾" : "▸"}</span>
              </button>

              {isDistanceOpen ? (
                <>
                  <label className="flex min-w-0 items-center gap-2 text-sm font-medium text-indigo-900 dark:text-indigo-100">
                    <input
                      type="checkbox"
                      checked={useMyLocation}
                      onChange={(e) => setUseMyLocation(e.target.checked)}
                      className="rounded border-indigo-300 bg-white text-indigo-700 focus:ring-2 focus:ring-indigo-200 dark:border-indigo-300/30 dark:bg-indigo-500/10 dark:text-indigo-100 dark:focus:ring-indigo-300/30"
                    />
                    {t("useLocation")}
                  </label>

                  <label className="grid gap-1 text-sm">
                    <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-200">
                      Zip code for distance
                    </span>
                    <input
                      value={zipCode}
                      onChange={(e) => setZipCode(e.target.value)}
                      placeholder="1017AB"
                      className="h-10 w-full min-w-0 rounded-2xl border border-indigo-200 bg-white/85 px-3 text-sm uppercase outline-none focus:ring-2 focus:ring-indigo-200 dark:border-indigo-300/30 dark:bg-slate-900/50 dark:focus:ring-indigo-300/30"
                    />
                    <span className="text-xs text-indigo-700/85 dark:text-indigo-200/80">
                      {zipLoading
                        ? "Looking up zip code..."
                        : zipError
                          ? zipError
                          : zipLocation
                            ? "Using zip code for distance"
                            : "If valid, zip code is used for bike distance."}
                    </span>
                  </label>

                  <label
                    className={[
                      "grid min-w-0 gap-1 text-sm sm:flex sm:items-center sm:gap-2",
                      distanceOrigin ? "" : "opacity-60",
                    ].join(" ")}
                  >
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
                      disabled={!distanceOrigin}
                    />
                    <span className="tabular-nums">{bikeMinutes} min</span>
                  </label>
                </>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid gap-2 rounded-3xl border border-sky-200 bg-white/90 p-3 shadow-sm dark:border-sky-300/20 dark:bg-sky-500/10">
          <button
            type="button"
            onClick={() => setIsMapOpen((prev) => !prev)}
            aria-expanded={isMapOpen}
            className="flex items-center justify-between text-left text-sm font-semibold text-sky-900 dark:text-sky-100"
          >
            <span>Map</span>
            <span>{isMapOpen ? "▾" : "▸"}</span>
          </button>
          {isMapOpen ? (
            <SchoolsMap
              schools={sortedSchools}
              selectedId={selectedId}
              onSelect={handleMapSelect}
              userLocation={distanceOrigin}
            />
          ) : null}
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
                ref={(el) => {
                  rowRefs.current[s.id] = el;
                }}
                className={[
                  "cursor-pointer rounded-3xl border bg-white/90 p-4 shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md dark:bg-white/5",
                  selectedId === s.id
                    ? "border-amber-300 dark:border-amber-300/40"
                    : "border-indigo-100 dark:border-indigo-300/20",
                ].join(" ")}
                onMouseEnter={() => setSelectedId(s.id)}
                onClick={() => router.push(`/schools/${s.id}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    router.push(`/schools/${s.id}`);
                  }
                }}
                role="button"
                tabIndex={0}
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
                    {distanceOrigin &&
                      s.lat != null &&
                      s.lon != null ? (
                      <div className="mt-1 text-xs text-indigo-700/85 dark:text-indigo-200/80">
                        {(() => {
                          const km = haversineKm(
                            distanceOrigin.lat,
                            distanceOrigin.lon,
                            s.lat!,
                            s.lon!
                          );
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
                        onClick={(e) => {
                          e.stopPropagation();
                          toggle(s.id);
                        }}
                        type="button"
                        aria-label={has(s.id) ? "Remove favorite" : "Add favorite"}
                      >
                        {has(s.id) ? t("favoriteOn") : t("favoriteOff")}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
