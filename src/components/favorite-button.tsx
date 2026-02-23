"use client";

import { useFavorites } from "@/lib/useFavorites";

export function FavoriteButton({ schoolId }: { schoolId: string }) {
  const { has, toggle } = useFavorites();
  const active = has(schoolId);

  return (
    <button
      type="button"
      onClick={() => toggle(schoolId)}
      className={[
        "inline-flex h-10 items-center justify-center rounded-full border px-4 text-sm font-medium transition-colors",
        active
          ? "border-black/20 bg-black/5 hover:bg-black/10 dark:border-white/30 dark:bg-white/10 dark:hover:bg-white/15"
          : "border-black/10 hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10",
      ].join(" ")}
    >
      {active ? "★ Favoriet" : "☆ Favoriet"}
    </button>
  );
}

