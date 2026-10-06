import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildAdmissionsInfo } from '../../src/lib/admissions-info';
import admissionsPriority from '../../src/lib/admissions-priority.json';

for (const levels of [['HAVO'], ['VWO'], ['VSO', 'HAVO'], ['PRAKTIJKONDERWIJS']] as const) {
  test(`generated school guidance does not invent priority for ${levels.join('/')}`, () => {
    const info = buildAdmissionsInfo({ name: 'Montessori test school', levels: [...levels] });
    for (const locale of ['nl', 'en'] as const) {
      assert.doesNotMatch(
        info[locale].schoolSpecific.join(' '),
        /priority rules and lottery number|voorrang en lotnummer/i
      );
    }
  });
}

test('generated school guidance links to the centrally configured annual procedure', () => {
  const info = buildAdmissionsInfo({ name: 'Test school', levels: ['HAVO'] });
  assert.equal(admissionsPriority.procedureYear, '2025–2026');
  assert.ok(info.sources.some(source => source.url === admissionsPriority.annualProcedureUrl));
});
