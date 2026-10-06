import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { importExams, parseDuoCsv, sourceUrl, type BranchMapping, type SchoolInput } from './exam-results';
import { parseProvenance, readProvenance } from '../../src/lib/data-provenance';

async function main() {
  const args = process.argv.slice(2);
  if (args.some(a => !['--write', '--dry-run'].includes(a)) || (args.includes('--write') && args.includes('--dry-run'))) throw new Error('Usage: npm run ingest:exams -- [--dry-run | --write]');
  const year = '2024-2025';
  const [current, previous, schoolText, mappingText] = await Promise.all([
    fs.readFile(`data/exams/duo-${year}.csv`, 'utf8'),
    fs.readFile('data/exams/duo-2023-2024.csv', 'utf8'),
    fs.readFile('data/schools.sample.json', 'utf8'),
    fs.readFile('data/exams/branch-mapping.json', 'utf8'),
  ]);
  const schools = JSON.parse(schoolText) as (SchoolInput & { provenance?: unknown })[];
  for (const school of schools) {
    const provenance = parseProvenance(school.provenance);
    const old = provenance.find(p => p.fieldGroup === 'results');
    if (old && (old.dataYear > year || (old.dataYear === year && old.sourceUpdatedAt && old.sourceUpdatedAt > '2025-12-22T00:00:00.000Z'))) throw new Error(`Newer exam provenance exists for ${school.name}`);
  }
  const result = importExams(schools, parseDuoCsv(current), JSON.parse(mappingText) as BranchMapping[], year, parseDuoCsv(previous));
  const summary = { ...result.summary, sources: [
    { year, url: sourceUrl(year), sha256: createHash('sha256').update(current).digest('hex') },
    { year: '2023-2024', url: sourceUrl('2023-2024'), sha256: createHash('sha256').update(previous).digest('hex') },
  ], reconciliation: { candidatesMatch: result.summary.sourceKnownCandidates === result.summary.importedKnownCandidates, passedMatch: result.summary.sourceKnownPassed === result.summary.importedKnownPassed, scope: 'Matched branches, complete track counts only. Suppressed totals are excluded, never estimated.' } };
  if (!summary.reconciliation.candidatesMatch || !summary.reconciliation.passedMatch) throw new Error('Aggregate reconciliation failed');
  if (args.includes('--write')) {
    const importedAt = new Date().toISOString();
    const updated = schools.map(s => ({ ...s,
      results: { ...(s.results && typeof s.results === 'object' && !Array.isArray(s.results) ? s.results : {}), examCoverage: result.coverage[s.name] },
      provenance: [...readProvenance(s.provenance).filter(p => p.fieldGroup !== 'results'), {
        fieldGroup: 'results', dataYear: year, sourceLabel: 'DUO — examenkandidaten, geslaagden en cijfers', sourceUrl: sourceUrl(year),
        sourceUpdatedAt: '2025-12-22T00:00:00.000Z', importedAt, verifiedAt: null, method: 'automatic', authority: 'authoritative',
      }],
    }));
    // Recheck the input before replacing it to avoid overwriting concurrent edits.
    if (await fs.readFile('data/schools.sample.json', 'utf8') !== schoolText) throw new Error('School data changed during import; retry');
    await fs.writeFile('data/schools.sample.json.tmp', JSON.stringify(updated, null, 2) + '\n');
    await fs.rename('data/schools.sample.json.tmp', 'data/schools.sample.json');
    await fs.writeFile('data/exams/ingestion-summary.json', JSON.stringify(summary, null, 2) + '\n');
  }
  console.log(JSON.stringify(summary, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
