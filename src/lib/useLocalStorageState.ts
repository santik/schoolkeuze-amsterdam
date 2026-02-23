"use client";

import * as React from "react";

export function useLocalStorageState<T>(key: string, initialValue: T) {
  const [value, setValue] = React.useState<T>(initialValue);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw != null) setValue(JSON.parse(raw) as T);
    } catch {
      // ignore
    } finally {
      setHydrated(true);
    }
  }, [key]);

  React.useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore
    }
  }, [hydrated, key, value]);

  return [value, setValue, hydrated] as const;
}

