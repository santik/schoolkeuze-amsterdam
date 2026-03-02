import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { isAppLocale, type AppLocale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { TopNav } from "@/components/top-nav";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { languageAlternates, localizedPath } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isAppLocale(locale)) return {};

  const tSeo = await getTranslations({ locale, namespace: "SEO" });
  const appLocale = locale as AppLocale;

  return {
    title: tSeo("homeTitle"),
    description: tSeo("defaultDescription"),
    alternates: {
      canonical: localizedPath(appLocale, "/"),
      languages: languageAlternates("/"),
    },
    openGraph: {
      title: tSeo("homeTitle"),
      description: tSeo("defaultDescription"),
      locale: locale === "nl" ? "nl_NL" : "en_US",
      type: "website",
    },
    twitter: {
      title: tSeo("homeTitle"),
      description: tSeo("defaultDescription"),
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isAppLocale(locale)) notFound();
  setRequestLocale(locale);

  const messages = await getMessages();
  const tApp = await getTranslations("App");
  const tNav = await getTranslations("Nav");

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <div className="min-h-dvh text-zinc-950 dark:text-zinc-50">
          <header className="sticky top-0 z-[1200] border-b border-white/40 bg-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/65">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
              <Link
                href="/"
                className="rounded-full bg-white/70 px-4 py-2 text-sm font-bold tracking-wide text-indigo-700 shadow-sm ring-1 ring-indigo-200/70 dark:bg-indigo-500/10 dark:text-indigo-100 dark:ring-indigo-300/30"
              >
                <span aria-hidden>🧭</span>
                <span className="hidden sm:inline"> {tApp("name")}</span>
              </Link>
              <div className="flex items-center gap-2">
                <TopNav
                  schoolsLabel={tNav("schools")}
                  profileLabel={tNav("profile")}
                />
                <div className="flex items-center gap-2 ml-2">
                  <ThemeSwitcher />
                  <LocaleSwitcher locale={locale as AppLocale} />
                </div>
              </div>
            </div>
          </header>
          <main className="mx-auto w-full max-w-6xl px-4 pt-4 pb-10">
            {children}
          </main>
        </div>
      </ThemeProvider>
    </NextIntlClientProvider>
  );
}
