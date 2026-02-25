"use client";

import { Link, usePathname } from "@/i18n/navigation";

type Props = {
  schoolsLabel: string;
  profileLabel: string;
};

export function TopNav({ schoolsLabel, profileLabel }: Props) {
  const pathname = usePathname();
  const schoolsActive = pathname === "/schools" || pathname.startsWith("/schools/");
  const profileActive = pathname === "/profile" || pathname.startsWith("/profile/");

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
          "rounded-full px-3 py-1.5 text-sm font-semibold transition-colors",
          profileActive
            ? "bg-emerald-200 text-emerald-950 ring-1 ring-emerald-300 dark:bg-emerald-300/30 dark:text-emerald-100 dark:ring-emerald-300/40"
            : "bg-emerald-100 text-emerald-900 hover:bg-emerald-200 dark:bg-emerald-400/15 dark:text-emerald-200 dark:hover:bg-emerald-400/20",
        ].join(" ")}
      >
        {profileLabel}
      </Link>
    </nav>
  );
}

