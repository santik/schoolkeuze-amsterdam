import type { SchoolPlacementData } from "@/lib/placement-history";

type Source = {
  academicYear: string;
  status: "preliminary" | "final";
  sourceLabel: string;
  sourceUrl: string;
};

export function PlacementHistorySection({
  locale,
  placement,
  capacitySource,
  matchingSource,
}: {
  locale: string;
  placement: SchoolPlacementData | null;
  capacitySource: Source;
  matchingSource: Source;
}) {
  const isNl = locale === "nl";
  const capacityRows = placement?.capacityGroups ?? [];
  const matchingRows = placement?.matchingGroups ?? [];

  return (
    <section
      data-testid="placement-history"
      className="grid gap-5 rounded-3xl border border-black/5 bg-white p-8 dark:border-white/10 dark:bg-white/5"
    >
      <div className="grid gap-1">
        <h2 className="text-lg font-semibold tracking-tight">
          {isNl ? "Capaciteit en vorige matchingronde" : "Capacity and previous matching round"}
        </h2>
        <p className="text-sm text-zinc-700 dark:text-zinc-300">
          {isNl
            ? "Resultaten uit een eerdere matchingronde voorspellen niet waar een individuele leerling volgend jaar wordt geplaatst."
            : "Results from an earlier matching round do not predict where an individual pupil will be placed next year."}
        </p>
      </div>

      <div className="grid gap-2">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {isNl
            ? `Voorlopige capaciteit ${capacitySource.academicYear}`
            : `Preliminary capacity ${capacitySource.academicYear}`}
        </h3>
        {capacityRows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-black/10 dark:border-white/10">
                  <th className="p-2 text-left">{isNl ? "Profiel" : "Profile"}</th>
                  <th className="p-2 text-left">{isNl ? "Leerwegen" : "Pathways"}</th>
                  <th className="p-2 text-right">{isNl ? "Plaatsen" : "Places"}</th>
                  <th className="p-2 text-left">{isNl ? "Voorselectie" : "Preselection"}</th>
                </tr>
              </thead>
              <tbody>
                {capacityRows.map((row, index) => (
                  <tr key={`${row.profile ?? "regular"}:${row.pathways.join(",")}:${index}`} className="border-b border-black/5 dark:border-white/5">
                    <td className="p-2">{row.profile ?? (isNl ? "Regulier" : "Regular")}</td>
                    <td className="p-2">{row.pathways.join(", ")}</td>
                    <td className="p-2 text-right tabular-nums">{row.capacity}</td>
                    <td className="p-2">{row.preselection ? (isNl ? "Ja" : "Yes") : (isNl ? "Nee" : "No")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {isNl ? "Niet gepubliceerd voor deze school." : "Not published for this school."}
          </p>
        )}
      </div>

      <div className="grid gap-2">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {isNl
            ? `Vorige matchingronde ${matchingSource.academicYear}`
            : `Previous matching round ${matchingSource.academicYear}`}
        </h3>
        {matchingRows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-black/10 dark:border-white/10">
                  <th className="p-2 text-left">{isNl ? "Afdeling" : "Department"}</th>
                  <th className="p-2 text-right">{isNl ? "Capaciteit" : "Capacity"}</th>
                  <th className="p-2 text-right">{isNl ? "1e voorkeur" : "First preferences"}</th>
                  <th className="p-2 text-right">{isNl ? "Geplaatst" : "Placed"}</th>
                  <th className="p-2 text-left">{isNl ? "Vraag t.o.v. capaciteit" : "Demand vs capacity"}</th>
                </tr>
              </thead>
              <tbody>
                {matchingRows.map((row, index) => {
                  const known = row.capacity != null && row.firstPreferences != null;
                  const oversubscribed = known && row.firstPreferences! > row.capacity!;
                  return (
                    <tr key={`${row.department}:${index}`} className="border-b border-black/5 dark:border-white/5">
                      <td className="p-2">{row.department}</td>
                      <td className="p-2 text-right tabular-nums">{row.capacity ?? "—"}</td>
                      <td className="p-2 text-right tabular-nums">{row.firstPreferences ?? "—"}</td>
                      <td className="p-2 text-right tabular-nums">{row.totalPlaced ?? "—"}</td>
                      <td className="p-2">
                        {!known
                          ? "—"
                          : oversubscribed
                            ? isNl ? "Meer 1e voorkeuren dan plaatsen" : "More first preferences than places"
                            : isNl ? "Niet meer 1e voorkeuren dan plaatsen" : "No more first preferences than places"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {isNl ? "Niet gepubliceerd voor deze school." : "Not published for this school."}
          </p>
        )}
      </div>

      <div className="grid gap-1 text-xs text-zinc-600 dark:text-zinc-400">
        <div className="font-semibold text-zinc-800 dark:text-zinc-200">{isNl ? "Bronnen" : "Sources"}</div>
        <a className="underline underline-offset-2" href={capacitySource.sourceUrl} target="_blank" rel="noreferrer">
          {capacitySource.sourceLabel} ({capacitySource.academicYear})
        </a>
        <a className="underline underline-offset-2" href={matchingSource.sourceUrl} target="_blank" rel="noreferrer">
          {matchingSource.sourceLabel} ({matchingSource.academicYear})
        </a>
      </div>
    </section>
  );
}

