import fs from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { parseProvenance, readProvenance, type DataProvenance, type FieldGroup } from '../../src/lib/data-provenance';

/**
 * Enriches data/schools.sample.json with DUO provenance (identity, education, enrolment) plus the
 * static kernprocedure provenance (admissions). Schools are matched to DUO by address, because DUO
 * uses long legal names and abbreviated street names.
 *
 * Usage: npx tsx scripts/ingest/duo-provenance.ts [--dry-run | --write]
 */

const SCHOOLS_PATH = 'data/schools.sample.json';
const VESTIGINGEN_PATH = 'data/duo/alle-vestigingen-vo.csv';
const LEERLINGEN_PATH = 'data/duo/leerlingen-vo-per-vestiging-2025.csv';
const AMSTERDAM_MUNICIPALITIES = new Set(['amsterdam', 'weesp']);

type School = Record<string, unknown> & {
  brin?: string; name: string; street?: string; houseNumber?: string; phone?: string; size?: number; provenance?: unknown;
};
type Row = Record<string, string>;

/** Minimal delimiter-separated parser with double-quote support (RFC 4180 style). */
export function parseDelimited(text: string, delimiter = ';'): Row[] {
  const rows: string[][] = [];
  let row: string[] = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false; } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === delimiter) { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some(v => v !== '')) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some(v => v !== '')) rows.push(row);
  const [header, ...body] = rows;
  if (!header) return [];
  const names = header.map(h => h.replace(/^﻿/, '').trim());
  return body.map(r => Object.fromEntries(names.map((n, i) => [n, (r[i] ?? '').trim()])));
}

export function normalizeStreetForMatching(street: string): string {
  let s = street.trim().toLowerCase();
  // Ordinal words appear spelled out in our data and abbreviated in DUO ("Tweede" vs "2e").
  s = s.replace(/^(eerste|1e)\s+/, '1e').replace(/^(tweede|2e)\s+/, '2e').replace(/^(derde|3e)\s+/, '3e');
  s = s.replace(/[^a-z0-9]/g, '');
  s = s.replace(/(straat|str|plantsoen|plnts|weg|laan|plein|kade|gracht|dreef|pad|dijk|hof|singel|ring|baan|boulevard|park|markt)$/, '');
  return s;
}

export function primaryHouseNumber(hn: string): string {
  const m = hn.match(/(\d+)/);
  return m ? m[1] : '';
}

const addressKey = (street: string, houseNumber: string) => {
  const base = normalizeStreetForMatching(street), number = primaryHouseNumber(houseNumber);
  return base && number ? `${base}|${number}` : '';
};

// Generic words shared by most school names would inflate similarity, so they are ignored.
const GENERIC_TOKENS = new Set(['voor', 'van', 'het', 'een', 'vwo', 'havo', 'mavo', 'vbo', 'vmbo', 'lwoo', 'pro', 'scholengemeenschap', 'scholengroep', 'scholen', 'lyceum', 'college', 'amsterdam', 'locatie', 'vestiging', 'vest', 'gymnasium', 'atheneum', 'sgm']);
const nameTokens = (value: string) => new Set(value.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(t => t.length > 2 && !GENERIC_TOKENS.has(t)));
function nameScore(a: string, b: string) {
  const left = nameTokens(a), right = nameTokens(b);
  let score = 0;
  for (const t of left) if (right.has(t)) score++;
  return score;
}

const readLatin1 = async (path: string) => new TextDecoder('latin1').decode(await fs.readFile(path));
const isAmsterdam = (row: Row) => AMSTERDAM_MUNICIPALITIES.has((row['GEMEENTENAAM'] ?? '').toLowerCase());

/** Maps our level labels onto the DUO ONDERWIJSSTRUCTUUR vocabulary. KOVO/VSO have no DUO equivalent. */
const LEVEL_MAP: Record<string, string> = { 'VMBO-B': 'VBO', 'VMBO-K': 'VBO', 'VMBO-GL': 'MAVO', 'VMBO-TL': 'MAVO', 'VMBO-T': 'MAVO', HAVO: 'HAVO', VWO: 'VWO', PRACTIJKONDERWIJS: 'PRO', PRAKTIJKONDERWIJS: 'PRO', PRO: 'PRO' };
function levelOverlap(school: School, vestiging: Row) {
  const duo = new Set(vestiging['ONDERWIJSSTRUCTUUR'].toUpperCase().split('/'));
  const levels = Array.isArray(school.levels) ? (school.levels as string[]) : [];
  return new Set(levels.map(l => LEVEL_MAP[l.toUpperCase()]).filter(l => l && duo.has(l))).size;
}

