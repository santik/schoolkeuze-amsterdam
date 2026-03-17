import type { Metadata } from "next";
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
              Why can't we swap places?
            </h4>
            <p>
              It can happen that two children each end up at the other's
              first-choice school — meaning both would be better off if they
              simply switched. Swapping is not allowed under the current rules
              of the system.
            </p>

            <hr className="border-black/5 dark:border-white/10" />

            <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              What if my child is not placed at their preferred school?
            </h4>
            <ul className="list-disc pl-5">
              <li>Your child will be offered a reserve school.</li>
              <li>
                You can contact schools directly about any remaining spots.
              </li>
              <li>
                Every year, Stichting VSA organises a meeting for parents of
                children who were not placed at their preferred school — see{" "}
                <a
                  href="http://www.stichtingvsa.nl"
                  className="underline underline-offset-2"
                >
                  stichtingvsa.nl
                </a>
                .
              </li>
            </ul>

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
                      By mid-February
                    </td>
                  </tr>
                  <tr>
                    <td className="border-b border-black/5 px-2 py-1 text-zinc-700 dark:border-white/5 dark:text-zinc-300">
                      Registration window
                    </td>
                    <td className="border-b border-black/5 px-2 py-1 text-zinc-700 dark:border-white/5 dark:text-zinc-300">
                      Early March to mid-March
                    </td>
                  </tr>
                  <tr>
                    <td className="border-b border-black/5 px-2 py-1 text-zinc-700 dark:border-white/5 dark:text-zinc-300">
                      Lottery results
                    </td>
                    <td className="border-b border-black/5 px-2 py-1 text-zinc-700 dark:border-white/5 dark:text-zinc-300">
                      Early April, 15:30
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

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
              <li>
                Amsterdam school boards:{" "}
                <a
                  href="https://www.verenigingosvo.nl"
                  className="underline underline-offset-2"
                >
                  verenigingosvo.nl
                </a>
              </li>
              <li>
                Parent support organisation:{" "}
                <a
                  href="http://www.stichtingvsa.nl"
                  className="underline underline-offset-2"
                >
                  stichtingvsa.nl
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
            <ul className="list-disc pl-5">
              <li>Je kind krijgt een reserveschool aangeboden.</li>
              <li>
                Je kunt contact opnemen met scholen voor eventuele resterende
                plaatsen.
              </li>
              <li>
                Elk jaar organiseert Stichting VSA een bijeenkomst voor ouders
                van uitgelote kinderen — zie{" "}
                <a
                  href="http://www.stichtingvsa.nl"
                  className="underline underline-offset-2"
                >
                  stichtingvsa.nl
                </a>
                .
              </li>
            </ul>

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
                      Uiterlijk half februari
                    </td>
                  </tr>
                  <tr>
                    <td className="border-b border-black/5 px-2 py-1 text-zinc-700 dark:border-white/5 dark:text-zinc-300">
                      Aanmeldperiode
                    </td>
                    <td className="border-b border-black/5 px-2 py-1 text-zinc-700 dark:border-white/5 dark:text-zinc-300">
                      Begin maart t/m half maart
                    </td>
                  </tr>
                  <tr>
                    <td className="border-b border-black/5 px-2 py-1 text-zinc-700 dark:border-white/5 dark:text-zinc-300">
                      Uitslag loting
                    </td>
                    <td className="border-b border-black/5 px-2 py-1 text-zinc-700 dark:border-white/5 dark:text-zinc-300">
                      Begin april, 15:30 uur
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

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
              <li>
                Schoolbesturen Amsterdam:{" "}
                <a
                  href="https://www.verenigingosvo.nl"
                  className="underline underline-offset-2"
                >
                  verenigingosvo.nl
                </a>
              </li>
              <li>
                Ouderorganisatie bij uitloting:{" "}
                <a
                  href="http://www.stichtingvsa.nl"
                  className="underline underline-offset-2"
                >
                  stichtingvsa.nl
                </a>
              </li>
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}
