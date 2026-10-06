import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calculateImpressionSummary } from '../../src/lib/impression-score';

test('empty and invalid metrics are unrated', () => {
  for (const metrics of [null, {}, { overallVibe: null }, { overallVibe: 6, hasClubs: 'invalid' }]) {
    assert.deepEqual(calculateImpressionSummary(metrics), { score: null, confidence: 0 });
  }
});
test('partial answers retain their score and weighted coverage', () => {
  const result = calculateImpressionSummary({ bikeRoute: 4 });
  assert.equal(result.score, 80);
  assert.ok(Math.abs(result.confidence - 8) < 0.00001);
});
test('no is an answered zero, not an unrated impression', () => {
  const result = calculateImpressionSummary({ hasCanteen: 'no' });
  assert.equal(result.score, 0);
  assert.ok(result.confidence > 0);
});
test('sections retain original weights when partially answered', () => {
  const result = calculateImpressionSummary({ canImagineYourself: 5, bikeRoute: 1 });
  assert.ok(Math.abs(result.score! - (100 * .28 + 20 * .16) / .44) < .00001);
});
