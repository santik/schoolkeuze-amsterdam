import { getTranslations } from "next-intl/server";

export default async function GuidePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const t = await getTranslations("Nav");
  const { locale } = await params;
  const isEn = locale === "en";

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">{t("guide")}</h1>

      <section className="grid gap-3 rounded-3xl border border-black/5 bg-white p-8 dark:border-white/10 dark:bg-white/5">
        <h2 className="text-lg font-semibold tracking-tight">
          {isEn ? "How to use this app" : "Zo gebruik je deze app"}
        </h2>
        <ol className="grid gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          <li>
            {isEn
              ? "Browse and filter schools, then open details."
              : "Bekijk scholen, filter, en open de detailpagina."}
          </li>
          <li>
            {isEn
              ? "Save favorites and build a ranked list."
              : "Bewaar favorieten en bouw een voorkeursvolgorde."}
          </li>
          <li>
            {isEn
              ? "Use the Profile page for basic suggestions (prototype scoring)."
              : "Gebruik Profiel voor eerste suggesties (prototype-score)."}
          </li>
        </ol>
      </section>

      <section className="grid gap-3 rounded-3xl border border-black/5 bg-white p-8 dark:border-white/10 dark:bg-white/5">
        <h2 className="text-lg font-semibold tracking-tight">
          {isEn ? "Admissions & lottery" : "Toelating & loting"}
        </h2>
        <div className="text-sm text-zinc-700 dark:text-zinc-300">
          {isEn ? (
            <>
              Amsterdam has specific rules and a central process. This prototype
              will pull data from public sources (e.g. OSVO, DUO) and attach
              school-specific notes (priority rules, capacity, open days).
            </>
          ) : (
            <>
              Amsterdam heeft specifieke regels en een centrale procedure. Dit
              prototype gaat data uit openbare bronnen (bijv. OSVO, DUO)
              ophalen en per school tonen (voorrang, capaciteit, open dagen).
            </>
          )}
        </div>
        <div className="text-xs text-zinc-600 dark:text-zinc-400">
          {isEn
            ? "Note: informational only; always verify with official sources."
            : "Let op: informatief; controleer altijd bij officiële bronnen."}
        </div>
      </section>
    </div>
  );
}