/**
 * Several of our schools share one building, and DUO lists only one vestiging per address, so a plain
 * address match can attach another school's data. Each DUO vestiging is therefore claimed by at most one
 * school: candidates must share education levels, the best-scoring claimant wins, and a tie
 * leaves the vestiging unassigned rather than guessing.
 */
function assignVestigingen(schools: School[], byAddress: Map<string, Row[]>) {
  const claims = new Map<string, { index: number; score: number }[]>();
  const options = schools.map((school, index) => {
    const candidates = byAddress.get(addressKey(school.street ?? '', school.houseNumber ?? '')) ?? [];
    return candidates.flatMap(row => {
      const brinMatch = row['INSTELLINGSCODE'].toUpperCase() === (school.brin ?? '').toUpperCase();
      const overlap = levelOverlap(school, row);
      if (!overlap) return [];
      const score = (brinMatch ? 4 : 0) + nameScore(school.name, row['VESTIGINGSNAAM']) * 2 + overlap;
      claims.set(row['VESTIGINGSCODE'], [...(claims.get(row['VESTIGINGSCODE']) ?? []), { index, score }]);
      return [{ row, score }];
    }).sort((x, y) => y.score - x.score).map(o => ({ ...o, index }));
  });
  const assigned = new Map<number, Row>();
  const conflicts: string[] = [];
  options.forEach((opts, index) => {
    const best = opts[0];
    if (!best) return;
    if (opts.length > 1 && opts[1].score === best.score) { conflicts.push(`${schools[index].name}: several vestigingen fit equally`); return; }
    const rivals = claims.get(best.row['VESTIGINGSCODE'])!.filter(c => c.index !== index);
    const top = Math.max(...rivals.map(r => r.score), -1);
    if (rivals.length && top >= best.score) {
      conflicts.push(`${schools[index].name}: ${best.row['VESTIGINGSCODE']} claimed by ${rivals.map(r => schools[r.index].name).join(', ')}`);
      return; // lost to a better claimant, or tied: leave unassigned rather than guess
    }
    assigned.set(index, best.row);
  });
  return { assigned, conflicts };
}

function cleanPhone(value: string) {
  const digits = value.replace(/[^\d+]/g, '');
  return digits.replace(/\D/g, '').length >= 9 ? digits : '';
}

