import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";

export default async function HomePage() {
  const t = await getTranslations("Home");

  return (
    <div className="grid gap-10">
      <section className="rounded-3xl border border-black/5 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-white/5">
        <div className="grid gap-3">
          <h1 className="text-balance text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            {t("title")}
          </h1>
          <p className="max-w-2xl text-pretty text-base leading-7 text-zinc-700 dark:text-zinc-300">
            {t("subtitle")}
          </p>
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/schools"
            className="inline-flex h-11 items-center justify-center rounded-full bg-black px-5 text-sm font-medium text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90"
          >
            {t("ctaPrimary")}
          </Link>
          <Link
            href="/guide"
            className="inline-flex h-11 items-center justify-center rounded-full border border-black/10 bg-transparent px-5 text-sm font-medium hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
          >
            {t("ctaSecondary")}
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-black/5 bg-white p-6 dark:border-white/10 dark:bg-white/5">
          <div className="text-sm font-semibold">{t("feature1Title")}</div>
          <div className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
            {t("feature1Desc")}
          </div>
        </div>
        <div className="rounded-2xl border border-black/5 bg-white p-6 dark:border-white/10 dark:bg-white/5">
          <div className="text-sm font-semibold">{t("feature2Title")}</div>
          <div className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
            {t("feature2Desc")}
          </div>
        </div>
        <div className="rounded-2xl border border-black/5 bg-white p-6 dark:border-white/10 dark:bg-white/5">
          <div className="text-sm font-semibold">{t("feature3Title")}</div>
          <div className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
            {t("feature3Desc")}
          </div>
        </div>
      </section>
    </div>
  );
}

