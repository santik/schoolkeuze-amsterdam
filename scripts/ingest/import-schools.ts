import fs from 'node:fs/promises';
import path from 'node:path';
import { Prisma, PrismaClient, SchoolLevel } from '@prisma/client';
import { FACT_FIELDS, mergeFacts, missingProvenance, type FactRecord } from '../../src/lib/data-provenance';
import { getExamCoverage } from '../../src/lib/exam-results';

export function normalizeSchool(input: FactRecord): FactRecord {
  if (typeof input.name !== 'string' || !input.name.trim()) throw new Error('School name required');
  const school: FactRecord & {name: string} = { ...input, name: input.name.trim().normalize('NFC') };
  if (typeof school.brin === 'string') school.brin = school.brin.trim().toUpperCase();
  if (typeof school.postalCode === 'string') school.postalCode = school.postalCode.replaceAll(/\s+/g, '').toUpperCase();
  if (school.levels !== undefined) {
    if (!Array.isArray(school.levels)) throw new Error('levels must be an array');
    school.levels = [...new Set(school.levels.flatMap(v => {
      const key = String(v).trim().toUpperCase().replaceAll('-', '_');
      // The persisted level model groups VMBO pathways together and has no
      // separate KOVO value. Preserve the previous importer behaviour for
      // those non-persisted labels rather than turning a provenance refresh
      // into a schema migration.
      if (key === 'VMBO_GL') return ['VMBO'];
      if (key === 'KOVO') return [];
      if (!(key in SchoolLevel)) throw new Error(`Unknown school level: ${v}`);
      return [key];
    }))];
  }
  if (school.size !== undefined && school.size !== null && (typeof school.size !== 'number' || !Number.isInteger(school.size) || school.size < 0)) throw new Error('size must be a non-negative integer or null');
  if (school.examens_2023_2024 !== undefined || school.examens_bron !== undefined) {
    school.results = {
      ...(typeof school.results === 'object' && school.results ? school.results : {}),
      examens_2023_2024: school.examens_2023_2024 ?? null,
      examens_bron: school.examens_bron ?? null,
    };
  }
  if (school.results && typeof school.results === 'object' && 'examens_2023_2024' in school.results) {
    const entries = school.provenance as Array<{fieldGroup?: string; dataYear?: string}> | undefined;
    const year = Array.isArray(entries) ? entries.find(p => p.fieldGroup === 'results')?.dataYear?.replaceAll('–','-') : undefined;
    const currentYear = getExamCoverage(school.results, []).year;
    if (year && year !== (currentYear ?? '2023-2024')) throw new Error('results: exam facts require matching dataYear (legacy: 2023-2024)');
  }
  const key = school.sourceKey;
  school.sourceKey = typeof key === 'string' && key.trim()
    ? key.trim().toLowerCase()
    : `sample:${typeof school.brin === 'string' && school.brin ? school.brin.toLowerCase() : 'no-brin'}:${school.name.toLowerCase().replaceAll(/\W+/g, '-')}`;
  return school;
}

function writeData(record: FactRecord): Prisma.SchoolUncheckedCreateInput {
  const fields = Object.values(FACT_FIELDS).flat();
  const data: Record<string, unknown> = {};
  for (const key of [...fields, 'provenance', 'sourceKey', 'source', 'sourceUrl']) {
    if (record[key] !== undefined) data[key] = record[key];
  }
  data.levels ??= [];
  data.concepts ??= [];
  for (const key of ['results', 'admissions', 'admissionsInfo']) {
    if (data[key] === null) data[key] = Prisma.DbNull;
  }
  return data as Prisma.SchoolUncheckedCreateInput;
}
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

export async function importSchools() {
  const args = process.argv.slice(2);
  const fileIndex = args.indexOf('--file');
  if (fileIndex >= 0 && !args[fileIndex + 1]) throw new Error('--file requires a path');
  const file = fileIndex >= 0 ? args[fileIndex + 1] : path.join(process.cwd(), 'data', 'schools.sample.json');
  const raw: unknown = JSON.parse(await fs.readFile(file, 'utf8'));
  if (!Array.isArray(raw)) throw new Error('Input must be an array of schools');
  const schools: FactRecord[] = [];
  const seenKeys = new Set<string>();
  const seenNames = new Set<string>();
  let invalid = 0;
  // Validate every record before opening a connection or changing any stored facts.
  for (const value of raw) {
    try {
      const school = normalizeSchool(value);
      const missing = missingProvenance(school);
      if (missing.length) console.error(JSON.stringify({school:school.name, kind:'missing', groups:missing}));
      const merged = mergeFacts({}, school);
      for (const issue of merged.report.filter(x => x.kind === 'stale')) console.warn(JSON.stringify({school:school.name, ...issue}));
      const key = String(school.sourceKey);
      const name = String(school.name).toLowerCase();
      if (seenKeys.has(key) || seenNames.has(name)) throw new Error('Duplicate normalized school identifier/name');
      seenKeys.add(key); seenNames.add(name);
      schools.push(school);
    } catch (error) {
      invalid++;
      console.error(JSON.stringify({school: value?.name, kind:'rejected', message: error instanceof Error ? error.message : String(error)}));
    }
  }
  if (invalid) throw new Error(`Rejected ${invalid} school(s); no records written.`);
  if (args.includes('--dry-run')) {
    console.log(`Validated ${schools.length} schools; no records written. Database regressions/removals are checked on import.`);
    return;
  }
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required for ingestion.');
  const prisma = new PrismaClient();
  try {
    for (const incoming of schools) {
      const report = await prisma.$transaction(async tx => {
        // Name lookup also finds records imported with the legacy source-key casing.
        const candidates = await tx.school.findMany({where:{OR:[
          {sourceKey:{equals:String(incoming.sourceKey),mode:'insensitive'}},
          {name:{equals:String(incoming.name),mode:'insensitive'}},
        ]}});
        if (candidates.length > 1) throw new Error(`Ambiguous identifier: ${incoming.name}`);
        const previous = candidates[0];
        const merged = mergeFacts(previous ?? {}, incoming);
        const accepted = writeData({...merged.data, sourceKey:incoming.sourceKey, source:incoming.source ?? previous?.source, sourceUrl:incoming.sourceUrl ?? previous?.sourceUrl});
        const school = previous
          ? await tx.school.update({where:{id:previous.id}, data:accepted})
          : await tx.school.create({data:accepted});
        await tx.schoolImport.create({data:{schoolId:school.id, previous:previous ? json(previous) : Prisma.JsonNull, report:json(merged.report)}});
        return merged.report;
      }, {isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
      for (const issue of report) console.log(JSON.stringify({school:incoming.name, ...issue}));
    }
    console.log(`Imported ${schools.length} schools with history.`);
  } finally { await prisma.$disconnect(); }
}
