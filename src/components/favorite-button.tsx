"use client";

import { useFavorites } from "@/lib/useFavorites";

export function FavoriteButton({ schoolId }: { schoolId: string }) {
  const { has, toggle } = useFavorites();
  const active = has(schoolId);

  return (
    <button
      type="button"
      onClick={() => toggle(schoolId)}
      aria-label={active ? "Remove favorite" : "Add favorite"}
      className={[
        "inline-flex h-9 min-w-0 items-center justify-center rounded-full border px-3 text-lg leading-none font-semibold transition-colors",
        active
          ? "border-amber-300 bg-amber-100 text-amber-700 hover:bg-amber-200 dark:border-amber-300/40 dark:bg-amber-400/15 dark:text-amber-200 dark:hover:bg-amber-400/25"
          : "border-indigo-300 bg-indigo-50 text-indigo-900 hover:bg-indigo-100 dark:border-indigo-300/30 dark:bg-indigo-500/10 dark:text-indigo-200 dark:hover:bg-indigo-500/20",
      ].join(" ")}
    >
      {active ? "★" : "☆"}
    </button>
  );
}
