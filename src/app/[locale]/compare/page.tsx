import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { isAppLocale, type AppLocale } from "@/i18n/routing";
import { languageAlternates, localizedPath } from "@/lib/seo";
import { getSchoolsByIds } from "@/server/schoolsStore";
import { getPlacementSources, getSchoolPlacementData } from "@/server/placementStore";
import { CompareTableClient } from "./table-client";

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
    title: tSeo("compareTitle"),
    description: tSeo("compareDescription"),
    robots: { index: false, follow: true },
    alternates: {
      canonical: localizedPath(appLocale, "/compare"),
      languages: languageAlternates("/compare"),
    },
  };
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const tNav = await getTranslations("Nav");
  const tCompare = await getTranslations("Compare");
  const { ids } = await searchParams;
  const parsed =
    ids
      ?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) ?? [];

  const schools = await getSchoolsByIds(parsed);
  const placementSources = getPlacementSources();
  const compareSchools = schools.map((s) => ({
    id: s.id,
    name: s.name,
    levels: s.levels ?? [],
    concepts: s.concepts ?? [],
    websiteUrl: s.websiteUrl,
    size: s.size,
    results: s.results,
    placement: getSchoolPlacementData(s),
  }));

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          {tNav("compare")}
        </h1>
        <Link
          href="/schools"
          className="text-sm text-zinc-700 hover:underline dark:text-zinc-300"
        >
          {tCompare("addMore")}
        </Link>
      </div>

      {schools.length === 0 ? (
        <div className="rounded-2xl border border-black/5 bg-white p-6 text-sm text-zinc-700 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300">
          {tCompare("empty")}{" "}
          <Link href="/schools" className="underline">
            {tNav("schools")}
          </Link>{" "}
          .
        </div>
      ) : (
        <CompareTableClient
          schools={compareSchools}
          capacitySource={placementSources.capacity}
          matchingSource={placementSources.matching}
        />
      )}
    </div>
  );
}
