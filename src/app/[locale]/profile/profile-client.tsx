"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import { FavoritesClient } from "@/app/[locale]/favorites/favorites-client";

export function ProfileClient() {
  const tSchools = useTranslations("Schools");
  const tProfile = useTranslations("Profile");

  const [advice, setAdvice] = React.useState<string>("VWO");
  const [preferredConcept, setPreferredConcept] = React.useState<string>("");
  const [maxDistanceKm, setMaxDistanceKm] = React.useState<number>(4);
  const [useMyLocation, setUseMyLocation] = React.useState(false);

  React.useEffect(() => {
    if (!useMyLocation) {
      return;
    }
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      () => {
        // Position fetched but not used in current prototype yet.
      },
      () => {
        setUseMyLocation(false);
      },
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 10_000 }
    );
  }, [useMyLocation]);

  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr] items-start">
      <section className="grid gap-3 rounded-3xl border border-black/5 bg-white p-6 dark:border-white/10 dark:bg-white/5">
        <div className="text-sm font-semibold">{tProfile("title")}</div>

        <label className="grid gap-1 text-sm">
          <span className="text-xs text-zinc-600 dark:text-zinc-400">
            {tProfile("adviceLabel")}
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
            {tProfile("conceptLabel")}
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
          {tProfile("prototypeNote")}
        </div>
      </section>

      <section className="grid min-w-0">
        <FavoritesClient />
      </section>
    </div>
  );
}

