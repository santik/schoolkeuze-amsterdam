import { routing, type AppLocale } from "@/i18n/routing";

export function getSiteUrl() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return "http://localhost:3000";
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

export function localizedPath(locale: AppLocale, path: string) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `/${locale}${normalized === "/" ? "" : normalized}`;
}

export function languageAlternates(path: string) {
  return Object.fromEntries(
    routing.locales.map((locale) => [locale, localizedPath(locale, path)])
  ) as Record<AppLocale, string>;
}
