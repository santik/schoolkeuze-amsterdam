"use client";

import * as React from "react";

import { normalizeProfileId, PROFILE_ID_STORAGE_KEY } from "@/lib/profile-id";

function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `profile_${Math.random().toString(36).slice(2)}`;
}

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
    try {
      const url = new URL(window.location.href);
      const fromQuery = normalizeProfileId(url.searchParams.get("profileId"));
      const existing = normalizeProfileId(localStorage.getItem(PROFILE_ID_STORAGE_KEY));

      const next = fromQuery ?? existing ?? createId();
      localStorage.setItem(PROFILE_ID_STORAGE_KEY, next);
      setProfileIdState(next);
    } finally {
      setHydrated(true);
    }
  }, []);

  return { profileId, hydrated, setProfileId };
}
