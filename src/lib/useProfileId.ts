"use client";

import * as React from "react";

import { PROFILE_ID_STORAGE_KEY } from "@/lib/profile-id";

function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `profile_${Math.random().toString(36).slice(2)}`;
}

export function useProfileId() {
  const [profileId, setProfileId] = React.useState<string>("");
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    try {
      const existing = localStorage.getItem(PROFILE_ID_STORAGE_KEY);
      if (existing && existing.trim()) {
        setProfileId(existing);
      } else {
        const next = createId();
        localStorage.setItem(PROFILE_ID_STORAGE_KEY, next);
        setProfileId(next);
      }
    } finally {
      setHydrated(true);
    }
  }, []);

  return { profileId, hydrated };
}
