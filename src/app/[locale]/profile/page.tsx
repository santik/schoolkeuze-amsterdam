import { getTranslations } from "next-intl/server";

import { ProfileClient } from "@/app/[locale]/profile/profile-client";

export default async function ProfilePage() {
  const t = await getTranslations("Nav");

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-bold tracking-tight text-indigo-950 dark:text-indigo-100">
        {t("profile")}
      </h1>
      <ProfileClient />
    </div>
  );
}
