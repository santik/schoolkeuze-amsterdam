import type { Metadata } from "next";
import { FactSource } from "@/components/data-sources";
import { getExamCoverage } from "@/lib/exam-results";
import { readProvenance } from "@/lib/data-provenance";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { FavoriteButton } from "@/components/favorite-button";
import { ExamResultsCollapsible } from "@/app/[locale]/schools/[id]/exam-results-collapsible";
import { BackToSchools } from "@/app/[locale]/schools/[id]/back-to-schools";
import { ImpressionClient } from "@/app/[locale]/schools/[id]/impression-client";
import { NotesClient } from "@/app/[locale]/schools/[id]/notes-client";
import { PlacementHistorySection } from "@/app/[locale]/schools/[id]/placement-history-section";
import { getSchoolById } from "@/server/schoolsStore";
import { getPlacementSources, getSchoolPlacementData } from "@/server/placementStore";
import { buildAdmissionsInfo } from "@/lib/admissions-info";
import { isAppLocale, type AppLocale } from "@/i18n/routing";
import { languageAlternates, localizedPath } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  if (!isAppLocale(locale)) return {};
  const appLocale = locale as AppLocale;

  const school = await getSchoolById(id);
  if (!school) {
    return { title: "School not found" };
  }

  const levels = (school.levels ?? []).join(", ");
  const description =
    locale === "nl"
      ? `${school.name} — middelbare school in Amsterdam. Niveaus: ${levels || "—"}.`
      : `${school.name} — secondary school in Amsterdam. Levels: ${levels || "—"}.`;

  return {
    title: school.name,
    description,
    alternates: {
      canonical: localizedPath(appLocale, `/schools/${id}`),
      languages: languageAlternates(`/schools/${id}`),
    },
    openGraph: {
      title: school.name,
      description,
      locale: locale === "nl" ? "nl_NL" : "en_US",
    },
  };
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
  const admissionsInfo = buildAdmissionsInfo({
    name: school.name,
    websiteUrl: school.websiteUrl,
    levels: school.levels,
  });
  const lang = locale === "nl" ? "nl" : "en";
  const provenance = readProvenance(school.provenance);
  const identitySource = provenance.find(p => p.fieldGroup === "identity");
  const educationSource = provenance.find(p => p.fieldGroup === "education");
  const enrolmentSource = provenance.find(p => p.fieldGroup === "enrolment");
  const resultsSource = provenance.find(p => p.fieldGroup === "results" && p.dataYear === getExamCoverage(school.results, school.levels).year);
  const admissionsSource = provenance.find(p => p.fieldGroup === "admissions");
  const admissionsText = admissionsSource ? admissionsInfo[lang] : undefined;
  const placement = getSchoolPlacementData(school);
  const placementSources = getPlacementSources();

  const address = [
    [school.street, school.houseNumber].filter(Boolean).join(" "),
    [school.postalCode, school.city].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");
  const mapHref = address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    name: school.name,
    ...(address && {
      address: {
        "@type": "PostalAddress",
        streetAddress: [school.street, school.houseNumber].filter(Boolean).join(" "),
        postalCode: school.postalCode,
        addressLocality: school.city,
      },
    }),
    ...(school.websiteUrl && { url: school.websiteUrl }),
    ...(school.levels?.length && { educationalLevel: school.levels }),
  };

  return (
    <div className="grid gap-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BackToSchools />
      <section
        data-testid="details-hero"
        className="grid gap-3 rounded-3xl border border-black/5 bg-white p-8 dark:border-white/10 dark:bg-white/5"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1
            data-testid="details-name"
            className="text-balance text-3xl font-semibold tracking-tight"
          >
            {school.name}
          </h1>
          <FavoriteButton schoolId={school.id} />
        </div>

        <div className="grid gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          <div data-testid="details-levels">
            {(school.levels ?? []).join(" / ") || "—"}{" "}
            <FactSource provenance={educationSource} lang={lang} />
          </div>
          <div data-testid="details-address">
            {address || "—"}{" "}
            {mapHref ? (
              <a
                href={mapHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 underline underline-offset-2"
                data-testid="details-map-link"
              >
                📍 {t("openMap")}
              </a>
            ) : null}{" "}
            <FactSource provenance={identitySource} lang={lang} />
          </div>
          <div data-testid="details-website">
            {school.websiteUrl ? (
              <a
                href={school.websiteUrl}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2"
                data-testid="details-website-link"
              >
                {school.websiteUrl}
              </a>
            ) : (
              "—"
            )}
          </div>
          <div data-testid="details-student-count">
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">{t("studentCount")}:</span>{" "}
            {enrolmentSource && typeof school.size === "number" ? school.size.toLocaleString(locale) : "—"}{" "}
            <FactSource provenance={enrolmentSource} lang={lang} />
          </div>
        </div>

        <ExamResultsCollapsible results={school.results} levels={school.levels} />
        <div data-testid="exam-source"><FactSource provenance={resultsSource} lang={lang} /></div>
      </section>

      <ImpressionClient schoolId={school.id} />
      <NotesClient schoolId={school.id} />

      <PlacementHistorySection
        locale={locale}
        placement={placement}
        capacitySource={placementSources.capacity}
        matchingSource={placementSources.matching}
      />

      <section
        data-testid="details-admissions"
        className="grid gap-3 rounded-3xl border border-black/5 bg-white p-8 dark:border-white/10 dark:bg-white/5"
      >
        <h2 className="text-lg font-semibold tracking-tight">
          {t("admissionsTitle")}
        </h2>
        <FactSource provenance={admissionsSource} lang={lang} />
        {admissionsText && admissionsInfo ? (
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

            <div data-testid="admissions-sources">
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
