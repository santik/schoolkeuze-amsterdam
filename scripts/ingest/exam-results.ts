import { fallbackExamRows, type ExamCoverage, type ExamMetric, type ExamRow } from '../../src/lib/exam-results';

export type SourceRow = { branch: string; sourceName: string; municipality: string; track: string; department: string; candidates: number | null; passed: number | null; averageGrade: number | null; suppressedFields: ExamMetric[]; line: number };
export type BranchMapping = { school: string; branch: string; sourceName: string; municipality: string };
export type SchoolInput = { name: string; levels?: string[]; results?: unknown };
export const sourceUrl = (year: string) => `https://duo.nl/open_onderwijsdata/images/geslaagden-gezakten-en-cijfers-${year}.csv`;

// RFC-style quoted fields, including quoted delimiters, newlines and escaped quotes.
export function parseDuoCsv(text: string): SourceRow[] {
  const records: string[][] = [];
  let record: string[] = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') { if (quoted && text[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted; }
    else if (!quoted && (c === ';' || c === '\n')) {
      record.push(cell.trim().replace(/^\uFEFF/, '')); cell = '';
      if (c === '\n') { if (record.some(Boolean)) records.push(record); record = []; }
    } else cell += c;
  }
  if (quoted) throw new Error('Unclosed CSV quote');
  if (cell || record.length) { record.push(cell.trim()); records.push(record); }
  const headers = records.shift() ?? [];
  const required = ['INSTELLINGSCODE', 'VESTIGINGSCODE', 'INSTELLINGSNAAM VESTIGING', 'GEMEENTENAAM VESTIGING', 'ONDERWIJSTYPE VO', 'LEERWEG VMBO', 'VMBO SECTOR', 'AFDELING', 'EXAMENKANDIDATEN', 'GESLAAGDEN', 'GEMIDDELD CIJFER CIJFERLIJST'];
  if (required.some(h => !headers.includes(h))) throw new Error('Missing DUO CSV header');
  if (!records.length) throw new Error('Empty DUO release');
  const seen = new Set<string>();
  return records.map((values, index) => {
    const line = index + 2;
    if (values.length !== headers.length) throw new Error(`CSV column mismatch at ${line}`);
    const r = Object.fromEntries(headers.map((h, i) => [h, values[i]]));
    const branch = r.VESTIGINGSCODE;
    if (!/^[0-9A-Z]{4}\d{2}$/.test(branch) || !branch.startsWith(r.INSTELLINGSCODE)) throw new Error(`Invalid branch at ${line}`);
    const level = r['ONDERWIJSTYPE VO'];
    const pathway = r['LEERWEG VMBO'];
    if (!['VWO', 'HAVO', 'VMBO'].includes(level) || (level === 'VMBO' && !['BL', 'KL', 'TL', 'GL'].includes(pathway))) throw new Error(`Unknown track at ${line}`);
    const track = level === 'VMBO' ? `VMBO-${pathway === 'GL' ? 'GL' : pathway[0]}` : level;
    const department = `${r['VMBO SECTOR']}:${r.AFDELING}`;
    const key = `${branch}:${track}:${department}`;
    if (seen.has(key)) throw new Error(`Duplicate department ${key}`);
    seen.add(key);
    const suppressedFields: ExamMetric[] = [];
    function numeric(value: string, metric: ExamMetric) {
      if (['<5', '-1'].includes(value)) { suppressedFields.push(metric); return null; }
      if (['', '-', '.'].includes(value)) return null;
      if (!/^\d+(?:[,.]\d+)?$/.test(value)) throw new Error(`Invalid number at ${line}: ${value}`);
      const n = Number(value.replace(',', '.'));
      if (!Number.isFinite(n) || (metric === 'averageGrade' ? n > 10 : !Number.isSafeInteger(n))) throw new Error(`Invalid number at ${line}`);
      return n;
    }
    const candidates = numeric(r.EXAMENKANDIDATEN, 'candidates');
    const passed = numeric(r.GESLAAGDEN, 'passed');
    if (candidates !== null && passed !== null && passed > candidates) throw new Error(`Impossible counts at ${line}`);
    return { branch, sourceName: r['INSTELLINGSNAAM VESTIGING'], municipality: r['GEMEENTENAAM VESTIGING'], track, department, candidates, passed, averageGrade: numeric(r['GEMIDDELD CIJFER CIJFERLIJST'], 'averageGrade'), suppressedFields, line };
  });
}

