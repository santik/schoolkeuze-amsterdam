import { test, expect } from "@playwright/test";

for (const locale of ["nl", "en"] as const) {
  for (const mobile of [false, true]) {
    test(`${locale} parent support, ${mobile ? "mobile" : "desktop"}`, async ({ page }) => {
      await page.setViewportSize(mobile ? { width: 375, height: 812 } : { width: 1280, height: 900 });
      await page.goto(`/${locale}/guide`);
      const nonPlacement = page.getByTestId("parent-support-non-placement");
      const capacity = page.getByTestId("parent-support-capacity");
      await expect(nonPlacement).toBeVisible();
      await expect(capacity).toBeVisible();
      await expect(nonPlacement.locator("xpath=preceding-sibling::*[1]")).toContainText(
        locale === "en" ? "What if my child" : "Wat als mijn kind"
      );
      await expect(capacity.locator("xpath=preceding-sibling::*[1]")).toContainText("2025");
      await expect(nonPlacement.locator("strong")).toHaveText(locale === "en"
        ? ["Official procedure", "Independent parent support"]
        : ["Officiële procedure", "Onafhankelijke ouderondersteuning"]);
      // ELK is the only body linked out to; the rest are named in the text.
      await expect(nonPlacement.locator("a")).toHaveCount(1);
      await expect(nonPlacement.getByRole("link").nth(0)).toHaveAttribute(
        "href",
        "https://www.elkadam.info"
      );
      await expect(nonPlacement).toContainText("OSVO");
      await expect(page.getByRole("link", { name: /Stichting VSA/ })).toHaveCount(0);
      await expect(page.getByText(/Stichting VSA/).first()).toBeVisible();
      await expect(capacity).toContainText(locale === "en" ? "historical placement figures" : "historische plaatsingscijfers");
      for (const block of [nonPlacement, capacity]) {
        await expect(block).toContainText(locale === "en" ? "independent parent organisation" : "onafhankelijke ouderorganisatie");
        await expect(block).toContainText(locale === "en" ? "does not run the lottery" : "voert de loting niet uit");
        for (const link of await block.getByRole("link").all()) {
          await expect(link).toHaveAttribute("target", "_blank");
          await expect(link).toHaveAttribute("rel", "noopener noreferrer");
          await expect(link).toHaveAccessibleName(locale === "en" ? /external link, opens in a new tab/ : /externe link, opent in een nieuw tabblad/);
        }
        const bounds = await block.boundingBox();
        expect(bounds).not.toBeNull();
        expect(bounds!.x).toBeGreaterThanOrEqual(0);
        expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(mobile ? 375 : 1280);
        await block.screenshot({ path: `test-results/parent-support-${locale}-${mobile ? "mobile" : "desktop"}-${block === capacity ? "capacity" : "non-placement"}.png` });
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

      // No source links anywhere on the guide except the school-neutral ELK portal.
      const hosts = await page.evaluate(() =>
        Array.from(document.querySelectorAll('a[href^="http"]')).map(
          (a) => new URL((a as HTMLAnchorElement).href).hostname
        )
      );
      expect([...new Set(hosts)].sort()).toEqual(["www.elkadam.info"]);
      await expect(page.getByText(/Every year, Stichting VSA|Elk jaar organiseert Stichting VSA/)).toHaveCount(0);
    });
  }
}
