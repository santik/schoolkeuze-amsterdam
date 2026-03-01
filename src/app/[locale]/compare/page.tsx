import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { getSchoolsByIds } from "@/server/schoolsStore";

function formatPassRate(school: unknown) {
  const results = (school as { results?: unknown } | null)?.results as
    | { examens_2023_2024?: unknown }
    | null
    | undefined;
  const exams = results?.examens_2023_2024 as
    | Record<string, { slagingspercentage?: unknown }>
    | null
    | undefined;
  if (!exams || typeof exams !== "object") return "—";

  const prefer = [
    "VWO",
    "HAVO",
    "VMBO_TL",
    "VMBO",
    "VMBO-KL",
    "VMBO_BL",
  ];

  for (const key of prefer) {
    const v = exams[key];
    const p = v?.slagingspercentage;
    if (typeof p === "number" && Number.isFinite(p)) return `${p.toFixed(1)}%`;
  }

  for (const v of Object.values(exams)) {
    const p = v?.slagingspercentage;
    if (typeof p === "number" && Number.isFinite(p)) return `${p.toFixed(1)}%`;
  }

  return "—";
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const tNav = await getTranslations("Nav");
  const tCompare = await getTranslations("Compare");
  const tTable = await getTranslations("CompareTable");
  const { ids } = await searchParams;
  const parsed =
    ids
      ?.split(",")
      .map((s) => s.trim())
      .filter(Boolean) ?? [];

  const schools = await getSchoolsByIds(parsed);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          {tNav("compare")}
        </h1>
        <Link
          href="/schools"
          className="text-sm text-zinc-700 hover:underline dark:text-zinc-300"
        >
          {tCompare("addMore")}
        </Link>
      </div>

      {schools.length === 0 ? (
        <div className="rounded-2xl border border-black/5 bg-white p-6 text-sm text-zinc-700 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300">
          {tCompare("empty")}{" "}
          <Link href="/schools" className="underline">
            {tNav("schools")}
          </Link>{" "}
          .
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-black/5 bg-white dark:border-white/10 dark:bg-white/5">
          <table className="min-w-[720px] w-full text-left text-sm">
            <thead className="border-b border-black/5 dark:border-white/10">
              <tr>
                <th className="p-4 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                  {tTable("property")}
                </th>
                {schools.map((s) => (
                  <th key={s.id} className="p-4 font-semibold">
                    <Link href={`/schools/${s.id}`} className="hover:underline">
                      {s.name}
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-black/5 dark:border-white/10">
                <td className="p-4 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                  {tTable("level")}
                </td>
                {schools.map((s) => (
                  <td key={s.id} className="p-4">
                    {(s.levels ?? []).join(" / ") || "—"}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-black/5 dark:border-white/10">
                <td className="p-4 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                  {tTable("passRate")}
                </td>
                {schools.map((s) => (
                  <td key={s.id} className="p-4">
                    {formatPassRate(s)}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-black/5 dark:border-white/10">
                <td className="p-4 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                  {tTable("concept")}
                </td>
                {schools.map((s) => (
                  <td key={s.id} className="p-4">
                    {(s.concepts ?? []).join(", ") || "—"}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-black/5 dark:border-white/10">
                <td className="p-4 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                  {tTable("address")}
                </td>
                {schools.map((s) => (
                  <td key={s.id} className="p-4">
                    {[
                      [s.street, s.houseNumber].filter(Boolean).join(" "),
                      [s.postalCode, s.city].filter(Boolean).join(" "),
                    ]
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                  {tTable("website")}
                </td>
                {schools.map((s) => (
                  <td key={s.id} className="p-4">
                    {s.websiteUrl ? (
                      <a
                        href={s.websiteUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="underline"
                      >
                        {s.websiteUrl}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
