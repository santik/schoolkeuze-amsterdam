"use client";

import * as React from "react";

import { useProfileId } from "@/lib/useProfileId";

type AdviceLevel = "VMBO" | "HAVO" | "VWO";

function settingsStorageKey(profileId: string) {
  return `schoolkeuze:settings:v1:${profileId}`;
}

function normalizeAdvice(value: unknown): AdviceLevel {
  if (value === "VMBO" || value === "HAVO" || value === "VWO") return value;
  return "VWO";
}

export function useProfileSettings() {
  const { profileId, hydrated: profileHydrated } = useProfileId();
  const [adviceLevel, setAdviceLevelState] = React.useState<AdviceLevel>("VWO");
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    if (profileHydrated && !profileId) {
      setHydrated(true);
      return;
    }
    if (!profileHydrated || !profileId) return;

    let cancelled = false;
    setHydrated(false);

    fetch(`/api/profile/settings?profileId=${encodeURIComponent(profileId)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Request failed"))))
      .then((body: { adviceLevel?: AdviceLevel }) => {
        if (cancelled) return;
        const next = normalizeAdvice(body.adviceLevel);
        setAdviceLevelState(next);
        localStorage.setItem(settingsStorageKey(profileId), next);
      })
      .catch(() => {
        if (cancelled) return;
        const fromLocal = localStorage.getItem(settingsStorageKey(profileId));
        setAdviceLevelState(normalizeAdvice(fromLocal));
      })
      .finally(() => {
        if (cancelled) return;
        setHydrated(true);
      });

    return () => {
      cancelled = true;
    };
  }, [profileHydrated, profileId]);

  const setAdviceLevel = React.useCallback(
    (next: AdviceLevel) => {
      setAdviceLevelState(next);
      if (!profileId) return;
      localStorage.setItem(settingsStorageKey(profileId), next);

      void fetch("/api/profile/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, adviceLevel: next }),
      }).catch(() => {
        // best-effort persistence
      });
    },
    [profileId]
  );

  return { adviceLevel, setAdviceLevel, hydrated };
}
