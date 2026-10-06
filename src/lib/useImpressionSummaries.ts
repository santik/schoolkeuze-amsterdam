"use client";

import * as React from "react";
import { calculateImpressionSummary, impressionStorageKey, type ScoreSummary } from "./impression-score";

export function useImpressionSummaries(profileId: string, schoolIds: string[]) {
  const idsKey = JSON.stringify(schoolIds);
  const [result, setResult] = React.useState<{
    key: string;
    summaries: Map<string, ScoreSummary>;
  }>({ key: "", summaries: new Map() });
  const key = `${profileId}:${idsKey}`;

  React.useEffect(() => {
    const ids = JSON.parse(idsKey) as string[];
    if (!profileId || !ids.length) return;
    let disposed = false;
    let generation = 0;
    const load = async () => {
      const current = ++generation;
      const summaries = new Map<string, ScoreSummary>();
      const readLocal = () => {
        for (const id of ids) {
          try {
            summaries.set(id, calculateImpressionSummary(JSON.parse(
              localStorage.getItem(impressionStorageKey(profileId, id)) ?? "null"
            )));
          } catch { /* Ignore one corrupt or unavailable cache entry. */ }
        }
      };
      try {
        const query = new URLSearchParams({ profileId, schoolIds: ids.join(",") });
        const response = await fetch(`/api/profile/impression?${query}`);
        if (!response.ok) throw new Error("Impressions unavailable");
        const body = await response.json() as { items: { schoolId: string; metrics: unknown }[] };
        if (!Array.isArray(body.items)) throw new Error("Invalid impressions");
        for (const item of body.items) {
          summaries.set(item.schoolId, calculateImpressionSummary(item.metrics));
        }
      } catch {
        readLocal();
      }
      if (!disposed && current === generation) setResult({ key, summaries });
    };
    const refreshVisible = () => { if (document.visibilityState === "visible") void load(); };
    void load();
    window.addEventListener("focus", refreshVisible);
    window.addEventListener("pageshow", refreshVisible);
    window.addEventListener("storage", refreshVisible);
    document.addEventListener("visibilitychange", refreshVisible);
    return () => {
      disposed = true;
      window.removeEventListener("focus", refreshVisible);
      window.removeEventListener("pageshow", refreshVisible);
      window.removeEventListener("storage", refreshVisible);
      document.removeEventListener("visibilitychange", refreshVisible);
    };
  }, [profileId, idsKey, key]);

  return result.key === key ? result.summaries : new Map<string, ScoreSummary>();
}
