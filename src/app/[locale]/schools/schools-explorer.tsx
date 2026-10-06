"use client";

import dynamic from "next/dynamic";
import * as React from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { bikeMinutesFromKm } from "@/lib/bike";
import { useProfileId } from "@/lib/useProfileId";
import { useImpressionSummaries } from "@/lib/useImpressionSummaries";
import { formatPercent } from "@/lib/impression-score";
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

async function parseJsonSafe(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

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
  const tImpression = useTranslations("Impression");
  const { profileId, hydrated } = useProfileId();
  const [sort, setSort] = React.useState("default");
  const [ratedOnly, setRatedOnly] = React.useState(false);
  const { ids, has, toggle } = useFavorites();

  const searchParams = useSearchParams();
  const [q, setQ] = React.useState(() => searchParams.get("q") ?? "");
  const [selectedLevels, setSelectedLevels] = React.useState<string[]>(() =>
    (searchParams.get("levels") ?? "")
      .split(",")
      .filter((l) => ["PRAKTIJKONDERWIJS", "VMBO", "HAVO", "VWO"].includes(l))
  );
  const [bikeMinutes, setBikeMinutes] = React.useState(() => {
    const n = Number(searchParams.get("bike"));
    return Number.isFinite(n) && n >= 5 && n <= 45 ? n : 30;
  });
  const [useMyLocation, setUseMyLocation] = React.useState(() => searchParams.get("loc") === "1");
  const [zipCode, setZipCode] = React.useState(() => searchParams.get("zip") ?? "");
  const [isDistanceOpen, setIsDistanceOpen] = React.useState(
    () => searchParams.get("loc") === "1" || Boolean(searchParams.get("zip"))
  );
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
      setZipError(t("zipInvalid"));
      return;
    }

    let cancelled = false;
    setZipLoading(true);
    setZipError(null);

    const timer = window.setTimeout(() => {
      fetch(`/api/geocode-zip?zip=${encodeURIComponent(normalizedZip)}`)
        .then(async (r) => {
          const body = (await parseJsonSafe(r)) as { error?: string; lat?: number; lon?: number } | null;
          if (!r.ok) throw new Error(body?.error ?? "Zip lookup failed");
          if (typeof body?.lat !== "number" || typeof body?.lon !== "number") {
            throw new Error("Zip lookup failed");
          }
          return { lat: body.lat, lon: body.lon };
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
  }, [normalizedZip, validZip, t]);

  const distanceOrigin = React.useMemo(
    () =>
      useMyLocation && lat != null && lon != null
        ? { lat, lon }
        : zipLocation
          ? { lat: zipLocation.lat, lon: zipLocation.lon }
          : null,
    [zipLocation, useMyLocation, lat, lon]
  );

  // Keep filters in the URL so Back and the detail-page return link restore them.
  React.useEffect(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q);
    if (selectedLevels.length > 0) params.set("levels", selectedLevels.join(","));
    if (useMyLocation) params.set("loc", "1");
    else if (normalizedZip) params.set("zip", normalizedZip);
    if ((useMyLocation || normalizedZip) && bikeMinutes !== 30) params.set("bike", String(bikeMinutes));
    const qs = params.toString();
    window.history.replaceState(window.history.state, "", qs ? `?${qs}` : window.location.pathname);
    try {
      window.sessionStorage.setItem("schools:last-query", qs);
    } catch {
      // storage unavailable
    }
  }, [q, selectedLevels, useMyLocation, normalizedZip, bikeMinutes]);

  const summaries = useImpressionSummaries(hydrated ? profileId : "", schools.map(s => s.id));

  const sortedSchools = React.useMemo(() => {
    const normalize = (lvl: string) => (lvl.toUpperCase().startsWith("VMBO") ? "VMBO" : lvl.toUpperCase());
    const orderGroup = (s: SchoolDTO) => {
      const set = new Set((s.levels ?? []).map(normalize));
      const hasVwo = set.has("VWO");
      const hasHavo = set.has("HAVO");
      const hasVmbo = set.has("VMBO");

      if (hasVwo && !hasHavo && !hasVmbo) return 0; // VWO only
      if (hasVwo && hasHavo && !hasVmbo) return 1; // VWO + HAVO
      if (hasVwo && hasHavo && hasVmbo) return 2; // VWO + HAVO + VMBO
      if (!hasVwo && hasHavo && hasVmbo) return 3; // HAVO + VMBO
      if (!hasVwo && !hasHavo && hasVmbo) return 4; // VMBO only

      return 5; // Any other combination (including Praktijk-only)
    };

    return schools.filter(s => !ratedOnly || summaries.get(s.id)?.score != null).sort((a, b) => {
      const alphabetical = a.name.localeCompare(b.name, undefined, { sensitivity: "base" }) || a.id.localeCompare(b.id);
      if (sort === "name") return alphabetical;
      if (sort === "score") {
        const aScore = summaries.get(a.id)?.score ?? -1;
        const bScore = summaries.get(b.id)?.score ?? -1;
        return bScore - aScore || alphabetical;
      }
      if (sort === "distance" && distanceOrigin) {
        const distance = (s: SchoolDTO) => s.lat == null || s.lon == null
          ? Infinity
          : haversineKm(distanceOrigin.lat, distanceOrigin.lon, s.lat, s.lon);
        return distance(a) - distance(b) || alphabetical;
      }
      const ar = orderGroup(a);
      const br = orderGroup(b);
      if (ar !== br) return ar - br;

      return alphabetical;
    });
  }, [schools, summaries, ratedOnly, sort, distanceOrigin]);

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
        const body = (await parseJsonSafe(r)) as
          | { error?: string; schools?: SchoolDTO[] }
          | null;
        if (!r.ok) throw new Error(body?.error ?? "Request failed");
        return { schools: body?.schools ?? [] } as { schools: SchoolDTO[] };
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

  const activeFilters = [
    q.trim() ? t("activeSearch", { query: q.trim() }) : null,
    selectedLevels.length > 0 ? t("activeLevels", { levels: selectedLevels.join(", ") }) : null,
    distanceOrigin ? t("activeDistance", { minutes: bikeMinutes }) : null,
    ratedOnly ? t("ratedOnly") : null,
  ].filter((f): f is string => Boolean(f));

  function resetFilters() {
    setQ("");
    setSelectedLevels([]);
    setUseMyLocation(false);
    setZipCode("");
    setBikeMinutes(30);
    setRatedOnly(false);
  }

  function toggleLevel(level: string) {
    setSelectedLevels(prev => 
      prev.includes(level) 
        ? prev.filter(l => l !== level)
        : [...prev, level]
    );
  }

  return (
    <div className="grid min-w-0 gap-4">
      <div className="grid min-w-0 gap-3">
        <div
          data-testid="schools-filters"
          className="grid gap-3 rounded-3xl border border-indigo-100 bg-gradient-to-br from-white via-indigo-50 to-sky-50 p-4 shadow-sm dark:border-indigo-300/20 dark:from-slate-900 dark:via-indigo-500/10 dark:to-sky-500/10"
        >
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <label className="grid gap-1">
              <span>{t("sortLabel")}</span>
              <div className="relative">
                <select
                  data-testid="schools-sort"
                  value={sort === "distance" && !distanceOrigin ? "default" : sort}
                  onChange={e => setSort(e.target.value)}
                  className="h-10 appearance-none rounded-2xl border border-indigo-200 bg-white py-0 pl-3 pr-10 dark:border-indigo-300/30 dark:bg-slate-900"
                >
                  <option value="default">{t("sortDefault")}</option>
                  <option value="name">{t("sortName")}</option>
                  <option value="score">{t("sortScore")}</option>
                  {distanceOrigin ? <option value="distance">{t("sortDistance")}</option> : null}
                </select>
                <ChevronDown
                  aria-hidden="true"
                  className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-indigo-600 dark:text-indigo-200"
                />
              </div>
            </label>
            <div className="grid gap-1">
              <span aria-hidden="true" className="invisible">{t("sortLabel")}</span>
              <label className="flex h-10 items-center gap-2">
                <input type="checkbox" checked={ratedOnly} onChange={e => setRatedOnly(e.target.checked)} />
                {t("ratedOnly")}
              </label>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-200">
                {t("searchLabel")}
              </span>
              <div className="relative">
                <input
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={t("searchPlaceholder")}
                  className="h-10 w-full min-w-0 rounded-2xl border border-indigo-200 bg-white/85 pl-3 pr-20 text-sm outline-none focus:ring-2 focus:ring-indigo-200 dark:border-indigo-300/30 dark:bg-slate-900/50 dark:focus:ring-indigo-300/30 [&::-webkit-search-cancel-button]:hidden"
                />
                {q ? (
                  <button
                    type="button"
                    onClick={() => setQ("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full px-2 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:text-indigo-200 dark:hover:bg-indigo-500/20"
                  >
                    {t("clearSearch")}
                  </button>
                ) : null}
              </div>
            </label>
            <div className="grid gap-2 text-sm">
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
            </div>
          </div>

          <div className="grid gap-3">
            <div className="grid gap-2 rounded-2xl border border-indigo-200 bg-white/70 p-3 dark:border-indigo-300/30 dark:bg-indigo-500/10">
              <button
                type="button"
                onClick={() => setIsDistanceOpen((prev) => !prev)}
                aria-expanded={isDistanceOpen}
                className="flex items-center justify-between text-left text-sm font-semibold text-indigo-900 dark:text-indigo-100"
              >
                <span>{t("distanceBikeTitle")}</span>
                <span>{isDistanceOpen ? "▾" : "▸"}</span>
              </button>

              {isDistanceOpen ? (
                <>
                  <p className="text-xs text-indigo-700/85 dark:text-indigo-200/80">
                    {t("distanceOriginHelp")}
                  </p>
                  <label className="flex min-w-0 items-center gap-2 text-sm font-medium text-indigo-900 dark:text-indigo-100">
                    <input
                      type="checkbox"
                      checked={useMyLocation}
                      onChange={(e) => {
                        setUseMyLocation(e.target.checked);
                        setZipCode("");
                        setZipLocation(null);
                        setZipError(null);
                        setZipLoading(false);
                      }}
                      className="rounded border-indigo-300 bg-white text-indigo-700 focus:ring-2 focus:ring-indigo-200 dark:border-indigo-300/30 dark:bg-indigo-500/10 dark:text-indigo-100 dark:focus:ring-indigo-300/30"
                    />
                    {t("useLocation")}
                  </label>

                  <label className="grid gap-1 text-sm">
                    <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-200">
                      {t("zipDistanceLabel")}
                    </span>
                    <input
                      value={zipCode}
                      onChange={(e) => {
                        const next = e.target.value;
                        setZipCode(next);
                        const normalized = next.trim().toUpperCase().replace(/\s+/g, "");
                        if (/^\d{4}[A-Z]{2}$/.test(normalized) && useMyLocation) {
                          setUseMyLocation(false);
                        }
                      }}
                      placeholder="1017AB"
                      className="h-10 w-full min-w-0 rounded-2xl border border-indigo-200 bg-white/85 px-3 text-sm uppercase outline-none focus:ring-2 focus:ring-indigo-200 dark:border-indigo-300/30 dark:bg-slate-900/50 dark:focus:ring-indigo-300/30"
                    />
                    <span className="text-xs text-indigo-700/85 dark:text-indigo-200/80">
                      {zipLoading
                        ? t("zipLookupLoading")
                        : zipError
                          ? zipError
                          : zipLocation
                            ? t("zipLookupUsing")
                            : t("zipLookupHint")}
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
            <span>{t("mapLabel")}</span>
            <span>{isMapOpen ? "▾" : "▸"}</span>
          </button>
          {isMapOpen ? (
            <SchoolsMap
              schools={sortedSchools}
              selectedId={selectedId}
              favoriteIds={ids}
              onSelect={(id: string) => setSelectedId(id)}
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
          <div
            data-testid="schools-count"
            className="flex items-center justify-between text-sm text-indigo-700/90 dark:text-indigo-200/90"
          >
            <div>
              {loading
                ? t("loading")
                : t("schoolsCount", { count: sortedSchools.length })}
            </div>
          </div>

          {!loading && !error && sortedSchools.length === 0 ? (
            <div data-testid="schools-empty" className="grid gap-2 rounded-2xl border border-indigo-200 bg-white/90 p-4 text-sm dark:border-indigo-300/30 dark:bg-indigo-500/10">
              <p className="font-semibold">{t("emptyTitle")}</p>
              {activeFilters.length > 0 ? (
                <ul className="list-disc pl-5">
                  {activeFilters.map((f) => <li key={f}>{f}</li>)}
                </ul>
              ) : null}
              {activeFilters.length > 0 ? (
                <button type="button" onClick={resetFilters} className="w-fit rounded-full border border-indigo-300 px-3 py-1 text-xs font-semibold text-indigo-900 hover:bg-indigo-100 dark:text-indigo-100 dark:hover:bg-indigo-500/20">
                  {t("resetFilters")}
                </button>
              ) : null}
            </div>
          ) : null}

            <div className="grid gap-2">
            {sortedSchools.map((s) => (
              <Link
                key={s.id}
                href={`/schools/${s.id}`}
                data-testid="school-card"
                data-school-id={s.id}
                className={[
                  "block rounded-3xl border bg-white/90 p-4 shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md dark:bg-white/5",
                  selectedId === s.id
                    ? "border-amber-300 dark:border-amber-300/40"
                    : "border-indigo-100 dark:border-indigo-300/20",
                ].join(" ")}
                onMouseEnter={() => setSelectedId(s.id)}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div
                      data-testid="school-name"
                      className="truncate font-semibold text-indigo-950 dark:text-indigo-100"
                    >
                      {s.name}
                    </div>
                    <div
                      data-testid="school-levels"
                      className="mt-1 text-xs text-indigo-700/85 dark:text-indigo-200/80"
                    >
                      {(s.levels ?? []).join(" / ") || "—"} ·{" "}
                      {(s.concepts ?? []).slice(0, 3).join(", ") || "—"}
                    </div>
                    <div
                      data-testid="school-address"
                      className="mt-1 text-xs text-indigo-700/85 dark:text-indigo-200/80"
                    >
                      {[s.postalCode, s.city].filter(Boolean).join(" ") || "—"}
                    </div>
                    <div data-testid="school-score" className="mt-1 text-xs text-indigo-700 dark:text-indigo-200">
                      {t("myScore")}: {formatPercent(summaries.get(s.id)?.score ?? null)}
                      {summaries.get(s.id)?.score != null ? (
                        <> · {tImpression("confidenceLabel")}: {formatPercent(summaries.get(s.id)!.confidence)}</>
                      ) : null}
                    </div>
                    {distanceOrigin &&
                      s.lat != null &&
                      s.lon != null ? (
                      <div
                        data-testid="school-distance"
                        className="mt-1 text-xs text-indigo-700/85 dark:text-indigo-200/80"
                      >
                        {(() => {
                          const km = haversineKm(
                            distanceOrigin.lat,
                            distanceOrigin.lon,
                            s.lat!,
                            s.lon!
                          );
                          const bikeMin = bikeMinutesFromKm(km);
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
                        data-testid="favorite-toggle"
                        className={[
                          "h-9 min-w-0 flex-1 rounded-full border px-3 text-lg leading-none font-semibold sm:flex-none",
                          has(s.id)
                            ? "border-amber-300 bg-amber-100 text-amber-700 hover:bg-amber-200 dark:border-amber-300/40 dark:bg-amber-400/15 dark:text-amber-200 dark:hover:bg-amber-400/25"
                            : "border-indigo-300 bg-indigo-50 text-indigo-900 hover:bg-indigo-100 dark:border-indigo-300/30 dark:bg-indigo-500/10 dark:text-indigo-200 dark:hover:bg-indigo-500/20",
                        ].join(" ")}
                        onClick={(e) => {
                          e.preventDefault();
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
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
