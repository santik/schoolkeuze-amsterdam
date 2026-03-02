import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { FavoriteButton } from "@/components/favorite-button";
import { ExamResultsCollapsible } from "@/app/[locale]/schools/[id]/exam-results-collapsible";
import { ImpressionClient } from "@/app/[locale]/schools/[id]/impression-client";
import { NotesClient } from "@/app/[locale]/schools/[id]/notes-client";
import { getSchoolById } from "@/server/schoolsStore";
import type { AdmissionsInfo } from "@/lib/admissions-info";

function parseAdmissionsInfo(value: unknown): AdmissionsInfo | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (!v.nl || !v.en || !v.sources) return null;
  return value as AdmissionsInfo;
}

type ExamStats = {
  kandidaten?: number;
  geslaagden?: number;
  slagingspercentage?: number;
  gem_cijfer_lijst?: number;
};

function getExamRows(results: unknown) {
  const r = (results ?? {}) as { examens_2023_2024?: unknown };
  const exams = r.examens_2023_2024 as Record<string, ExamStats> | undefined | null;
  if (!exams || typeof exams !== "object") return [];

  const preferredOrder = ["VWO", "HAVO", "VMBO_TL", "VMBO_KL", "VMBO_BL", "VMBO"];
  const keys = Object.keys(exams);
  keys.sort((a, b) => {
    const ai = preferredOrder.indexOf(a);
    const bi = preferredOrder.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  return keys.map((level) => ({ level, ...(exams[level] ?? {}) }));
}

export default async function SchoolDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const school = await getSchoolById(id);
  if (!school) notFound();

  const t = await getTranslations("SchoolDetails");
  const locale = await getLocale();
  const admissionsInfo = parseAdmissionsInfo((school as { admissionsInfo?: unknown }).admissionsInfo);
  const lang = locale === "nl" ? "nl" : "en";
  const admissionsText = admissionsInfo?.[lang];
  const examRows = getExamRows(school.results);

  const address = [
    [school.street, school.houseNumber].filter(Boolean).join(" "),
    [school.postalCode, school.city].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");
  const mapHref = address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    : null;

  return (
    <div className="grid gap-6">
      <section className="grid gap-3 rounded-3xl border border-black/5 bg-white p-8 dark:border-white/10 dark:bg-white/5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-balance text-3xl font-semibold tracking-tight">
            {school.name}
          </h1>
          <FavoriteButton schoolId={school.id} />
        </div>

        <div className="grid gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          <div>
            {(school.levels ?? []).join(" / ") || "—"}
          </div>
          <div>
            {address || "—"}{" "}
            {mapHref ? (
              <a
                href={mapHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 underline underline-offset-2"
              >
                📍 {t("openMap")}
              </a>
            ) : null}
          </div>
          <div>
            {school.websiteUrl ? (
              <a
                href={school.websiteUrl}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2"
              >
                {school.websiteUrl}
              </a>
            ) : (
              "—"
            )}
          </div>
          <div>
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">{t("studentCount")}:</span>{" "}
            {typeof school.size === "number" ? school.size.toLocaleString(locale) : "—"}
          </div>
          <div>
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">{t("denomination")}:</span>{" "}
            {school.denomination || "—"}
          </div>
        </div>

        <ExamResultsCollapsible
          title={t("examResults")}
          noResultsLabel={t("noExamResults")}
          levelHeader={t("levelHeader")}
          candidatesHeader={t("candidatesHeader")}
          passedHeader={t("passedHeader")}
          passRateHeader={t("passRateHeader")}
          avgGradeHeader={t("avgGradeHeader")}
          rows={examRows}
        />
      </section>

      <ImpressionClient schoolId={school.id} />
      <NotesClient schoolId={school.id} />

      <section className="grid gap-3 rounded-3xl border border-black/5 bg-white p-8 dark:border-white/10 dark:bg-white/5">
        <h2 className="text-lg font-semibold tracking-tight">
          {t("admissionsTitle")}
        </h2>
        {admissionsText ? (
          <div className="grid gap-3 text-sm text-zinc-700 dark:text-zinc-300">
            <p>{admissionsText.summary}</p>

            <div>
              <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                {lang === "nl" ? "Belangrijke data" : "Key dates"}
              </div>
              <ul className="mt-1 list-disc pl-5">
                {admissionsText.timeline.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div>
              <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                {lang === "nl" ? "Specifiek voor deze school" : "Specific for this school"}
              </div>
              <ul className="mt-1 list-disc pl-5">
                {admissionsText.schoolSpecific.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div>
              <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                {lang === "nl" ? "Aanvullende regels" : "Additional rules"}
              </div>
              <ul className="mt-1 list-disc pl-5">
                {admissionsText.notes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div>
              <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                {lang === "nl" ? "Bronnen" : "Sources"}
              </div>
              <ul className="mt-1 list-disc pl-5">
                {admissionsInfo.sources.map((source) => (
                  <li key={`${source.label}:${source.url}`}>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="underline underline-offset-2"
                    >
                      {source.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div className="text-sm text-zinc-700 dark:text-zinc-300">
            {t("admissionsDesc")}
          </div>
        )}
      </section>
    </div>
  );
}
