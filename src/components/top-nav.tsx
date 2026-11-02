"use client";

import * as React from "react";

import { Link, usePathname } from "@/i18n/navigation";
import { useFavorites } from "@/lib/useFavorites";

type Props = {
  schoolsLabel: string;
  profileLabel: string;
};

export function TopNav({ schoolsLabel, profileLabel }: Props) {
  const pathname = usePathname();
  const schoolsActive = pathname === "/schools" || pathname.startsWith("/schools/");
  const profileActive = pathname === "/profile" || pathname.startsWith("/profile/");

  const { ids, hydrated } = useFavorites();
  const count = ids.length;

  // Briefly pulse the badge whenever the count grows, so starring a school is
  // visibly reflected in the nav.
  const [pulse, setPulse] = React.useState(false);
  const prevCountRef = React.useRef(count);
  React.useEffect(() => {
    if (count > prevCountRef.current) {
      setPulse(true);
      const timer = window.setTimeout(() => setPulse(false), 450);
      prevCountRef.current = count;
      return () => window.clearTimeout(timer);
    }
    prevCountRef.current = count;
  }, [count]);

  const showBadge = hydrated && count > 0;

  return (
    <nav className="flex items-center gap-2">
      <Link
        href="/schools"
        className={[
          "rounded-full px-3 py-1.5 text-sm font-semibold transition-colors",
          schoolsActive
            ? "bg-amber-200 text-amber-950 ring-1 ring-amber-300 dark:bg-amber-300/30 dark:text-amber-100 dark:ring-amber-300/40"
            : "bg-amber-100 text-amber-900 hover:bg-amber-200 dark:bg-amber-400/15 dark:text-amber-200 dark:hover:bg-amber-400/20",
        ].join(" ")}
      >
        {schoolsLabel}
      </Link>
      <Link
        href="/profile"
        className={[
          "relative inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors",
          profileActive
            ? "bg-emerald-200 text-emerald-950 ring-1 ring-emerald-300 dark:bg-emerald-300/30 dark:text-emerald-100 dark:ring-emerald-300/40"
            : "bg-emerald-100 text-emerald-900 hover:bg-emerald-200 dark:bg-emerald-400/15 dark:text-emerald-200 dark:hover:bg-emerald-400/20",
        ].join(" ")}
      >
        {profileLabel}
        {showBadge ? (
          <span
            data-testid="favorites-count-badge"
            aria-hidden
            className={[
              "inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-emerald-600 px-1.5 text-xs font-bold leading-none text-white transition-transform duration-200 dark:bg-emerald-400 dark:text-emerald-950",
              pulse ? "scale-125" : "scale-100",
            ].join(" ")}
          >
            {count}
          </span>
        ) : null}
      </Link>
    </nav>
  );
}
