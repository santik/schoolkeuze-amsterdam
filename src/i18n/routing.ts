export const routing = {
  locales: ["nl", "en"] as const,
  defaultLocale: "nl" as const,
};

export type AppLocale = (typeof routing.locales)[number];

export function isAppLocale(locale: string): locale is AppLocale {
  return (routing.locales as readonly string[]).includes(locale);
}

