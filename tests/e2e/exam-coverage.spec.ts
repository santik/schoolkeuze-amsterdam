import { test, expect, type APIRequestContext } from '@playwright/test';

async function schoolId(request: APIRequestContext, name: string) {
  const response = await request.get(`/api/schools?q=${encodeURIComponent(name)}&take=200`);
  expect(response.ok()).toBeTruthy();
  const { schools } = await response.json();
  const school = schools.find((s: { name: string }) => s.name === name);
  expect(school).toBeTruthy();
  expect(school.results.examCoverage.year).toBe('2024-2025');
  return school.id as string;
}

for (const locale of ['nl', 'en']) {
  test(`${locale}: detail shows dated source results, counts and context`, async ({ page, request }) => {
    const id = await schoolId(request, 'Het Amsterdams Lyceum');
    await page.goto(`/${locale}/schools/${id}`);
    await expect(page.getByTestId('exam-toggle')).toContainText('2024-2025');
    await page.getByTestId('exam-toggle').click();
    const coverage = page.getByTestId('exam-coverage');
    await expect(coverage).toContainText('VWO');
    await expect(coverage).toContainText('186');
    await expect(coverage).toContainText('160');
    await expect(coverage).toContainText('86%');
    await expect(coverage).toContainText(locale === 'nl' ? 'geen algemeen kwaliteitsoordeel' : 'not an overall quality rating');
    await expect(coverage.getByRole('link')).toHaveAttribute('href', /geslaagden-gezakten-en-cijfers-2024-2025.csv$/);
    await page.getByTestId('exam-toggle').click();
    await expect(coverage).toHaveCount(0);
  });

  test(`${locale}: comparison preserves all tracks, date and cohort context`, async ({ page, request }) => {
    const ids = await Promise.all(['College De Meer', 'Lumion'].map(n => schoolId(request, n)));
    await page.goto(`/${locale}/compare?ids=${ids.join(',')}`);
    const row = page.getByTestId('compare-row-passrate');
    await expect(row.getByTestId('exam-year')).toHaveCount(2);
    for (const track of ['VMBO-B', 'VMBO-K', 'VMBO-T', 'HAVO']) await expect(row).toContainText(track);
    await expect(row).toContainText('141');
    await expect(row).toContainText('66%');
    await expect(row).toContainText(locale === 'nl' ? 'Kandidaten' : 'Candidates');
    await expect(row).toContainText('2024-2025');
  });

  test(`${locale}: suppression and legitimate absence are distinguished`, async ({ page, request }) => {
    const ids = await Promise.all(['Barlaeus Gymnasium', 'Kolom Praktijkcollege De Atlant', 'Berlage Lyceum'].map(n => schoolId(request, n)));
    await page.goto(`/${locale}/compare?ids=${ids.join(',')}`);
    const row = page.getByTestId('compare-row-passrate');
    await expect(row).toContainText(locale === 'nl' ? 'Afgeschermde kleine groep' : 'Suppressed small group');
    await expect(row).toContainText(locale === 'nl' ? 'Geen eindexamenopleiding' : 'No final-exam programme');
    await expect(row).toContainText(locale === 'nl' ? 'Geen bevestigde vestigingskoppeling' : 'No verified branch match');
  });
}
