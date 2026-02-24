"use client";

import * as React from "react";

import { useLocalStorageState } from "@/lib/useLocalStorageState";

const KEY = "schoolkeuze:notes:v1";

type NotesState = Record<string, string>;

export function useNotes() {
  const [notesById, setNotesById, hydrated] = useLocalStorageState<NotesState>(
    KEY,
    {}
  );

  const get = React.useCallback(
    (id: string) => notesById[id] ?? "",
    [notesById]
  );

  const set = React.useCallback(
    (id: string, note: string) => {
      const next = note.trim();
      setNotesById((prev) => {
        const copy = { ...prev };
        if (!next) {
          delete copy[id];
          return copy;
        }
        copy[id] = note;
        return copy;
      });
    },
    [setNotesById]
  );

  const remove = React.useCallback(
    (id: string) => {
      setNotesById((prev) => {
        if (!(id in prev)) return prev;
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
    },
    [setNotesById]
  );

  const has = React.useCallback((id: string) => Boolean(notesById[id]), [notesById]);

  return { notesById, setNotesById, get, set, remove, has, hydrated };
}