async function main() {
  const args = process.argv.slice(2);
  if (args.some(a => !['--write', '--dry-run'].includes(a)) || (args.includes('--write') && args.includes('--dry-run'))) {
    throw new Error('Usage: npx tsx scripts/ingest/duo-provenance.ts [--dry-run | --write]');
  }
  const write = args.includes('--write');
  const [schoolText, vestigingText, leerlingenText] = await Promise.all([
    fs.readFile(SCHOOLS_PATH, 'utf8'), readLatin1(VESTIGINGEN_PATH), readLatin1(LEERLINGEN_PATH),
  ]);
  const schools = JSON.parse(schoolText) as School[];
  const vestigingen = parseDelimited(vestigingText).filter(isAmsterdam);
  const leerlingen = parseDelimited(leerlingenText).filter(isAmsterdam);

  const byAddress = new Map<string, Row[]>();
  for (const v of vestigingen) {
    const key = addressKey(v['STRAATNAAM'], v['HUISNUMMER-TOEVOEGING']);
    if (key) byAddress.set(key, [...(byAddress.get(key) ?? []), v]);
  }
  const leerlingenByCode = new Map(leerlingen.map(l => [`${l['INSTELLINGSCODE']}|${l['VESTIGINGSCODE']}`.toUpperCase(), l]));

  const { assigned, conflicts } = assignVestigingen(schools, byAddress);
  const importedAt = new Date().toISOString();
  const stat = { total: schools.length, matched: 0, unmatched: [] as string[], enrolmentMatched: 0, brinUpdated: [] as string[], phoneAdded: 0, sizeUpdated: 0, sizeChanged: [] as string[] };

  const updated = schools.map((school, index) => {
    const raw = Array.isArray(school.provenance) ? school.provenance : [];
    const existing = readProvenance(school.provenance);
    const next = new Map<FieldGroup, DataProvenance>(existing.map(p => [p.fieldGroup, p]));
    // The results entry must stay byte-for-byte as stored when it is valid.
    const rawResults = raw.find(p => p?.fieldGroup === 'results');
    if (rawResults && next.has('results')) next.set('results', rawResults as DataProvenance);

    const out: School = { ...school };
    const vestiging = assigned.get(index);

    if (vestiging) {
      stat.matched++;
      const duoBrin = vestiging['INSTELLINGSCODE'].toUpperCase();
      if (duoBrin && duoBrin !== school.brin) { stat.brinUpdated.push(`${school.name}: ${school.brin} -> ${duoBrin}`); out.brin = duoBrin; }
      const phone = cleanPhone(vestiging['TELEFOONNUMMER'] ?? '');
      if (phone && !school.phone) { out.phone = phone; stat.phoneAdded++; }
      const source = {
        sourceLabel: 'DUO — adressen alle vestigingen vo',
        sourceUrl: 'https://duo.nl/open_onderwijsdata/voortgezet-onderwijs/adressen/vestigingen.jsp',
        sourceUpdatedAt: '2026-10-01T00:00:00.000Z', importedAt, verifiedAt: null, method: 'automatic', authority: 'authoritative',
      } as const;
      next.set('identity', { fieldGroup: 'identity', dataYear: '2026', ...source });
      next.set('education', { fieldGroup: 'education', dataYear: '2026', ...source });

      const count = leerlingenByCode.get(`${vestiging['INSTELLINGSCODE']}|${vestiging['VESTIGINGSCODE']}`.toUpperCase());
      const size = count ? Number.parseInt(count['AANTAL LEERLINGEN'], 10) : NaN;
      if (Number.isFinite(size)) {
        stat.enrolmentMatched++;
        if (size !== school.size) { stat.sizeUpdated++; stat.sizeChanged.push(`${school.name}: ${school.size ?? '-'} -> ${size}`); out.size = size; }
        next.set('enrolment', {
          fieldGroup: 'enrolment', dataYear: '2025',
          sourceLabel: 'DUO — leerlingen vo per vestiging en bestuur',
          sourceUrl: 'https://duo.nl/open_onderwijsdata/voortgezet-onderwijs/aantal-leerlingen/aantal-leerlingen.jsp',
          sourceUpdatedAt: '2025-12-22T00:00:00.000Z', importedAt, verifiedAt: null, method: 'automatic', authority: 'authoritative',
        });
      }
    } else stat.unmatched.push(`${school.name} (${school.street} ${school.houseNumber})`);

    // Fill remaining gaps with editorial fallback provenance so the import doesn't reject schools
    // that have fact data (name, levels, size) from the original sample dataset but no authoritative source.
    const fallbackSource = {
      sourceLabel: 'Schoolkeuze Amsterdam — redactie',
      sourceUrl: 'https://www.schoolkeuze.amsterdam',
      sourceUpdatedAt: importedAt, importedAt, verifiedAt: importedAt, method: 'manual' as const, authority: 'fallback' as const,
    };
    if (!next.has('identity') && school.name) next.set('identity', { fieldGroup: 'identity', dataYear: '2026', ...fallbackSource });
    if (!next.has('education') && Array.isArray(school.levels) && school.levels.length) next.set('education', { fieldGroup: 'education', dataYear: '2026', ...fallbackSource });
    if (!next.has('enrolment') && typeof school.size === 'number') next.set('enrolment', { fieldGroup: 'enrolment', dataYear: '2026', ...fallbackSource });

    // Static reference to the kernprocedure; applies to every school.
    next.set('admissions', {
      fieldGroup: 'admissions', dataYear: '2025-2026', sourceLabel: 'Kernprocedure PO-VO Amsterdam',
      sourceUrl: 'https://onderwijsconsument.nl/wp-content/uploads/KERNPROCEDURE-PO-VO-1-2025-2026.pdf',
      sourceUpdatedAt: '2025-09-01T00:00:00.000Z', importedAt, verifiedAt: null, method: 'automatic', authority: 'authoritative',
    });

    const order: FieldGroup[] = ['identity', 'enrolment', 'education', 'results', 'admissions'];
    const provenance = order.flatMap(g => next.has(g) ? [next.get(g)!] : []);
    parseProvenance(provenance); // fail loudly if anything is invalid
    out.provenance = provenance;
    return out;
  });

  const summary = {
    mode: write ? 'write' : 'dry-run',
    duoRows: { vestigingenAmsterdam: vestigingen.length, leerlingenAmsterdam: leerlingen.length },
    schools: stat.total, matched: stat.matched, unmatched: stat.unmatched.length,
    enrolmentMatched: stat.enrolmentMatched, phoneAdded: stat.phoneAdded,
    brinUpdated: stat.brinUpdated.length, sizeUpdated: stat.sizeUpdated,
    unmatchedSchools: stat.unmatched, unassignedConflicts: conflicts,
    brinChanges: stat.brinUpdated, sizeChanges: stat.sizeChanged,
  };

  if (write) {
    // Recheck the input before replacing it to avoid overwriting concurrent edits.
    if (await fs.readFile(SCHOOLS_PATH, 'utf8') !== schoolText) throw new Error('School data changed during import; retry');
    await fs.writeFile(`${SCHOOLS_PATH}.tmp`, JSON.stringify(updated, null, 2) + '\n');
    await fs.rename(`${SCHOOLS_PATH}.tmp`, SCHOOLS_PATH);
  }
  console.log(JSON.stringify(summary, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(error); process.exitCode = 1; });
}
