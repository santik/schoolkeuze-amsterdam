import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { getSchoolsByIds } from "@/server/schoolsStore";
import { CompareTableClient } from "./table-client";

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
  const compareSchools = schools.map((s) => ({
    id: s.id,
    name: s.name,
    levels: s.levels ?? [],
    concepts: s.concepts ?? [],
    websiteUrl: s.websiteUrl,
    size: s.size,
    results: s.results,
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
        <CompareTableClient schools={compareSchools} />
      )}
    </div>
  );
}