function aggregate(rows: SourceRow[]): ExamRow {
  const sum = (key: 'candidates' | 'passed') => rows.every(r => r[key] !== null) ? rows.reduce((n, r) => n + r[key]!, 0) : null;
  const candidates = sum('candidates'), passed = sum('passed');
  const suppressedFields = [...new Set(rows.flatMap(r => r.suppressedFields))];
  if (suppressedFields.some(k => k === 'candidates' || k === 'passed')) suppressedFields.push('passRate');
  const passRate = candidates !== null && candidates > 0 && passed !== null ? Math.round(passed / candidates * 1000) / 10 : null;
  return { track: rows[0].track, candidates, passed, passRate,
    averageGrade: rows.length === 1 ? rows[0].averageGrade : null,
    status: candidates === 0 ? 'no_cohort' : suppressedFields.length ? 'suppressed' : passRate === null ? 'unavailable' : 'available',
    suppressedFields, sourceRows: rows.map(r => r.line) };
}

export function importExams(schools: SchoolInput[], rows: SourceRow[], mappings: BranchMapping[], year: string, previous: SourceRow[] = []) {
  if (!/^20\d{2}-20\d{2}$/.test(year) || Number(year.slice(5)) !== Number(year.slice(0, 4)) + 1) throw new Error('Invalid reporting year');
  const bySchool = new Map<string, BranchMapping>();
  const branches = new Set<string>();
  for (const m of mappings) {
    if (!schools.some(s => s.name === m.school) || bySchool.has(m.school)) throw new Error(`Duplicate or unknown school ${m.school}`);
    if (branches.has(m.branch)) throw new Error(`Duplicate branch ${m.branch}`);
    const source = rows.filter(r => r.branch === m.branch);
    if (!source.length || source.some(r => r.sourceName !== m.sourceName || r.municipality !== m.municipality)) throw new Error(`Branch identity mismatch ${m.school}: ${m.branch}`);
    bySchool.set(m.school, m); branches.add(m.branch);
  }
  const coverage: Record<string, ExamCoverage> = {};
  const summary = { year, complete: [] as string[], notApplicable: [] as string[], unmatched: [] as string[], partialOrUnavailable: [] as string[], changes: [] as { school: string; track: string; previous: number; current: number; percentagePoints: number }[], sourceRows: rows.length, importedSourceRows: 0, sourceKnownCandidates: 0, importedKnownCandidates: 0, sourceKnownPassed: 0, importedKnownPassed: 0, suppressedTrackCount: 0 };
  for (const school of schools) {
    const m = bySchool.get(school.name);
    const defaults = fallbackExamRows(school.levels ?? [], m ? 'unavailable' : 'unmatched_source');
    const selected = m ? rows.filter(r => r.branch === m.branch) : [];
    const tracks = [...new Set(selected.map(r => r.track))].sort();
    const resultRows = tracks.map(track => aggregate(selected.filter(r => r.track === track)));
    for (const row of defaults) {
      // A generic VMBO offering is covered by the release's specific pathways.
      if (row.track === 'VMBO' && tracks.some(t => t.startsWith('VMBO-'))) continue;
      if (!tracks.includes(row.track)) resultRows.push(row);
    }
    coverage[school.name] = { version: 1, year, sourceUrl: sourceUrl(year), publishedAt: year === '2024-2025' ? '2025-12-22' : null, provisional: year === '2024-2025', branch: m?.branch ?? null, rows: resultRows };
    if (resultRows.every(r => r.status === 'not_offered')) summary.notApplicable.push(school.name);
    else if (resultRows.some(r => r.status === 'unmatched_source')) summary.unmatched.push(school.name);
    else if (resultRows.every(r => r.status === 'available' || r.status === 'no_cohort')) summary.complete.push(school.name);
    else summary.partialOrUnavailable.push(school.name);
    summary.importedSourceRows += selected.length;
    for (const r of resultRows) {
      summary.importedKnownCandidates += r.candidates ?? 0;
      summary.importedKnownPassed += r.passed ?? 0;
      if (r.status === 'suppressed') summary.suppressedTrackCount++;
      const sourceTrack = selected.filter(s => s.track === r.track);
      // Compare like-for-like only: totals whose entire source group is visible.
      if (sourceTrack.every(s => s.candidates !== null)) summary.sourceKnownCandidates += sourceTrack.reduce((n, s) => n + (s.candidates ?? 0), 0);
      if (sourceTrack.every(s => s.passed !== null)) summary.sourceKnownPassed += sourceTrack.reduce((n, s) => n + (s.passed ?? 0), 0);
      const old = previous.filter(p => p.branch === m?.branch && p.track === r.track);
      const before = old.length ? aggregate(old).passRate : null;
      if (before !== null && r.passRate !== null && Math.abs(before - r.passRate) >= 10) summary.changes.push({ school: school.name, track: r.track, previous: before, current: r.passRate, percentagePoints: Math.round((r.passRate - before) * 10) / 10 });
    }
  }
  return { coverage, summary };
}
