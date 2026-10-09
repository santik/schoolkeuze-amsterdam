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

test('school guidance links only to the school itself and the ELK parent portal', () => {
  const info = buildAdmissionsInfo({
    name: 'Test school',
    levels: ['HAVO'],
    websiteUrl: 'https://test-school.example/',
  });
  assert.equal(admissionsPriority.procedureYear, '2025–2026');

  const hosts = info.sources.map(source => new URL(source.url).hostname);
  assert.deepEqual(hosts, ['test-school.example', 'www.elkadam.info']);

  // Other bodies are named in the guidance text, never linked.
  for (const source of info.sources) {
    assert.doesNotMatch(source.url, /schoolkeuze020|osvo|stichtingvsa/i);
  }
});
