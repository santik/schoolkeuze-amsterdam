export const examStatuses = ['available', 'not_offered', 'no_cohort', 'suppressed', 'unmatched_source', 'unavailable'] as const;
export type ExamStatus = typeof examStatuses[number];
export type ExamMetric = 'candidates' | 'passed' | 'passRate' | 'averageGrade';
export type ExamRow = {
  track: string;
  status: ExamStatus;
  candidates: number | null;
  passed: number | null;
  passRate: number | null;
  averageGrade: number | null;
  suppressedFields: ExamMetric[];
  sourceRows: number[];
};
export type ExamCoverage = {
  version: 1;
  year: string | null;
  sourceUrl: string | null;
  publishedAt: string | null;
  provisional: boolean;
  branch: string | null;
  rows: ExamRow[];
};
export function normalizeExamTrack(level: string) {
  return level.toUpperCase().replaceAll('_', '-').replace(/^VMBO-(BL|KL|TL)$/, (_, v: string) => `VMBO-${v[0]}`);
}
export function emptyExamRow(track: string, status: ExamStatus): ExamRow {
  return { track, status, candidates: null, passed: null, passRate: null, averageGrade: null, suppressedFields: [], sourceRows: [] };
}
export function fallbackExamRows(levels: string[], status: ExamStatus = 'unavailable'): ExamRow[] {
  const tracks = [...new Set(levels.map(normalizeExamTrack))].filter(t => /^(HAVO|VWO|VMBO(?:-(B|K|T|GL))?)$/.test(t));
  if (tracks.length) return tracks.map(t => emptyExamRow(t, status));
  const practicalOnly = levels.length > 0 && levels.every(l => normalizeExamTrack(l) === 'PRAKTIJKONDERWIJS');
  return [emptyExamRow(practicalOnly ? 'Praktijkonderwijs' : 'VSO / overige', practicalOnly ? 'not_offered' : 'unavailable')];
}
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const metric = (v: unknown, max: number) => v === null || (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max);
export function getExamCoverage(results: unknown, levels: string[]): ExamCoverage {
  const fallback: ExamCoverage = { version: 1, year: null, sourceUrl: null, publishedAt: null, provisional: false, branch: null, rows: fallbackExamRows(levels) };
  const c = object(results) ? results.examCoverage : null;
  if (!object(c) || c.version !== 1 || typeof c.year !== 'string' || !/^20\d{2}-20\d{2}$/.test(c.year) || Number(c.year.slice(5)) !== Number(c.year.slice(0, 4)) + 1 || typeof c.sourceUrl !== 'string') return fallback;
  try { if (!['https:', 'http:'].includes(new URL(c.sourceUrl).protocol)) return fallback; } catch { return fallback; }
  if (!Array.isArray(c.rows) || !c.rows.length || !c.rows.every(r => object(r)
    && typeof r.track === 'string' && examStatuses.includes(r.status as ExamStatus)
    && metric(r.candidates, Number.MAX_SAFE_INTEGER) && (r.candidates === null || Number.isInteger(r.candidates))
    && metric(r.passed, Number.MAX_SAFE_INTEGER) && (r.passed === null || Number.isInteger(r.passed))
    && metric(r.passRate, 100) && metric(r.averageGrade, 10)
    && Array.isArray(r.suppressedFields) && r.suppressedFields.every(k => ['candidates', 'passed', 'passRate', 'averageGrade'].includes(String(k)) && r[String(k)] === null)
    && Array.isArray(r.sourceRows) && r.sourceRows.every(n => Number.isInteger(n) && n >= 2)
    && (r.passed === null || r.candidates === null || Number(r.passed) <= Number(r.candidates))
    && (r.passRate === null || (Number(r.candidates) > 0 && r.passed !== null && Math.abs(Number(r.passRate) - Number(r.passed) / Number(r.candidates) * 100) <= 0.11))
    && (!['not_offered', 'no_cohort', 'unmatched_source', 'unavailable'].includes(String(r.status)) || r.passRate === null)
  )) return fallback;
  if (new Set(c.rows.map(r => r.track)).size !== c.rows.length) return fallback;
  if (c.rows.some(r => r.sourceRows.length) && (typeof c.branch !== 'string' || !/^[0-9A-Z]{4}\d{2}$/.test(c.branch))) return fallback;
  return { version: 1, year: c.year, sourceUrl: c.sourceUrl, publishedAt: typeof c.publishedAt === 'string' ? c.publishedAt : null, provisional: c.provisional === true, branch: typeof c.branch === 'string' ? c.branch : null, rows: c.rows as ExamRow[] };
}
