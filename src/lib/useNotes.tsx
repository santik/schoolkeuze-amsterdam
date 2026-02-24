"use client";

import * as React from "react";

import { useProfileId } from "@/lib/useProfileId";

type NotesState = Record<string, string>;

export function useNotes() {
  const { profileId, hydrated: profileHydrated } = useProfileId();
  const [notesById, setNotesById] = React.useState<NotesState>({});
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    if (profileHydrated && !profileId) {
      setHydrated(true);
      return;
    }
    if (!profileHydrated || !profileId) return;
    let cancelled = false;

    fetch(`/api/profile/notes?profileId=${encodeURIComponent(profileId)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Request failed"))))
      .then((body: { notesById?: NotesState }) => {
        if (cancelled) return;
        setNotesById(body.notesById && typeof body.notesById === "object" ? body.notesById : {});
      })
      .catch(() => {
        if (cancelled) return;
        setNotesById({});
      })
      .finally(() => {
        if (cancelled) return;
        setHydrated(true);
      });

    return () => {
      cancelled = true;
    };
  }, [profileHydrated, profileId]);

  const get = React.useCallback(
    (id: string) => notesById[id] ?? "",
    [notesById]
  );

  const set = React.useCallback(
    (id: string, note: string) => {
      const next = note;
      setNotesById((prev) => {
        const copy = { ...prev };
        if (!next.trim()) {
          delete copy[id];
        } else {
          copy[id] = next;
        }
        return copy;
      });

      if (!profileId) return;
      void fetch("/api/profile/notes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, schoolId: id, note }),
      }).catch(() => {
        // best-effort persistence
      });
    },
    [profileId]
  );

  const remove = React.useCallback((id: string) => set(id, ""), [set]);

  const has = React.useCallback((id: string) => Boolean(notesById[id]), [notesById]);

  return { notesById, setNotesById, get, set, remove, has, hydrated };
}
