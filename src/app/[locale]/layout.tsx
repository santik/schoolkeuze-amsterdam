import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { isAppLocale, type AppLocale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { TopNav } from "@/components/top-nav";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeSwitcher } from "@/components/theme-switcher";

function LocaleSwitcher({ locale }: { locale: AppLocale }) {
  const other = locale === "nl" ? ("en" as const) : ("nl" as const);
  return (
    <Link
      href="/"
      locale={other}
      className="flex h-9 items-center justify-center rounded-full border border-sky-200 bg-white/80 px-3 text-xs font-bold tracking-wide text-sky-700 hover:bg-white dark:border-sky-300/30 dark:bg-sky-500/10 dark:text-sky-200 dark:hover:bg-sky-500/20"
    >
      {other.toUpperCase()}
    </Link>
  );
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
                🧭 {tApp("name")}
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
          <main className="mx-auto w-full max-w-6xl px-4 py-10">
            {children}
          </main>
        </div>
      </ThemeProvider>
    </NextIntlClientProvider>
  );
}
