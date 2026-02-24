"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import { FavoritesClient } from "./favorites-client";
import { useLocalStorageState } from "@/lib/useLocalStorageState";

export function ProfileClient() {
  const tSchools = useTranslations("Schools");
  const tProfile = useTranslations("Profile");

  const [advice, setAdvice] = useLocalStorageState<string>(
    "schoolkeuze:profile:adviceLevel:v1",
    "VWO"
  );
  const [useMyLocation, setUseMyLocation] = React.useState(false);
  const [lat, setLat] = React.useState<number | null>(null);
  const [lon, setLon] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!useMyLocation) {
      setLat(null);
      setLon(null);
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

  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr] items-start">
      <section className="grid gap-3 rounded-3xl border border-indigo-100 bg-gradient-to-br from-white via-indigo-50 to-sky-50 p-6 shadow-sm dark:border-indigo-300/20 dark:from-slate-900 dark:via-indigo-500/10 dark:to-sky-500/10">
        <div className="text-sm font-bold text-indigo-900 dark:text-indigo-100">
          👤 {tProfile("title")}
        </div>

        <label className="grid gap-1 text-sm">
          <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-200">
            {tProfile("adviceLabel")}
          </span>
          <select
            value={advice}
            onChange={(e) => setAdvice(e.target.value)}
            className="h-10 rounded-2xl border border-indigo-200 bg-white/85 px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200 dark:border-indigo-300/30 dark:bg-slate-900/50 dark:focus:ring-indigo-300/30"
          >
            <option value="VMBO">VMBO</option>
            <option value="HAVO">HAVO</option>
            <option value="VWO">VWO</option>
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm text-indigo-900 dark:text-indigo-100">
          <input
            type="checkbox"
            checked={useMyLocation}
            onChange={(e) => setUseMyLocation(e.target.checked)}
            className="rounded border-indigo-300 bg-white text-indigo-700 focus:ring-2 focus:ring-indigo-200 dark:border-indigo-300/30 dark:bg-indigo-500/10 dark:text-indigo-100 dark:focus:ring-indigo-300/30"
          />
          {tSchools("useLocation")}
        </label>
      </section>

      <section className="grid min-w-0">
        <FavoritesClient
          userLocation={lat != null && lon != null ? { lat, lon } : null}
          adviceLevel={advice}
        />
      </section>
    </div>
  );
}
