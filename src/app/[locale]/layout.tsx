import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { isAppLocale, type AppLocale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeSwitcher } from "@/components/theme-switcher";

function LocaleSwitcher({ locale }: { locale: AppLocale }) {
  const other = locale === "nl" ? ("en" as const) : ("nl" as const);
  return (
    <Link
      href="/"
      locale={other}
      className="flex h-8 items-center justify-center rounded-full border border-black/10 px-3 text-sm font-medium hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
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
        <div className="min-h-dvh bg-zinc-50 text-zinc-950 dark:bg-black dark:text-zinc-50">
          <header className="sticky top-0 z-10 border-b border-black/5 bg-zinc-50/80 backdrop-blur dark:border-white/10 dark:bg-black/60">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
              <Link href="/" className="font-semibold tracking-tight">
                {tApp("name")}
              </Link>
              <nav className="flex items-center gap-2">
                <Link
                  href="/schools"
                  className="rounded-full px-3 py-1 text-sm hover:bg-black/5 dark:hover:bg-white/10"
                >
                  {tNav("schools")}
                </Link>
                <Link
                  href="/profile"
                  className="rounded-full px-3 py-1 text-sm hover:bg-black/5 dark:hover:bg-white/10"
                >
                  {tNav("profile")}
                </Link>
                <div className="flex items-center gap-2 ml-2">
                  <ThemeSwitcher />
                  <LocaleSwitcher locale={locale as AppLocale} />
                </div>
              </nav>
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

