"use client";

import * as React from "react";

import { useProfileId } from "@/lib/useProfileId";

function favoritesStorageKey(profileId: string) {
  return `schoolkeuze:favorites:v1:${profileId}`;
}

const EMPTY_IDS: string[] = [];

// A single module-level store shared by every useFavorites() instance, so a
// toggle in one component (e.g. the star on a school card) is immediately
// reflected in another (e.g. the nav count badge) without prop-drilling or
// context. Subscriber notifications are deferred to a microtask so a write
// that happens during render (e.g. drag-to-reorder, which updates favorites
// inside a setState updater) never triggers a setState on a sibling component
// mid-render.
const idsByProfile = new Map<string, string[]>();
const hydratedProfiles = new Set<string>();
const subscribers = new Set<() => void>();
let flushScheduled = false;

function notifySubscribers() {
  if (flushScheduled) return;
  flushScheduled = true;
  queueMicrotask(() => {
    flushScheduled = false;
    for (const sub of subscribers) sub();
  });
}

function readIds(profileId: string | null) {
  if (!profileId) return EMPTY_IDS;
  return idsByProfile.get(profileId) ?? EMPTY_IDS;
}

function writeIds(profileId: string, ids: string[]) {
  idsByProfile.set(profileId, ids);
  notifySubscribers();
}

export function useFavorites() {
  const { profileId, hydrated: profileHydrated } = useProfileId();

  const subscribe = React.useCallback((callback: () => void) => {
    subscribers.add(callback);
    return () => {
      subscribers.delete(callback);
    };
  }, []);

  const getSnapshot = React.useCallback(() => readIds(profileId), [profileId]);

  const ids = React.useSyncExternalStore(subscribe, getSnapshot, () => EMPTY_IDS);

  const [hydrated, setHydrated] = React.useState(false);

  const persist = React.useCallback(
    async (nextIds: string[]) => {
      if (!profileId) return;
      const uniqueIds = Array.from(
        new Set(nextIds.map((x) => x.trim()).filter(Boolean))
      ).slice(0, 100);
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

    // Already loaded by another instance for this profile: adopt it and skip
    // the redundant fetch.
    if (hydratedProfiles.has(profileId)) {
      setHydrated(true);
      return;
    }

    let cancelled = false;
    fetch(`/api/profile/favorites?profileId=${encodeURIComponent(profileId)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Request failed"))))
      .then((body: { ids?: string[] }) => {
        if (cancelled) return;
        const next = Array.isArray(body.ids) ? body.ids : [];
        writeIds(profileId, next);
        localStorage.setItem(favoritesStorageKey(profileId), JSON.stringify(next));
      })
      .catch(() => {
        if (cancelled) return;
        try {
          const raw = localStorage.getItem(favoritesStorageKey(profileId));
          const parsed = raw ? (JSON.parse(raw) as unknown) : [];
          writeIds(
            profileId,
            Array.isArray(parsed)
              ? parsed.filter((x): x is string => typeof x === "string")
              : []
          );
        } catch {
          writeIds(profileId, []);
        }
      })
      .finally(() => {
        if (cancelled) return;
        hydratedProfiles.add(profileId);
        setHydrated(true);
      });

    return () => {
      cancelled = true;
    };
  }, [profileHydrated, profileId]);

  const setIds = React.useCallback(
    (next: React.SetStateAction<string[]>) => {
      if (!profileId) return;
      const prev = readIds(profileId);
      const computed = typeof next === "function" ? next(prev) : next;
      writeIds(profileId, computed);
      void persist(computed);
    },
    [profileId, persist]
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
