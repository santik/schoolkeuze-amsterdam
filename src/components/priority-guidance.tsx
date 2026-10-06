import admissionsPriority from "@/lib/admissions-priority.json";

export function PriorityGuidance({ locale }: { locale: "nl" | "en" }) {
  const isEn = locale === "en";

  return (
    <section
      data-testid="priority-guidance"
      className="grid gap-3 rounded-3xl border border-black/5 bg-white p-8 dark:border-white/10 dark:bg-white/5"
    >
      <h2 className="text-lg font-semibold tracking-tight">
        {isEn
          ? `Priority rules for the ${admissionsPriority.procedureYear} procedure`
          : `Voorrangsregels voor de procedure ${admissionsPriority.procedureYear}`}
      </h2>
      <div className="grid gap-2 text-sm text-zinc-700 dark:text-zinc-300">
        {isEn ? (
          <>
            <p>
              In this annual procedure, there is no general sibling priority and
              no general priority for prior Montessori, Dalton or Waldorf/Vrije
              School education.
            </p>
            <p>
              The central exceptions are limited and conditional: an approved
              hardship placement, a Kopklas pupil continuing to the school that
              hosts that Kopklas when the track is suitable, and an SO/SBO pupil
              whom a suitable regular school may place with priority.
            </p>
            <p>
              These are central rules, not a promise for a particular school or
              capacity group. Specialist routes can have an intake or
              preselection procedure; check the annual procedure and the
              school’s own admissions information.
            </p>
          </>
        ) : (
          <>
            <p>
              In deze jaarlijkse procedure is er geen algemene voorrang voor
              broers of zussen en geen algemene voorrang op basis van eerder
              Montessori-, Dalton- of Waldorf/Vrije Schoolonderwijs.
            </p>
            <p>
              De centrale uitzonderingen zijn beperkt en voorwaardelijk: een
              toegekende hardheidsclausule, een Kopklasleerling die doorstroomt
              naar de school waar de Kopklas is gevestigd als de onderwijssoort
              passend is, en een SO/SBO-leerling die een passende reguliere
              school met voorrang mag plaatsen.
            </p>
            <p>
              Dit zijn centrale regels, geen toezegging voor een bepaalde school
              of capaciteitsgroep. Specialistische routes kunnen een intake of
              voorselectie hebben; controleer de jaarlijkse procedure en de
              aanmeldinformatie van de school.
            </p>
          </>
        )}
      </div>
      <a
        href={admissionsPriority.annualProcedureUrl}
        target="_blank"
        rel="noreferrer"
        className="text-sm underline underline-offset-2"
      >
        {isEn
          ? `${admissionsPriority.annualProcedureLabel} (priority rules)`
          : `${admissionsPriority.annualProcedureLabel} (voorrangsregels)`}
      </a>
    </section>
  );
}
