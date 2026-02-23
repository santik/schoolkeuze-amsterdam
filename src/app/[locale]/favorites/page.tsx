import { getTranslations } from "next-intl/server";

import { FavoritesClient } from "@/app/[locale]/favorites/favorites-client";

export default async function FavoritesPage() {
  const t = await getTranslations("Nav");

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">{t("favorites")}</h1>
      <FavoritesClient />
    </div>
  );
}

