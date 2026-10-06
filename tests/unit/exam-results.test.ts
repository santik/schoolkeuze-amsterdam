import { test } from "node:test";
import assert from "node:assert/strict";
import { parseDuoCsv, importExams } from "../../scripts/ingest/exam-results";
import { getExamCoverage } from "../../src/lib/exam-results";

const header = 'INSTELLINGSCODE;VESTIGINGSCODE;INSTELLINGSNAAM VESTIGING;GEMEENTENAAM VESTIGING;ONDERWIJSTYPE VO;LEERWEG VMBO;VMBO SECTOR;AFDELING;EXAMENKANDIDATEN;GESLAAGDEN;GEMIDDELD CIJFER CIJFERLIJST';
const csv = (rows: string[]) => parseDuoCsv([header, ...rows].join('\r\n'));
const row = (branch = '00AA00', track = 'HAVO', pathway = ' ', candidates = '10', passed = '8', department = 'A') => `00AA;${branch};School ${branch};AMSTERDAM;${track};${pathway};;${department};${candidates};${passed};6,5`;
const schools = [{ name: 'A', levels: ['HAVO'] }, { name: 'B', levels: ['HAVO'] }];
const mappings = schools.map((s, i) => ({ school: s.name, branch: `00AA0${i}`, sourceName: `School 00AA0${i}`, municipality: 'AMSTERDAM' }));

test('shared BRIN never transfers results between branches; unmatched stays explicit', () => {
  const result = importExams(schools, csv([row(), row('00AA01', 'HAVO', ' ', '20', '20')]), mappings, '2024-2025');
  assert.equal(result.coverage.A.rows[0].candidates, 10);
  assert.equal(result.coverage.B.rows[0].candidates, 20);
  assert.equal(importExams(schools, csv([row()]), [], '2024-2025').coverage.A.rows[0].status, 'unmatched_source');
  assert.throws(() => importExams(schools, csv([row()]), [mappings[0], { ...mappings[0], school: 'B' }], '2024-2025'), /branch/i);
});

test('VMBO pathways remain separate; profile totals use counts, not average percentages', () => {
  const result = importExams([{ name: 'A', levels: ['VMBO-B', 'VMBO-K'] }], csv([
    row('00AA00', 'VMBO', 'BL', '10', '8'), row('00AA00', 'VMBO', 'BL', '20', '20', 'B'),
    row('00AA00', 'VMBO', 'KL', '10', '5'),
  ]), [mappings[0]], '2024-2025');
  const rows = result.coverage.A.rows;
  assert.deepEqual(rows.map(r => r.track), ['VMBO-B', 'VMBO-K']);
  assert.equal(rows[0].candidates, 30);
  assert.equal(rows[0].passed, 28);
  assert.equal(rows[0].passRate, 93.3);
  assert.equal(rows[0].averageGrade, null);
  assert.equal(rows[1].averageGrade, 6.5);
});

test('suppression is preserved without deriving hidden counts or rates', () => {
  const result = importExams([schools[0]], csv([row(), row('00AA00', 'HAVO', ' ', '<5', '<5', 'B')]), [mappings[0]], '2024-2025');
  assert.equal(result.coverage.A.rows[0].status, 'suppressed');
  assert.equal(result.coverage.A.rows[0].candidates, null);
  assert.equal(result.coverage.A.rows[0].passRate, null);
});

test('zero, missing rows, practical education and VSO have different meanings', () => {
  assert.equal(importExams([schools[0]], csv([row('00AA00', 'HAVO', ' ', '0', '0')]), [mappings[0]], '2024-2025').coverage.A.rows[0].status, 'no_cohort');
  assert.equal(importExams([schools[0]], csv([row('00AA00', 'VWO')]), [mappings[0]], '2024-2025').coverage.A.rows.find(r => r.track === 'HAVO')?.status, 'unavailable');
  assert.equal(getExamCoverage(null, ['Praktijkonderwijs']).rows[0].status, 'not_offered');
  assert.equal(getExamCoverage(null, ['VSO']).rows[0].status, 'unavailable');
  assert.equal(getExamCoverage({ examens_2023_2024: { HAVO: { slagingspercentage: 99 } } }, ['HAVO']).rows[0].passRate, null);
});

test('rejects malformed release, duplicate department and impossible counts', () => {
  assert.throws(() => parseDuoCsv('wrong;header\n1;2'), /header/i);
  assert.throws(() => csv([row(), row()]), /duplicate/i);
  assert.throws(() => csv([row('00AA00', 'HAVO', ' ', '8', '10')]), /count/i);
  assert.throws(() => csv([row('00AA00', 'HAVO', ' ', 'invalid')]), /number/i);
  assert.throws(() => importExams(schools, csv([row()]), [{ ...mappings[0], sourceName: 'Other location' }], '2024-2025'), /identity/i);
});

test('quoted delimiters and escaped quotes parse correctly', () => {
  const rows = csv([row().replace('School 00AA00', '"School; ""A"""')]);
  assert.equal(rows[0].sourceName, 'School; "A"');
});

test('UI projection refuses undated, unsafe, invalid and contradictory coverage', () => {
  const c = importExams([schools[0]], csv([row()]), [mappings[0]], '2024-2025').coverage.A;
  assert.equal(getExamCoverage({ examCoverage: c }, ['HAVO']).rows[0].passRate, 80);
  for (const invalid of [
    { ...c, year: null }, { ...c, year: '2024-2026' }, { ...c, sourceUrl: 'javascript:alert(1)' },
    { ...c, rows: [{ ...c.rows[0], candidates: null }] },
    { ...c, rows: [{ ...c.rows[0], passRate: 99 }] },
    { ...c, rows: [{ ...c.rows[0], passed: -1 }] },
    { ...c, rows: [{ ...c.rows[0], suppressedFields: ['passed'] }] },
  ]) assert.equal(getExamCoverage({ examCoverage: invalid }, ['HAVO']).rows[0].passRate, null);
});

test('totals reconcile complete groups and changes use the same branch and track', () => {
  const current = csv([row(), row('00AA01', 'HAVO', ' ', '<5', '<5')]);
  const previous = csv([row('00AA00', 'HAVO', ' ', '10', '10')]);
  const result = importExams(schools, current, mappings, '2024-2025', previous);
  assert.equal(result.summary.sourceKnownCandidates, 10);
  assert.equal(result.summary.importedKnownCandidates, 10);
  assert.equal(result.summary.sourceKnownPassed, 8);
  assert.equal(result.summary.importedKnownPassed, 8);
  assert.deepEqual(result.summary.changes, [{ school: 'A', track: 'HAVO', previous: 100, current: 80, percentagePoints: -20 }]);
});
