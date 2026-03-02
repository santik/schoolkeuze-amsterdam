"use client";

import * as React from "react";

type ExamRow = {
  level: string;
  kandidaten?: number;
  geslaagden?: number;
  slagingspercentage?: number;
  gem_cijfer_lijst?: number;
};

type Props = {
  title: string;
  noResultsLabel: string;
  levelHeader: string;
  candidatesHeader: string;
  passedHeader: string;
  passRateHeader: string;
  avgGradeHeader: string;
  rows: ExamRow[];
};

export function ExamResultsCollapsible({
  title,
  noResultsLabel,
  levelHeader,
  candidatesHeader,
  passedHeader,
  passRateHeader,
  avgGradeHeader,
  rows,
}: Props) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="grid gap-2 rounded-3xl border border-sky-200 bg-white/90 p-3 shadow-sm dark:border-sky-300/20 dark:bg-sky-500/10">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex items-center justify-between text-left text-sm font-semibold text-sky-900 dark:text-sky-100"
      >
        <span>{title}</span>
        <span>{open ? "▾" : "▸"}</span>
      </button>

      {open ? (
        rows.length === 0 ? (
          <div className="text-sm text-zinc-700 dark:text-zinc-300">{noResultsLabel}</div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-black/10 dark:border-white/10">
            <table className="min-w-[560px] w-full text-left text-sm">
              <thead className="border-b border-black/10 dark:border-white/10">
                <tr>
                  <th className="p-3">{levelHeader}</th>
                  <th className="p-3">{candidatesHeader}</th>
                  <th className="p-3">{passedHeader}</th>
                  <th className="p-3">{passRateHeader}</th>
                  <th className="p-3">{avgGradeHeader}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.level}
                    className="border-b border-black/5 last:border-b-0 dark:border-white/10"
                  >
                    <td className="p-3">{row.level}</td>
                    <td className="p-3">
                      {typeof row.kandidaten === "number" ? row.kandidaten : "—"}
                    </td>
                    <td className="p-3">
                      {typeof row.geslaagden === "number" ? row.geslaagden : "—"}
                    </td>
                    <td className="p-3">
                      {typeof row.slagingspercentage === "number"
                        ? `${row.slagingspercentage.toFixed(1)}%`
                        : "—"}
                    </td>
                    <td className="p-3">
                      {typeof row.gem_cijfer_lijst === "number"
                        ? row.gem_cijfer_lijst.toFixed(2)
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : null}
    </div>
  );
}

