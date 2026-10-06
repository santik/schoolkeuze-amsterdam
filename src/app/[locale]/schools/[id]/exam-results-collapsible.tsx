"use client";

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ExamResults } from '@/components/exam-results';
import { getExamCoverage } from '@/lib/exam-results';

export function ExamResultsCollapsible({ results, levels }: { results: unknown; levels: string[] }) {
  const [open, setOpen] = useState(false);
  const t = useTranslations('ExamResults');
  const coverage = getExamCoverage(results, levels);
  return <div data-testid="exam-results" className="grid gap-2 rounded-3xl border border-sky-200 bg-white/90 p-3 shadow-sm dark:border-sky-300/20 dark:bg-sky-500/10">
    <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="exam-results-body" className="flex items-center justify-between text-left text-sm font-semibold text-sky-900 dark:text-sky-100" data-testid="exam-toggle">
      <span>{t('title')} · {coverage.year ?? t('unavailable')}</span><span aria-hidden>{open ? '▾' : '▸'}</span>
    </button>
    {open && <div id="exam-results-body"><ExamResults results={results} levels={levels} /></div>}
  </div>;
}
