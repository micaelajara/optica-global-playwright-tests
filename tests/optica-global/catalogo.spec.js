// CB cases from the test plan (Catalog / Search area).
const { test, expect } = require('@playwright/test');
const { BASE_URL } = require('./helpers');

test.describe('Catálogo — Óptica Global', () => {
  test('CAT-01: filtering by category shows only those products', async ({ page }) => {
    // Note (2026-07-06): the category filter isn't a "Categorías" link with a
    // dropdown as originally assumed — they're direct chip buttons on the
    // home page ("Todos", "Acetato", etc.), and the filter is applied via a
    // query param (?category=...), not a /categories/ route. Confirmed with
    // `page.getByRole('button')` against the real site.
    //
    // Real catalog limitation (not a bug in this test): today all 7 product
    // cards belong to the Acetato category; Metal and Clip On exist as
    // categories but have no products loaded. This case can't validate real
    // exclusion (products from ANOTHER category disappearing from the
    // listing) until there are products in at least two categories. See VOL
    // in the "Improvements"/data backlog.
    await page.goto(BASE_URL);
    await page.getByRole('button', { name: 'Acetato', exact: true }).click();

    await expect(page).toHaveURL(/[?&]category=acetato/);
    const productTitles = page.getByTestId('product-title');
    await expect(productTitles.first()).toBeVisible();
  });

  test('CAT-02: an out-of-stock variant appears disabled', async ({ page }) => {
    await page.goto(BASE_URL);
    // Not hardcoding which product/color is out of stock today: stock changes.
    const disabledVariant = page.locator('button[aria-label*="sin stock"]').first();
    await expect(disabledVariant).toBeVisible();
    await expect(disabledVariant).toBeDisabled();
  });
});
