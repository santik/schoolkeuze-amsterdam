import type { MetadataRoute } from "next";

import { routing } from "@/i18n/routing";
import { getSiteUrl } from "@/lib/seo";
import { getAllSchoolIds } from "@/server/schoolsStore";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const staticRoutes = ["", "/schools", "/guide"];
  const now = new Date();

  const schoolIds = await getAllSchoolIds();

  const staticEntries = routing.locales.flatMap((locale) =>
    staticRoutes.map((route) => ({
      url: `${siteUrl}/${locale}${route}`,
      lastModified: now,
      changeFrequency: (route === "" ? "daily" : "weekly") as "daily" | "weekly",
      priority: route === "" ? 1 : 0.7,
    }))
  );

  const schoolEntries = routing.locales.flatMap((locale) =>
    schoolIds.map((id) => ({
      url: `${siteUrl}/${locale}/schools/${id}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }))
  );

  return [...staticEntries, ...schoolEntries];
}
