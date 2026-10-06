import { test, expect } from '@playwright/test';

for (const locale of ['nl', 'en'] as const) {
  test(`${locale}: guide makes central priority rules explicit`, async ({ page }) => {
    await page.goto(`/${locale}/guide`);
    const block = page.getByTestId('priority-guidance');
    await expect(block).toBeVisible();
    await expect(block.getByRole('heading')).toContainText('2025–2026');
    await expect(block).toContainText(locale === 'nl' ? 'broers of zussen' : 'sibling priority');
    await expect(block).toContainText('Montessori');
    await expect(block).toContainText('Dalton');
    await expect(block).toContainText('Waldorf');
    await expect(block).toContainText('Kopklas');
    await expect(block).toContainText('SO/SBO');
    await expect(block).toContainText(locale === 'nl' ? 'toegekende hardheidsclausule' : 'approved hardship');
    await expect(block.getByRole('link')).toHaveAttribute('href', /KERNPROCEDURE-PO-VO-1-2025-2026\.pdf#page=18$/);
  });
}
