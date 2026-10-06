import { test, expect, type Page } from '@playwright/test';
import { seedProfileId, PROD_PROFILE_ID } from './test-utils';

const schools = [
  { id: 'z', name: 'Zulu', levels: ['VWO'], lat: 52.38, lon: 4.90 },
  { id: 'a', name: 'Alpha', levels: ['HAVO'], lat: 52.37, lon: 4.90 },
  { id: 'b', name: 'Beta', levels: ['VWO'], lat: 52.39, lon: 4.90 },
  { id: 'c', name: 'Charlie', levels: ['VWO'], lat: null, lon: null },
].map(s => ({ ...s, concepts: [], city: 'Amsterdam', postalCode: null }));
const items = [
  { schoolId: 'z', metrics: { bikeRoute: 5 } },
  { schoolId: 'a', metrics: { bikeRoute: 5 } },
  { schoolId: 'b', metrics: { hasCanteen: 'no' } },
  { schoolId: 'c', metrics: {} },
];
async function mockSchools(page: Page) {
  await page.route('**/api/schools?*', route => {
    const url = new URL(route.request().url());
    const result = schools.filter(s => (!url.searchParams.get('q') || s.name.toLowerCase().includes(url.searchParams.get('q')!.toLowerCase())) && (!url.searchParams.get('levels') || s.levels.includes(url.searchParams.get('levels')!)));
    return route.fulfill({ json: { schools: result } });
  });
}
const names = (page: Page) => page.getByTestId('school-name');

test('bulk score ordering, alphabetical ties, zero, empty records and combined filters', async ({ page }) => {
  await seedProfileId(page);
  await mockSchools(page);
  const requests: URL[] = [];
  await page.route('**/api/profile/impression?*', route => {
    requests.push(new URL(route.request().url()));
    return route.fulfill({ json: { items } });
  });
  await page.goto('/en/schools');
  await expect(page.getByTestId('school-card').filter({ hasText: 'Alpha' }).getByTestId('school-score')).toContainText('100%');
  await page.getByLabel('Sort by').selectOption('score');
  await expect(names(page)).toHaveText(['Alpha', 'Zulu', 'Beta', 'Charlie']);
  await expect(page.getByTestId('school-card').last().getByTestId('school-score')).toHaveText('My score: —');
  await page.getByLabel('Only schools I rated').check();
  await expect(names(page)).toHaveText(['Alpha', 'Zulu', 'Beta']);
  expect(requests).toHaveLength(1);
  expect(requests[0].searchParams.get('schoolIds')?.split(',')).toHaveLength(4);
  expect(requests[0].searchParams.has('schoolId')).toBe(false);
  await page.getByLabel('VWO', { exact: true }).check();
  await expect(names(page)).toHaveText(['Zulu', 'Beta']);
  await page.getByRole('searchbox').fill('Zulu');
  await expect(names(page)).toHaveText(['Zulu']);
  await page.getByRole('searchbox').fill('');
  await page.getByRole('button', { name: /Distance.*bike/i }).click();
  await page.route('**/api/geocode-zip?*', route => route.fulfill({ json: { lat: 52.37, lon: 4.90 } }));
  await page.getByPlaceholder('1017AB').fill('1017AB');
  await expect(page.locator('option[value="distance"]')).toHaveCount(1);
  await page.getByLabel('Sort by').selectOption('distance');
  await expect(names(page)).toHaveText(['Zulu', 'Beta']);
  await expect(page.getByTestId('school-distance')).toHaveCount(2);
  await page.getByPlaceholder('1017AB').fill('');
  await expect(page.getByLabel('Sort by')).toHaveValue('default');
});

test('database failure uses cache and returning after an edit refreshes it', async ({ page }) => {
  await seedProfileId(page);
  await mockSchools(page);
  await page.addInitScript(({ profile, items }) => {
    for (const item of items) localStorage.setItem(`schoolkeuze:impression:v1:${profile}:${item.schoolId}`, JSON.stringify(item.metrics));
  }, { profile: PROD_PROFILE_ID, items });
  await page.route('**/api/profile/impression?*', route => route.fulfill({ status: 503, json: { error: 'Database unavailable' } }));
  await page.goto('/nl/schools');
  await page.getByLabel('Sorteer op').selectOption('score');
  await expect(names(page)).toHaveText(['Alpha', 'Zulu', 'Beta', 'Charlie']);
  await page.getByLabel('Alleen scholen die ik heb beoordeeld').check();
  await expect(names(page)).toHaveText(['Alpha', 'Zulu', 'Beta']);
  // Simulate another tab editing the same profile, then returning to the explorer.
  await page.evaluate(profile => {
    localStorage.setItem(`schoolkeuze:impression:v1:${profile}:a`, JSON.stringify({ bikeRoute: 1 }));
    window.dispatchEvent(new Event('focus'));
  }, PROD_PROFILE_ID);
  await expect(names(page)).toHaveText(['Zulu', 'Alpha', 'Beta']);
});

test('pending profile shows unrated schools and makes no impression requests', async ({ page }) => {
  await mockSchools(page);
  await page.route('**/api/profile/new-id', () => {});
  let calls = 0;
  await page.route('**/api/profile/impression?*', route => { calls++; return route.fulfill({ json: { items: [] } }); });
  await page.goto('/en/schools');
  await expect(names(page)).toHaveCount(4);
  await expect(page.getByTestId('school-score').first()).toHaveText('My score: —');
  await page.getByLabel('Only schools I rated').check();
  await expect(names(page)).toHaveCount(0);
  expect(calls).toBe(0);
});

test('name sorting and API refresh after returning to the explorer', async ({ page }) => {
  await seedProfileId(page);
  await mockSchools(page);
  let current = items;
  await page.route('**/api/profile/impression?*', route => route.fulfill({ json: { items: current } }));
  await page.goto('/en/schools');
  await page.getByLabel('Sort by').selectOption('name');
  await expect(names(page)).toHaveText(['Alpha', 'Beta', 'Charlie', 'Zulu']);
  await page.getByLabel('Sort by').selectOption('score');
  await expect(names(page)).toHaveText(['Alpha', 'Zulu', 'Beta', 'Charlie']);
  current = items.map(item => item.schoolId === 'a' ? { ...item, metrics: { bikeRoute: 1 } } : item);
  await page.evaluate(() => window.dispatchEvent(new Event('pageshow')));
  await expect(names(page)).toHaveText(['Zulu', 'Alpha', 'Beta', 'Charlie']);
});
