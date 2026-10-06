/** Apply only exam results to existing database schools. Never create/delete schools. */
import fs from 'node:fs/promises';
import { Prisma, PrismaClient } from '@prisma/client';
import { importExams, parseDuoCsv, sourceUrl, type BranchMapping } from './exam-results';
import { mergeFacts } from '../../src/lib/data-provenance';

async function main() {
  const args = process.argv.slice(2);
  if (args.some(a => !['--apply', '--dry-run'].includes(a)) || (args.includes('--apply') && args.includes('--dry-run'))) throw new Error('Usage: npm run ingest:exams:db -- [--dry-run | --apply]');
  const [current, previous, mappingText] = await Promise.all([
    fs.readFile('data/exams/duo-2024-2025.csv', 'utf8'), fs.readFile('data/exams/duo-2023-2024.csv', 'utf8'), fs.readFile('data/exams/branch-mapping.json', 'utf8'),
  ]);
  const rows = parseDuoCsv(current), prior = parseDuoCsv(previous);
  const mappings = JSON.parse(mappingText) as BranchMapping[];
  const prisma = new PrismaClient();
  try {
    const summary = await prisma.$transaction(async tx => {
      const schools = await tx.school.findMany();
      const names = new Set(schools.map(s => s.name));
      const result = importExams(schools, rows, mappings.filter(m => names.has(m.school)), '2024-2025', prior);
      const importedAt = new Date().toISOString();
      const changes = schools.map(s => {
        const results = { ...(s.results && typeof s.results === 'object' && !Array.isArray(s.results) ? s.results : {}), examCoverage: result.coverage[s.name] };
        const merged = mergeFacts(s, { results, provenance: [{ fieldGroup: 'results', dataYear: '2024-2025', sourceLabel: 'DUO — examenkandidaten, geslaagden en cijfers', sourceUrl: sourceUrl('2024-2025'), sourceUpdatedAt: '2025-12-22T00:00:00.000Z', importedAt, verifiedAt: null, method: 'automatic', authority: 'authoritative' }] });
        if (merged.report.some(issue => issue.kind === "regressing")) throw new Error(`Newer exam provenance already exists for ${s.name}; no records written`);
        return { school: s, merged };
      });
      // Entire input is preflighted before the first write; any error rolls back all schools.
      if (args.includes('--apply')) for (const { school, merged } of changes) {
        await tx.school.update({ where: { id: school.id }, data: { results: merged.data.results as Prisma.InputJsonValue, provenance: merged.data.provenance as Prisma.InputJsonValue } });
        await tx.schoolImport.create({ data: { schoolId: school.id, previous: JSON.parse(JSON.stringify(school)) as Prisma.InputJsonValue, report: merged.report as unknown as Prisma.InputJsonValue } });
      }
      return result.summary;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 60000 });
    console.log(JSON.stringify({ mode: args.includes('--apply') ? 'applied' : 'dry-run', ...summary }, null, 2));
  } finally { await prisma.$disconnect(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
