"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import { FavoritesClient } from "./favorites-client";

export function ProfileClient() {
  const tSchools = useTranslations("Schools");
  const tProfile = useTranslations("Profile");

  const [advice, setAdvice] = React.useState<string>("VWO");
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

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={useMyLocation}
            onChange={(e) => setUseMyLocation(e.target.checked)}
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

