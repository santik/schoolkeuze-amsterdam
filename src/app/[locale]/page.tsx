import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { isAppLocale, type AppLocale } from "@/i18n/routing";
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
    description: tSeo("homeDescription"),
    alternates: {
      canonical: localizedPath(appLocale, "/"),
      languages: languageAlternates("/"),
    },
    openGraph: {
      title: tSeo("homeTitle"),
      description: tSeo("homeDescription"),
      locale: locale === "nl" ? "nl_NL" : "en_US",
    },
  };
}

export default async function HomePage() {
  const t = await getTranslations("Home");
  const locale = await getLocale();
  const tSeo = await getTranslations("SEO");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: tSeo("siteName"),
    url: `${siteUrl}/${locale}`,
    inLanguage: locale,
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteUrl}/${locale}/schools?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <div className="grid gap-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <section className="rounded-[2rem] border border-indigo-100 bg-gradient-to-br from-yellow-100 via-orange-50 to-sky-100 p-8 shadow-lg shadow-indigo-200/40 dark:border-indigo-300/20 dark:from-indigo-500/15 dark:via-slate-900 dark:to-sky-500/10 dark:shadow-black/20">
        <div className="grid gap-3">
          <span className="inline-flex w-fit rounded-full bg-white/80 px-3 py-1 text-xs font-bold tracking-wide text-indigo-700 ring-1 ring-indigo-200 dark:bg-indigo-200/10 dark:text-indigo-200 dark:ring-indigo-200/20">
            🚀 School adventure
          </span>
          <h1 className="text-balance text-3xl font-bold leading-tight tracking-tight text-indigo-950 sm:text-4xl dark:text-indigo-100">
            {t("title")}
          </h1>
          <p className="max-w-2xl text-pretty text-base leading-7 text-indigo-900/85 dark:text-indigo-100/80">
            {t("subtitle")}
          </p>
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/schools"
            className="inline-flex h-11 items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-5 text-sm font-bold text-white shadow-sm hover:from-orange-400 hover:to-amber-400"
          >
            🏫 {t("ctaPrimary")}
          </Link>
          <Link
            href="/guide"
            className="inline-flex h-11 items-center justify-center rounded-full border border-sky-200 bg-white/75 px-5 text-sm font-bold text-sky-800 hover:bg-white dark:border-sky-300/30 dark:bg-sky-500/10 dark:text-sky-200 dark:hover:bg-sky-500/20"
          >
            🧭 {t("ctaSecondary")}
          </Link>
          <Link
            href="/feedback"
            className="inline-flex h-11 items-center justify-center rounded-full border border-emerald-200 bg-white/75 px-5 text-sm font-bold text-emerald-800 hover:bg-white dark:border-emerald-300/30 dark:bg-emerald-500/10 dark:text-emerald-200 dark:hover:bg-emerald-500/20"
          >
            💬 {t("feedbackLink")}
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
        <Link
          href="/schools"
          className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-100 p-6 shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md dark:border-amber-300/20 dark:from-amber-500/10 dark:to-orange-500/10"
        >
          <div className="text-sm font-bold text-amber-900 dark:text-amber-100">
            🎯 {t("feature1Title")}
          </div>
          <div className="mt-2 text-sm text-amber-900/85 dark:text-amber-100/80">
            {t("feature1Desc")}
          </div>
        </Link>
        <Link
          href="/profile"
          className="rounded-3xl border border-sky-200 bg-gradient-to-br from-sky-50 to-cyan-100 p-6 shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md dark:border-sky-300/20 dark:from-sky-500/10 dark:to-cyan-500/10"
        >
          <div className="text-sm font-bold text-sky-900 dark:text-sky-100">
            ⭐ {t("feature3Title")}
          </div>
          <div className="mt-2 text-sm text-sky-900/85 dark:text-sky-100/80">
            {t("feature3Desc")}
          </div>
        </Link>
      </section>
    </div>
  );
}
