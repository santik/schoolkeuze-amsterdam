import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { FeedbackForm } from "@/app/[locale]/feedback/feedback-form";
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
    title: tSeo("feedbackTitle"),
    description: tSeo("feedbackDescription"),
    alternates: {
      canonical: localizedPath(appLocale, "/feedback"),
      languages: languageAlternates("/feedback"),
    },
  };
}

export default async function FeedbackPage() {
  const t = await getTranslations("Feedback");
  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
      <FeedbackForm />
    </div>
  );
}
