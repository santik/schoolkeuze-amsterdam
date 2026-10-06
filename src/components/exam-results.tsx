"use client";

import { useLocale, useTranslations } from 'next-intl';
import { getExamCoverage, type ExamMetric, type ExamRow } from '@/lib/exam-results';

export function ExamResults({ results, levels, compact = false }: { results: unknown; levels: string[]; compact?: boolean }) {
  const t = useTranslations('ExamResults');
  const locale = useLocale();
  const coverage = getExamCoverage(results, levels);
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
  function value(row: ExamRow, key: ExamMetric) {
    const n = row[key];
    if (n !== null) return `${number.format(n)}${key === 'passRate' ? '%' : ''}`;
    if (row.suppressedFields.includes(key)) return t('suppressed');
    if (row.status !== 'available' && row.status !== 'suppressed') return t(row.status);
    return t(key === 'averageGrade' && row.sourceRows.length > 1 ? 'gradeNotComparable' : 'unavailable');
  }
  return <div data-testid="exam-coverage" className="grid gap-2 text-sm">
    <div className="font-semibold" data-testid="exam-year">{t('year')}: {coverage.year ?? t('unavailable')}</div>
    <p className="text-xs text-zinc-600 dark:text-zinc-300">{t('context')}</p>
    {coverage.provisional && <p className="text-xs">{t('provisional')}</p>}
    {compact ? <ul className="grid gap-3">
      {coverage.rows.map(row => <li key={row.track} data-testid="exam-track">
        <div className="font-medium">{row.track}: {value(row, 'passRate')}</div>
        <div>{t('candidates')}: {value(row, 'candidates')}</div>
      </li>)}
    </ul> : <div className="overflow-x-auto">
      <table data-testid="exam-table" className="w-full min-w-[640px] text-left text-sm">
        <thead><tr>{['track', 'candidates', 'passed', 'passRate', 'averageGrade'].map(k => <th className="p-2" key={k} scope="col">{t(k)}</th>)}</tr></thead>
        <tbody>{coverage.rows.map(row => <tr key={row.track} data-testid="exam-track" className="border-t border-black/10 dark:border-white/10">
          <th className="p-2 align-top" scope="row">{row.track}</th>
          {(['candidates', 'passed', 'passRate', 'averageGrade'] as const).map(k => <td className="p-2 align-top" key={k}>{value(row, k)}</td>)}
        </tr>)}</tbody>
      </table>
    </div>}
    {coverage.sourceUrl && <a href={coverage.sourceUrl} target="_blank" rel="noreferrer" className="text-xs underline underline-offset-2">DUO · {coverage.year}{coverage.publishedAt ? ` · ${t('published')}: ${coverage.publishedAt}` : ''}</a>}
  </div>;
}
