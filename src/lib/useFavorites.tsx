"use client";

import * as React from "react";

import { useProfileId } from "@/lib/useProfileId";

function favoritesStorageKey(profileId: string) {
  return `schoolkeuze:favorites:v1:${profileId}`;
}

export function useFavorites() {
  const { profileId, hydrated: profileHydrated } = useProfileId();
  const [ids, setIdsState] = React.useState<string[]>([]);
  const [hydrated, setHydrated] = React.useState(false);

  const persist = React.useCallback(
    async (nextIds: string[]) => {
      if (!profileId) return;
      const uniqueIds = Array.from(new Set(nextIds.map((x) => x.trim()).filter(Boolean))).slice(0, 100);
      localStorage.setItem(favoritesStorageKey(profileId), JSON.stringify(uniqueIds));
      try {
        await fetch("/api/profile/favorites", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profileId, ids: uniqueIds }),
        });
      } catch {
        // best-effort persistence
      }
    },
    [profileId]
  );

  React.useEffect(() => {
    if (profileHydrated && !profileId) {
      setHydrated(true);
      return;
    }
    if (!profileHydrated || !profileId) return;
    let cancelled = false;
    fetch(`/api/profile/favorites?profileId=${encodeURIComponent(profileId)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Request failed"))))
      .then((body: { ids?: string[] }) => {
        if (cancelled) return;
        const next = Array.isArray(body.ids) ? body.ids : [];
        setIdsState(next);
        localStorage.setItem(favoritesStorageKey(profileId), JSON.stringify(next));
      })
      .catch(() => {
        if (cancelled) return;
        try {
          const raw = localStorage.getItem(favoritesStorageKey(profileId));
          const parsed = raw ? (JSON.parse(raw) as unknown) : [];
          setIdsState(
            Array.isArray(parsed)
              ? parsed.filter((x): x is string => typeof x === "string")
              : []
          );
        } catch {
          setIdsState([]);
        }
      })
      .finally(() => {
        if (cancelled) return;
        setHydrated(true);
      });

    return () => {
      cancelled = true;
    };
  }, [profileHydrated, profileId]);

  const setIds = React.useCallback(
    (next: React.SetStateAction<string[]>) => {
      setIdsState((prev) => {
        const computed = typeof next === "function" ? next(prev) : next;
        void persist(computed);
        return computed;
      });
    },
    [persist]
  );

  const has = React.useCallback((id: string) => ids.includes(id), [ids]);

  const toggle = React.useCallback(
    (id: string) => {
      setIds((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      );
    },
    [setIds]
  );

  const remove = React.useCallback(
    (id: string) => setIds((prev) => prev.filter((x) => x !== id)),
    [setIds]
  );

  return { ids, setIds, has, toggle, remove, hydrated };
}
