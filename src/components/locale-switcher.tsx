"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";

import { Link, usePathname } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

export function LocaleSwitcher({ locale }: { locale: AppLocale }) {
  const other = locale === "nl" ? ("en" as const) : ("nl" as const);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const href = useMemo(() => {
    const query = searchParams.toString();
    if (!query) return pathname;
    return `${pathname}?${query}`;
  }, [pathname, searchParams]);

  return (
    <Link
      href={href}
      locale={other}
      className="flex h-9 items-center justify-center rounded-full border border-sky-200 bg-white/80 px-3 text-xs font-bold tracking-wide text-sky-700 hover:bg-white dark:border-sky-300/30 dark:bg-sky-500/10 dark:text-sky-200 dark:hover:bg-sky-500/20"
    >
      {other.toUpperCase()}
    </Link>
  );
}
