import { getTranslations } from "next-intl/server";

import { SchoolsExplorer } from "@/app/[locale]/schools/schools-explorer";

export default async function SchoolsPage() {
  const t = await getTranslations("Nav");

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">{t("schools")}</h1>
      <SchoolsExplorer />
    </div>
  );
}

