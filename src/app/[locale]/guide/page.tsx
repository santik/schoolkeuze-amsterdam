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
        </ol>
      </section>

      <section className="grid gap-3 rounded-3xl border border-black/5 bg-white p-8 dark:border-white/10 dark:bg-white/5">
        <h2 className="text-lg font-semibold tracking-tight">
          {isEn ? "Admissions & lottery" : "Toelating & loting"}
        </h2>
        <ul className="grid gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          {isEn ? (
            <>
              <li>
                For school year 2026-2027, Amsterdam uses one central matching
                process (Centrale Loting & Matching).
              </li>
              <li>
                Main timeline: final primary-school advice by March 24, 2026;
                central application week March 25-31, 2026; placement result on
                April 9, 2026.
              </li>
              <li>
                You submit one ranked preference list. Schools first place
                students with priority (for example sibling rules), then
                remaining seats are assigned by lottery number and preference
                order.
              </li>
              <li>
                Not every program participates in this central matching.
                Practical education (`praktijkonderwijs`), international
                transition classes, and some special schools can have separate
                admission procedures.
              </li>
              <li>
                Official info and yearly updates:{" "}
                <a
                  href="https://schoolkeuze020.nl/naar-de-middelbare-school/"
                  className="underline underline-offset-2"
                >
                  schoolkeuze020.nl
                </a>{" "}
                and{" "}
                <a
                  href="https://www.osvo.nl"
                  className="underline underline-offset-2"
                >
                  osvo.nl
                </a>
                .
              </li>
            </>
          ) : (
            <>
              <li>
                Voor schooljaar 2026-2027 werkt Amsterdam met 1 centrale
                procedure: Centrale Loting & Matching.
              </li>
              <li>
                Belangrijke data: definitief basisschooladvies uiterlijk 24
                maart 2026; centrale aanmeldweek 25 t/m 31 maart 2026;
                plaatsingsuitslag op 9 april 2026.
              </li>
              <li>
                Je levert 1 voorkeurslijst in. Scholen plaatsen eerst leerlingen
                met voorrang (bijvoorbeeld broertjes/zusjes), daarna worden de
                overige plekken toegewezen op lotnummer en voorkeursvolgorde.
              </li>
              <li>
                Niet alle routes vallen onder de centrale matching.
                Praktijkonderwijs, internationale schakelklassen en sommige
                speciale scholen hebben (deels) aparte toelatingsprocedures.
              </li>
              <li>
                Officiële informatie en jaarlijkse updates:{" "}
                <a
                  href="https://schoolkeuze020.nl/naar-de-middelbare-school/"
                  className="underline underline-offset-2"
                >
                  schoolkeuze020.nl
                </a>{" "}
                en{" "}
                <a
                  href="https://www.osvo.nl"
                  className="underline underline-offset-2"
                >
                  osvo.nl
                </a>
                .
              </li>
            </>
          )}
        </ul>
        <div className="text-xs text-zinc-600 dark:text-zinc-400">
          {isEn
            ? "Note: informational only; always verify with official sources."
            : "Let op: informatief; controleer altijd bij officiële bronnen."}
        </div>
      </section>
    </div>
  );
}
