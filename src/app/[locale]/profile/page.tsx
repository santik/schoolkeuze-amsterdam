import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ProfileClient } from "@/app/[locale]/profile/profile-client";
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
    title: tSeo("profileTitle"),
    description: tSeo("profileDescription"),
    alternates: {
      canonical: localizedPath(appLocale, "/profile"),
      languages: languageAlternates("/profile"),
    },
  };
}

export default async function ProfilePage() {
  return (
    <div className="grid gap-4">
      <ProfileClient />
    </div>
  );
}
