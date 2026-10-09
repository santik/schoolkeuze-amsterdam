import type { Metadata } from "next";
import { ParentSupportLinks } from "@/components/parent-support-links";
import { PriorityGuidance } from "@/components/priority-guidance";
import { getTranslations } from "next-intl/server";

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
    title: tSeo("guideTitle"),
    description: tSeo("guideDescription"),
    alternates: {
      canonical: localizedPath(appLocale, "/guide"),
      languages: languageAlternates("/guide"),
    },
  };
}

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
              ? "Browse schools and use search filters by level, bike time, location or ZIP code."
              : "Bekijk scholen en gebruik filters op niveau, fietstijd, locatie of postcode."}
          </li>
          <li>
            {isEn
              ? "Use the map under filters: click school markers for quick name/level info."
              : "Gebruik de kaart onder de filters: klik op school-markers voor snelle naam/niveau-info."}
          </li>
          <li>
            {isEn
              ? "Open school details to fill in your own impression metrics (stars + toggles); the app calculates score and confidence."
              : "Open schooldetails en vul je eigen indrukcriteria in (sterren + schakelaars); de app berekent score en betrouwbaarheid."}
          </li>
          <li>
            {isEn
              ? "Save favorites in your profile, reorder them, and see My Score in the favorites list when available."
              : "Bewaar favorieten in je profiel, orden ze opnieuw en zie Mijn score in de favorietenlijst wanneer beschikbaar."}
          </li>
          <li>
            {isEn
              ? "Share your Profile ID/link to load the same favorites, notes and settings on another device."
              : "Deel je profiel-ID/link om dezelfde favorieten, notities en instellingen op een ander apparaat te openen."}
          </li>
          <li>
            {isEn
              ? "Export your favorites ranking to a styled PDF from the profile page."
              : "Exporteer je favorietenvolgorde als nette PDF vanaf de profielpagina."}
          </li>
        </ol>
      </section>

      <PriorityGuidance locale={isEn ? "en" : "nl"} />

      <section className="grid gap-3 rounded-3xl border border-black/5 bg-white p-8 dark:border-white/10 dark:bg-white/5">
        <h2 className="text-lg font-semibold tracking-tight">
          {isEn ? "Admissions & lottery" : "Toelating & loting"}
        </h2>
        <ul className="grid gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          {isEn ? (
            <>
              <li>
                For the 2025-2026 transition procedure, Amsterdam uses one
                central matching process (Centrale Loting & Matching) for
                mainstream secondary education.
              </li>
              <li>
                Main timeline: final primary-school advice by March 24, 2026;
                central application week March 25-31, 2026; placement result on
                April 9, 2026 at 15:30. Round 2 runs from April 9 at 16:00
                through April 14 at 16:00; its result is published April 15 at
                15:30.
              </li>
              <li>
                You submit one ranked preference list. Remaining seats are
                assigned by lottery number and preference order. Priority
                categories are now very limited (for example, hardship clause
                placements or students coming from a Kopklas at the same
                school).
              </li>
              <li>
                Not every programme participates in this central matching.
                Practical education, kovo and secondary special education use
                separate admission routes; early orientation is important.
              </li>
            </>
          ) : (
            <>
              <li>
                Voor de overstapprocedure 2025-2026 werkt Amsterdam voor het
                reguliere voortgezet onderwijs met 1 centrale procedure:
                Centrale Loting & Matching.
              </li>
              <li>
                Belangrijke data: definitief basisschooladvies uiterlijk 24
                maart 2026; centrale aanmeldweek 25 t/m 31 maart 2026;
                plaatsingsuitslag op 9 april 2026 om 15:30 uur. De 2e ronde
                loopt van 9 april 16:00 uur t/m 14 april 16:00 uur; de uitslag
                daarvan is op 15 april om 15:30 uur.
              </li>
              <li>
                Je levert 1 voorkeurslijst in. Overige plekken worden toegewezen
                op lotnummer en voorkeursvolgorde. Voorrangscategorieen zijn nu
                zeer beperkt (bijvoorbeeld hardheidsclausule of leerlingen uit
                een Kopklas op dezelfde school).
              </li>
              <li>
                Niet alle routes vallen onder de centrale matching.
                Praktijkonderwijs, kovo en voortgezet speciaal onderwijs
                volgen een aparte toelatingsroute; vroeg oriënteren is daarbij
                belangrijk.
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

      <section className="grid gap-3 rounded-3xl border border-black/5 bg-white p-8 dark:border-white/10 dark:bg-white/5">
        <h2 className="text-lg font-semibold tracking-tight">
          {isEn ? "Lottery guide" : "Loting uitgelegd"}
        </h2>
        {isEn ? (
          <div className="grid gap-3 text-sm text-zinc-700 dark:text-zinc-300">
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              How does the central lottery and matching work?
            </h3>

            <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Step 1 — Register
            </h4>
            <p>
              Every child in Grade 8 registers at their first-choice school and
              submits a preference list of up to 15 schools, in order of
              preference. This happens in March via the parent portal at{" "}
              <a
                href="https://www.elkadam.info"
                className="underline underline-offset-2"
              >
                elkadam.info
              </a>
              .
            </p>

            <hr className="border-black/5 dark:border-white/10" />

            <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Step 2 — Lot numbers
            </h4>
            <p>
              The system assigns every child a{" "}
              <strong className="font-semibold text-zinc-900 dark:text-zinc-100">
                separate lot number for each school
              </strong>{" "}
              on their list. Each number is drawn completely at random — and a
              child gets a different number for every school.
            </p>

            <hr className="border-black/5 dark:border-white/10" />

            <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Step 3 — Placement (iterative)
            </h4>
            <p>
              The system works through all preference lists and tries to place
              every child at their first-choice school.
            </p>
            <p className="font-semibold text-zinc-900 dark:text-zinc-100">
              What happens next:
            </p>
            <ol className="list-decimal pl-5">
              <li>
                At schools where more children applied than places are
                available, children with an unfavourable lot number are dropped.
              </li>
              <li>
                Dropped children are temporarily placed at their next
                preference.
              </li>
              <li>
                If that school is also oversubscribed, children with an
                unfavourable number are dropped again — including children who
                were already provisionally placed there as a first or second
                choice.
              </li>
              <li>This repeats until every child has a place.</li>
            </ol>
            <p>
              If a preference list is too short, the system automatically adds
              schools to fill the remaining slots.
            </p>

            <hr className="border-black/5 dark:border-white/10" />

            <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Step 4 — Results
            </h4>
            <p>
              Results are available on{" "}
              <strong className="font-semibold text-zinc-900 dark:text-zinc-100">
                Thursday in early April at 15:30
              </strong>{" "}
              via the parent portal at{" "}
              <a
                href="https://www.elkadam.info"
                className="underline underline-offset-2"
              >
                elkadam.info
              </a>
              .
            </p>

            <hr className="border-black/5 dark:border-white/10" />

            <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Why can&apos;t we swap places?
            </h4>
            <p>
              It can happen that two children each end up at the other&apos;s
              first-choice school — meaning both would be better off if they
              simply switched. Swapping is not allowed under the current rules
              of the system.
            </p>

            <hr className="border-black/5 dark:border-white/10" />

            <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              What if my child is not placed at their preferred school?
            </h4>
            <ParentSupportLinks locale={locale} context="non-placement" />

            <hr className="border-black/5 dark:border-white/10" />

            <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Key dates
            </h4>
            <blockquote className="rounded-2xl border border-black/5 bg-black/5 px-4 py-3 text-xs text-zinc-700 dark:border-white/10 dark:bg-white/10 dark:text-zinc-200">
              Indicative — check{" "}
              <a
                href="https://www.elkadam.info"
                className="underline underline-offset-2"
              >
                elkadam.info
              </a>{" "}
              for exact dates each year.
            </blockquote>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr>
                    <th className="border-b border-black/10 px-2 py-1 text-left font-semibold text-zinc-900 dark:border-white/10 dark:text-zinc-100">
                      Moment
                    </th>
                    <th className="border-b border-black/10 px-2 py-1 text-left font-semibold text-zinc-900 dark:border-white/10 dark:text-zinc-100">
                      When
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border-b border-black/5 px-2 py-1 text-zinc-700 dark:border-white/5 dark:text-zinc-300">
                      School advice received
                    </td>
                    <td className="border-b border-black/5 px-2 py-1 text-zinc-700 dark:border-white/5 dark:text-zinc-300">
                      Final advice: by March 24, 2026
                    </td>
                  </tr>
                  <tr>
                    <td className="border-b border-black/5 px-2 py-1 text-zinc-700 dark:border-white/5 dark:text-zinc-300">
                      Registration window
                    </td>
                    <td className="border-b border-black/5 px-2 py-1 text-zinc-700 dark:border-white/5 dark:text-zinc-300">
                      March 25–31, 2026 (round 1)
                    </td>
                  </tr>
                  <tr>
                    <td className="border-b border-black/5 px-2 py-1 text-zinc-700 dark:border-white/5 dark:text-zinc-300">
                      Lottery results
                    </td>
                    <td className="border-b border-black/5 px-2 py-1 text-zinc-700 dark:border-white/5 dark:text-zinc-300">
                      April 9, 2026, 15:30 (round 1)
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <hr className="border-black/5 dark:border-white/10" />

            <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Capacities and chances (last year)
            </h4>
            <ul className="list-disc pl-5">
              <li>Preliminary 2026 capacity list per school/track (indicative,
                subject to change).</li>
              <li>
                2025 report: 75.2% were placed at their first preference and
                91.3% within their top 3.
              </li>
              <li>
                By advice (2025): VWO 70.0% first choice; HAVO/VWO 61.7%; HAVO
                71.7%; VMBO-b t/m VMBO-k 91.1%–98.7% first choice.
              </li>
            </ul>
            <ParentSupportLinks locale={locale} context="capacity" />

            <hr className="border-black/5 dark:border-white/10" />

            <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              More information
            </h4>
            <ul className="list-disc pl-5">
              <li>
                Official parent portal:{" "}
                <a
                  href="https://www.elkadam.info"
                  className="underline underline-offset-2"
                >
                  elkadam.info
                </a>
              </li>
            </ul>
          </div>
        ) : (
          <div className="grid gap-3 text-sm text-zinc-700 dark:text-zinc-300">
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Hoe werkt de centrale loting en matching?
            </h3>

            <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Stap 1 — Aanmelden
            </h4>
            <p>
              Elke leerling in groep 8 meldt zich aan op de school van eerste
              keuze en levert een voorkeurslijst in met maximaal 15 scholen, op
              volgorde van voorkeur. Dit gebeurt in maart via het ouderportaal
              op{" "}
              <a
                href="https://www.elkadam.info"
                className="underline underline-offset-2"
              >
                elkadam.info
              </a>
              .
            </p>

            <hr className="border-black/5 dark:border-white/10" />

            <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Stap 2 — Lotnummers
            </h4>
            <p>
              De computer kent aan elke leerling voor{" "}
              <strong className="font-semibold text-zinc-900 dark:text-zinc-100">
                elke school
              </strong>{" "}
              op de lijst een apart lotnummer toe. Per school krijgt elke
              leerling dus een ander nummer — volledig willekeurig.
            </p>

            <hr className="border-black/5 dark:border-white/10" />

            <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Stap 3 — Plaatsing (iteratief)
            </h4>
            <p>
              De computer doorloopt alle voorkeurslijsten en probeert elke
              leerling op de school van eerste voorkeur te plaatsen.
            </p>
            <p className="font-semibold text-zinc-900 dark:text-zinc-100">
              Wat er daarna gebeurt:
            </p>
            <ol className="list-decimal pl-5">
              <li>
                Scholen waar meer leerlingen zijn dan plaatsen: leerlingen met
                een ongunstig lotnummer vallen af.
              </li>
              <li>
                Afgevallen leerlingen worden tijdelijk geplaatst op hun volgende
                voorkeur.
              </li>
              <li>
                Als ook die school overloopt, vallen opnieuw leerlingen met een
                ongunstig nummer af — ook leerlingen die daar eerder al als
                eerste of tweede keus waren geplaatst.
              </li>
              <li>Dit herhaalt zich totdat alle leerlingen een plek hebben.</li>
            </ol>
            <p>
              Als de voorkeurslijst te kort is, vult de computer automatisch
              scholen toe.
            </p>

            <hr className="border-black/5 dark:border-white/10" />

            <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Stap 4 — Uitslag
            </h4>
            <p>
              De uitslag is beschikbaar op{" "}
              <strong className="font-semibold text-zinc-900 dark:text-zinc-100">
                donderdag begin april om 15:30 uur
              </strong>{" "}
              via het ouderportaal op{" "}
              <a
                href="https://www.elkadam.info"
                className="underline underline-offset-2"
              >
                elkadam.info
              </a>
              .
            </p>

            <hr className="border-black/5 dark:border-white/10" />

            <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Waarom kan ik niet ruilen?
            </h4>
            <p>
              Het kan voorkomen dat twee leerlingen allebei op elkaars school
              van eerste voorkeur terechtkomen, terwijl ze allebei beter af
              zouden zijn als ze van plek wisselden. Ruilen is echter niet
              toegestaan volgens de regels van het systeem.
            </p>

            <hr className="border-black/5 dark:border-white/10" />

            <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Wat als mijn kind is uitgeloot?
            </h4>
            <ParentSupportLinks locale={locale} context="non-placement" />

            <hr className="border-black/5 dark:border-white/10" />

            <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Belangrijke data
            </h4>
            <blockquote className="rounded-2xl border border-black/5 bg-black/5 px-4 py-3 text-xs text-zinc-700 dark:border-white/10 dark:bg-white/10 dark:text-zinc-200">
              Indicatief — check{" "}
              <a
                href="https://www.elkadam.info"
                className="underline underline-offset-2"
              >
                elkadam.info
              </a>{" "}
              voor actuele datums.
            </blockquote>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr>
                    <th className="border-b border-black/10 px-2 py-1 text-left font-semibold text-zinc-900 dark:border-white/10 dark:text-zinc-100">
                      Moment
                    </th>
                    <th className="border-b border-black/10 px-2 py-1 text-left font-semibold text-zinc-900 dark:border-white/10 dark:text-zinc-100">
                      Wanneer
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border-b border-black/5 px-2 py-1 text-zinc-700 dark:border-white/5 dark:text-zinc-300">
                      Schooladvies ontvangen
                    </td>
                    <td className="border-b border-black/5 px-2 py-1 text-zinc-700 dark:border-white/5 dark:text-zinc-300">
                      Definitief advies: uiterlijk 24 maart 2026
                    </td>
                  </tr>
                  <tr>
                    <td className="border-b border-black/5 px-2 py-1 text-zinc-700 dark:border-white/5 dark:text-zinc-300">
                      Aanmeldperiode
                    </td>
                    <td className="border-b border-black/5 px-2 py-1 text-zinc-700 dark:border-white/5 dark:text-zinc-300">
                      25 t/m 31 maart 2026 (1e ronde)
                    </td>
                  </tr>
                  <tr>
                    <td className="border-b border-black/5 px-2 py-1 text-zinc-700 dark:border-white/5 dark:text-zinc-300">
                      Uitslag loting
                    </td>
                    <td className="border-b border-black/5 px-2 py-1 text-zinc-700 dark:border-white/5 dark:text-zinc-300">
                      9 april 2026, 15:30 uur (1e ronde)
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <hr className="border-black/5 dark:border-white/10" />

            <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Capaciteit en kansen (vorig jaar)
            </h4>
            <ul className="list-disc pl-5">
              <li>Voorlopige capaciteitsopgave 2026 per school/afdeling (indicatief,
                kan wijzigen).</li>
              <li>
                Verslag 2025: 75,2% geplaatst op 1e voorkeur en 91,3% binnen top
                3.
              </li>
              <li>
                Per advies (2025): vwo 70,0% 1e voorkeur; havo/vwo 61,7%; havo
                71,7%; vmbo-b t/m vmbo-k 91,1%–98,7% 1e voorkeur.
              </li>
            </ul>
            <ParentSupportLinks locale={locale} context="capacity" />

            <hr className="border-black/5 dark:border-white/10" />

            <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Meer informatie
            </h4>
            <ul className="list-disc pl-5">
              <li>
                Officieel ouderportaal:{" "}
                <a
                  href="https://www.elkadam.info"
                  className="underline underline-offset-2"
                >
                  elkadam.info
                </a>
              </li>
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
