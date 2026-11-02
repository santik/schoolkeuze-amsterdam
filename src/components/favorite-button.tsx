"use client";

import * as React from "react";

import { useFavorites } from "@/lib/useFavorites";

export function FavoriteButton({ schoolId }: { schoolId: string }) {
  const { has, toggle } = useFavorites();
  const active = has(schoolId);

  // Pop the star when it becomes active, so saving to the list feels like a
  // deliberate "added" moment rather than a silent toggle.
  const [pop, setPop] = React.useState(false);

  function onClick() {
    if (!active) {
      setPop(true);
      window.setTimeout(() => setPop(false), 300);
    }
    toggle(schoolId);
  }

  return (
    <button
      type="button"
      data-testid="favorite-toggle"
      onClick={onClick}
      aria-label={active ? "Remove favorite" : "Add favorite"}
      aria-pressed={active}
      className={[
        "inline-flex h-9 min-w-0 items-center justify-center rounded-full border px-3 text-lg leading-none font-semibold transition-colors",
        active
          ? "border-amber-300 bg-amber-100 text-amber-700 hover:bg-amber-200 dark:border-amber-300/40 dark:bg-amber-400/15 dark:text-amber-200 dark:hover:bg-amber-400/25"
          : "border-indigo-300 bg-indigo-50 text-indigo-900 hover:bg-indigo-100 dark:border-indigo-300/30 dark:bg-indigo-500/10 dark:text-indigo-200 dark:hover:bg-indigo-500/20",
      ].join(" ")}
    >
      <span
        className={[
          "inline-block transition-transform duration-200",
          pop ? "scale-150" : "scale-100",
        ].join(" ")}
      >
        {active ? "★" : "☆"}
      </span>
    </button>
  );
}
