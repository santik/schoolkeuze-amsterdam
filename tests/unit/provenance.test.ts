import assert from 'node:assert/strict';
import { test } from 'node:test';
import { freshness, parseProvenance, normalizeSourceUrl, mergeFacts, type DataProvenance } from '../../src/lib/data-provenance';

const p = (overrides: Partial<DataProvenance> = {}): DataProvenance => ({
  fieldGroup: 'enrolment', dataYear: '2025', sourceLabel: 'DUO',
  sourceUrl: 'https://duo.nl/data.csv', sourceUpdatedAt: '2025-10-01T00:00:00Z',
  importedAt: '2026-01-01T00:00:00Z', verifiedAt: null, method: 'automatic',
  authority: 'authoritative', ...overrides,
});
test('freshness changes at UTC year boundary, not on import or verification', () => {
  assert.equal(freshness(p(), new Date('2026-12-31T23:59:59Z')), 'current');
  assert.equal(freshness(p(), new Date('2027-01-01T00:00:00Z')), 'stale');
  assert.equal(freshness(p({dataYear:'2023–2024', fieldGroup:'results'}), new Date('2026-01-01Z')), 'stale');
  assert.equal(freshness(p({fieldGroup:'identity', dataYear:'2000'})), 'evergreen');
  assert.equal(freshness(p({fieldGroup:'education', dataYear:'2000'})), 'evergreen');
});
test('admissions school year expires at September boundary', () => {
  const value = p({fieldGroup:'admissions', dataYear:'2025-2026'});
  assert.equal(freshness(value, new Date('2026-08-31T23:59:59Z')), 'current');
  assert.equal(freshness(value, new Date('2026-09-01T00:00:00Z')), 'stale');
});
test('strict metadata, unique categories, safe and normalized URLs', () => {
  assert.equal(normalizeSourceUrl(' HTTPS://DUO.NL/data.csv?year=2025&utm_source=x#top '), 'https://duo.nl/data.csv?year=2025');
  for (const entry of [p({sourceUrl:'javascript:alert(1)'}), p({dataYear:''}), p({sourceLabel:''}), p({method:'manual'}), p({sourceUpdatedAt:'nonsense'}), p({dataYear:'2025-2023'})]) {
    assert.throws(() => parseProvenance([entry]));
  }
  assert.throws(() => parseProvenance([p(), p()]));
});
test('newer publication wins and older fallback cannot regress the record', () => {
  const old = {size: 800, provenance:[p()]};
  const older = mergeFacts(old, {size:600, provenance:[p({sourceUpdatedAt:'2025-01-01T00:00:00Z', authority:'fallback'})]});
  assert.equal(older.data.size, 800);
  assert.ok(older.report.some(x => x.kind === 'regressing'));
  const newer = mergeFacts(old, {size:900, provenance:[p({sourceUpdatedAt:'2025-12-01T00:00:00Z'})]});
  assert.equal(newer.data.size, 900);
});
test('authority tie-break, year regressions and missing publication dates', () => {
  const old = {size:800, provenance:[p()]};
  for (const entry of [p({authority:'fallback'}), p({dataYear:'2024',sourceUpdatedAt:'2026-01-01T00:00:00Z'}), p({sourceUpdatedAt:null})]) {
    assert.equal(mergeFacts(old,{size:600,provenance:[entry]}).data.size,800);
  }
});
test('missing provenance rejects facts; explicit removal reports, omission preserves', () => {
  assert.throws(() => mergeFacts({}, {size:700}), /enrolment/);
  const old = {size:800, provenance:[p()]};
  const cleared = mergeFacts(old, {size:null,provenance:[p()]});
  assert.equal(cleared.data.size,null);
  assert.ok(cleared.report.some(x => x.kind === 'removed' && x.field === 'size'));
  assert.equal(mergeFacts(old, {}).data.size,800);
  assert.throws(() => mergeFacts(old,{provenance:[p({dataYear:'2026'})]}), /without facts/);
});
