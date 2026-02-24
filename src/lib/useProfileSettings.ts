"use client";

import * as React from "react";

import { useProfileId } from "@/lib/useProfileId";

type AdviceLevel = "VMBO" | "HAVO" | "VWO";

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
        setAdviceLevelState(body.adviceLevel ?? "VWO");
      })
      .catch(() => {
        if (cancelled) return;
        setAdviceLevelState("VWO");
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

