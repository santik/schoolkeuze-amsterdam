"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

type SchoolDTO = {
  id: string;
  name: string;
  lat: number | null;
  lon: number | null;
  levels: string[];
  concepts: string[];
  postalCode: string | null;
  city: string | null;
};

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

export function ProfileClient() {
  const tSchools = useTranslations("Schools");

  const [advice, setAdvice] = React.useState<string>("VWO");
  const [preferredConcept, setPreferredConcept] = React.useState<string>("");
  const [maxDistanceKm, setMaxDistanceKm] = React.useState<number>(4);
  const [useMyLocation, setUseMyLocation] = React.useState(false);
  const [lat, setLat] = React.useState<number | undefined>(undefined);
  const [lon, setLon] = React.useState<number | undefined>(undefined);

  const [schools, setSchools] = React.useState<SchoolDTO[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!useMyLocation) {
      setLat(undefined);
      setLon(undefined);
      return;
    }
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLon(pos.coords.longitude);
      },
      () => {
        setUseMyLocation(false);
      },
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 10_000 }
    );
  }, [useMyLocation]);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const query = new URLSearchParams();
    query.set("take", "150");
    fetch(`/api/schools?${query.toString()}`)
      .then((r) => r.json())
      .then((body: { schools: SchoolDTO[] }) => {
        if (cancelled) return;
        setSchools(body.schools);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const suggestions = React.useMemo(() => {
    const concept = preferredConcept.trim().toLowerCase();
    return schools
      .map((s) => {
        let score = 0;
        const reasons: string[] = [];

        if (s.levels?.includes(advice)) {
          score += 3;
          reasons.push(`Heeft ${advice}`);
        }

        if (concept) {
          const match = (s.concepts ?? []).some((c) =>
            c.toLowerCase().includes(concept)
          );
          if (match) {
            score += 2;
            reasons.push(`Concept match: ${preferredConcept}`);
          }
        }

        if (
          useMyLocation &&
          lat != null &&
          lon != null &&
          s.lat != null &&
          s.lon != null
        ) {
          const km = haversineKm(lat, lon, s.lat, s.lon);
          if (km <= maxDistanceKm) {
            score += 2;
            reasons.push(`${km.toFixed(1)} km (binnen radius)`);
          } else {
            score -= 1;
            reasons.push(`${km.toFixed(1)} km (buiten radius)`);
          }
        }

        return { s, score, reasons };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }, [schools, advice, preferredConcept, useMyLocation, lat, lon, maxDistanceKm]);

  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <section className="grid gap-3 rounded-3xl border border-black/5 bg-white p-6 dark:border-white/10 dark:bg-white/5">
        <div className="text-sm font-semibold">Jouw profiel (prototype)</div>

        <label className="grid gap-1 text-sm">
          <span className="text-xs text-zinc-600 dark:text-zinc-400">
            Advies/niveau
          </span>
          <select
            value={advice}
            onChange={(e) => setAdvice(e.target.value)}
            className="h-10 rounded-xl border border-black/10 bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-black/10 dark:border-white/15 dark:focus:ring-white/15"
          >
            <option value="VMBO">VMBO</option>
            <option value="HAVO">HAVO</option>
            <option value="VWO">VWO</option>
          </select>
        </label>

        <label className="grid gap-1 text-sm">
          <span className="text-xs text-zinc-600 dark:text-zinc-400">
            Voorkeursconcept (optioneel)
          </span>
          <input
            value={preferredConcept}
            onChange={(e) => setPreferredConcept(e.target.value)}
            placeholder={tSchools("conceptPlaceholder")}
            className="h-10 rounded-xl border border-black/10 bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-black/10 dark:border-white/15 dark:focus:ring-white/15"
          />
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={useMyLocation}
            onChange={(e) => setUseMyLocation(e.target.checked)}
          />
          {tSchools("useLocation")}
        </label>

        <label className="flex items-center justify-between gap-3 text-sm">
          <span className="text-xs text-zinc-600 dark:text-zinc-400">
            {tSchools("radiusLabel")}
          </span>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={1}
              max={10}
              value={maxDistanceKm}
              onChange={(e) => setMaxDistanceKm(Number(e.target.value))}
              disabled={!useMyLocation}
            />
            <span className="tabular-nums">{maxDistanceKm} km</span>
          </div>
        </label>

        <div className="text-xs text-zinc-600 dark:text-zinc-400">
          Dit is een eerste prototype van “suggesties”. In productie komt hier
          meer: interesses, brugklasprofielen, toelatingsregels, reistijd (fiets/OV)
          en uitleg waarom iets past.
        </div>
      </section>

      <section className="grid gap-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Suggesties</div>
          <Link
            href="/schools"
            className="text-sm text-zinc-700 hover:underline dark:text-zinc-300"
          >
            Alle scholen →
          </Link>
        </div>

        <div className="rounded-2xl border border-black/5 bg-white p-4 text-sm text-zinc-700 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300">
          {loading ? tSchools("loading") : null}
          {!loading && suggestions.length === 0 ? "Geen suggesties." : null}
          <div className="mt-2 grid gap-2">
            {suggestions.map(({ s, score, reasons }) => (
              <div
                key={s.id}
                className="rounded-2xl border border-black/5 bg-white p-4 dark:border-white/10 dark:bg-white/5"
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
                    <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                      Score: <span className="font-semibold">{score}</span> ·{" "}
                      {reasons.join(" · ")}
                    </div>
                  </div>
                  <Link
                    href={`/schools/${s.id}`}
                    className="inline-flex h-9 items-center rounded-full bg-black px-3 text-sm font-medium text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
                  >
                    {tSchools("detailsCta")}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

