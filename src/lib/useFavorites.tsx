"use client";

import * as React from "react";

import { useLocalStorageState } from "@/lib/useLocalStorageState";

const KEY = "schoolkeuze:favorites:v1";

export function useFavorites() {
  const [ids, setIds, hydrated] = useLocalStorageState<string[]>(KEY, []);

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

