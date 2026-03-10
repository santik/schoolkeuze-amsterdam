"use client";

import * as React from "react";

import { normalizeProfileId, PROFILE_ID_STORAGE_KEY } from "@/lib/profile-id";

export function useProfileId() {
  const [profileId, setProfileIdState] = React.useState<string>("");
  const [hydrated, setHydrated] = React.useState(false);

  const setProfileId = React.useCallback((nextProfileId: string) => {
    const normalized = normalizeProfileId(nextProfileId);
    if (!normalized) return false;
    localStorage.setItem(PROFILE_ID_STORAGE_KEY, normalized);
    setProfileIdState(normalized);
    return true;
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const url = new URL(window.location.href);
        const fromQuery = normalizeProfileId(url.searchParams.get("profileId"));
        const existing = normalizeProfileId(
          localStorage.getItem(PROFILE_ID_STORAGE_KEY)
        );

        const nextExisting = fromQuery ?? existing;
        if (nextExisting) {
          localStorage.setItem(PROFILE_ID_STORAGE_KEY, nextExisting);
          setProfileIdState(nextExisting);
          return;
        }

        let generated = "";
        try {
          const res = await fetch("/api/profile/new-id");
          const body = (await res.json().catch(() => null)) as
            | { id?: unknown }
            | null;
          if (res.ok && body && typeof body.id === "string") {
            generated = body.id;
          }
        } catch {
          // fall back below
        }

        if (!generated) {
          generated = `profile_${Math.random().toString(36).slice(2, 10)}`;
        }

        localStorage.setItem(PROFILE_ID_STORAGE_KEY, generated);
        setProfileIdState(generated);
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { profileId, hydrated, setProfileId };
}
