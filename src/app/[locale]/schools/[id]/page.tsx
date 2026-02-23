import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { FavoriteButton } from "@/components/favorite-button";
import { Link } from "@/i18n/navigation";
import { getSchoolById } from "@/server/schoolsStore";

export default async function SchoolDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const school = await getSchoolById(id);
  if (!school) notFound();

  const t = await getTranslations("SchoolDetails");

  const address = [
    [school.street, school.houseNumber].filter(Boolean).join(" "),
    [school.postalCode, school.city].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/schools"
          className="text-sm text-zinc-700 hover:underline dark:text-zinc-300"
        >
          {t("backToSchools")}
        </Link>
        <FavoriteButton schoolId={school.id} />
      </div>

      <section className="rounded-3xl border border-black/5 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-white/5">
        <h1 className="text-balance text-3xl font-semibold tracking-tight">
          {school.name}
        </h1>
        <div className="mt-2 grid gap-1 text-sm text-zinc-700 dark:text-zinc-300">
          <div>{address || "—"}</div>
          <div>
            {(school.levels ?? []).join(" / ") || "—"} ·{" "}
            {(school.concepts ?? []).join(", ") || "—"}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {school.websiteUrl ? (
            <a
              href={school.websiteUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center justify-center rounded-full bg-black px-4 text-sm font-medium text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
            >
              {t("website")}
            </a>
          ) : null}
          <Link
            href={`/compare?ids=${encodeURIComponent(school.id)}`}
            className="inline-flex h-10 items-center justify-center rounded-full border border-black/10 px-4 text-sm font-medium hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
          >
            {t("compare")}
          </Link>
        </div>
      </section>

      <section className="grid gap-3 rounded-3xl border border-black/5 bg-white p-8 dark:border-white/10 dark:bg-white/5">
        <h2 className="text-lg font-semibold tracking-tight">
          {t("admissionsTitle")}
        </h2>
        <div className="text-sm text-zinc-700 dark:text-zinc-300">
          {t("admissionsDesc")}
        </div>
      </section>
    </div>
  );
}

