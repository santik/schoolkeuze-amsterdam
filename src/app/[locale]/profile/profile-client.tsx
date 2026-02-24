"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import { FavoritesClient } from "./favorites-client";
import { normalizeProfileId } from "@/lib/profile-id";
import { useProfileId } from "@/lib/useProfileId";
import { useProfileSettings } from "@/lib/useProfileSettings";

export function ProfileClient() {
  const tSchools = useTranslations("Schools");
  const tProfile = useTranslations("Profile");
  const { profileId, hydrated: profileHydrated, setProfileId } = useProfileId();
  const { adviceLevel, setAdviceLevel } = useProfileSettings();
  const [profileInput, setProfileInput] = React.useState("");
  const [profileMessage, setProfileMessage] = React.useState("");
  const [useMyLocation, setUseMyLocation] = React.useState(false);
  const [lat, setLat] = React.useState<number | null>(null);
  const [lon, setLon] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (!profileHydrated) return;
    setProfileInput(profileId);
  }, [profileHydrated, profileId]);

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

  function onLoadProfile() {
    const normalized = normalizeProfileId(profileInput);
    if (!normalized) {
      setProfileMessage(tProfile("profileIdInvalid"));
      return;
    }
    const ok = setProfileId(normalized);
    if (!ok) {
      setProfileMessage(tProfile("profileIdInvalid"));
      return;
    }
    setProfileMessage(tProfile("profileIdLoaded"));
  }

  async function onCopyShareLink() {
    if (!profileId) return;
    const url = new URL(window.location.href);
    url.searchParams.set("profileId", profileId);
    try {
      await navigator.clipboard.writeText(url.toString());
      setProfileMessage(tProfile("shareCopied"));
    } catch {
      setProfileMessage(tProfile("shareCopyFailed"));
    }
  }

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
            value={adviceLevel}
            onChange={(e) => setAdviceLevel(e.target.value as "VMBO" | "HAVO" | "VWO")}
            className="h-10 rounded-2xl border border-indigo-200 bg-white/85 px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200 dark:border-indigo-300/30 dark:bg-slate-900/50 dark:focus:ring-indigo-300/30"
          >
            <option value="VMBO">VMBO</option>
            <option value="HAVO">HAVO</option>
            <option value="VWO">VWO</option>
          </select>
        </label>

        <div className="grid gap-2 rounded-2xl border border-sky-200 bg-white/70 p-3 dark:border-sky-300/30 dark:bg-sky-500/10">
          <div className="text-xs font-semibold text-indigo-700 dark:text-indigo-200">
            {tProfile("profileIdLabel")}
          </div>
          <input
            value={profileInput}
            onChange={(e) => {
              setProfileInput(e.target.value);
              if (profileMessage) setProfileMessage("");
            }}
            placeholder={tProfile("profileIdPlaceholder")}
            className="h-10 rounded-2xl border border-indigo-200 bg-white/85 px-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200 dark:border-indigo-300/30 dark:bg-slate-900/50 dark:focus:ring-indigo-300/30"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onLoadProfile}
              className="inline-flex h-9 items-center justify-center rounded-full border border-violet-300 bg-violet-50 px-3 text-sm font-semibold text-violet-900 hover:bg-violet-100 dark:border-violet-300/30 dark:bg-violet-500/10 dark:text-violet-200 dark:hover:bg-violet-500/20"
            >
              {tProfile("loadProfile")}
            </button>
            <button
              type="button"
              onClick={onCopyShareLink}
              className="inline-flex h-9 items-center justify-center rounded-full border border-sky-300 bg-sky-50 px-3 text-sm font-semibold text-sky-900 hover:bg-sky-100 dark:border-sky-300/30 dark:bg-sky-500/10 dark:text-sky-200 dark:hover:bg-sky-500/20"
            >
              {tProfile("copyShareLink")}
            </button>
          </div>
          <div className="text-xs text-indigo-700/90 dark:text-indigo-200/90">
            {profileMessage || tProfile("shareHint")}
          </div>
        </div>

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
          adviceLevel={adviceLevel}
        />
      </section>
    </div>
  );
}
