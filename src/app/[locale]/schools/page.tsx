import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { SchoolsExplorer } from "@/app/[locale]/schools/schools-explorer";
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
    title: tSeo("schoolsTitle"),
    description: tSeo("schoolsDescription"),
    alternates: {
      canonical: localizedPath(appLocale, "/schools"),
      languages: languageAlternates("/schools"),
    },
  };
}

export default async function SchoolsPage() {
  return (
    <div className="grid gap-4">
      <SchoolsExplorer />
    </div>
  );
}
