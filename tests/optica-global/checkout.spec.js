// Test plan case CO-09 (confirmed bug, BUG-01 in the report): shipping
// address / city don't validate max character length, and long text breaks
// the layout of the order-confirmed summary.
//
// Real login (not mocked): login is a Next.js Server Action — "send code"
// and "verify code" both post to the same /ar/account, distinguished only by
// an internal header, so there's no URL to intercept with page.route().
// Instead, this reuses a storageState generated once, separately, with
// `node --env-file=.env tests/optica-global/setup-auth.js` (real login via
// yopmail). If the storageState is missing or expired, run that script again.
//
// The cart is built with two products/variants with confirmed real stock to
// clear the $150,000 order minimum without hitting the stock limit of other
// variants. Stock gets consumed on every real run of this test (it completes
// a genuinely real order) — if it starts failing on "Cart (0)" after "Add",
// check real stock via
// GET /admin/products?fields=*variants.inventory_items.inventory.location_levels
// and swap the variant here for one with available units.
//
// The bug was only confirmed visually on the order-confirmed page
// (/order/{id}/confirmed), NOT on the checkout Review step: that step keeps
// the overflow contained within its own column (doesn't look broken), but
// the confirmed-order page uses a different layout where the text does spill
// over the neighboring columns (Contact, Method). Every real order this test
// generates stays visible in Admin (Manual Payment, no real charge) — same
// mechanism as the existing test orders #1 through #12.
//
// getBoundingClientRect() of an element does NOT grow from overflowing
// content (overflow: visible doesn't expand the element's own box) — that's
// why comparing bounding boxes between columns doesn't catch the bug. The
// correct way to test it is scrollWidth vs. clientWidth of the paragraph
// holding the text: if scrollWidth > clientWidth, the text doesn't fit in
// its own box and is visually spilling onto whatever's next to it.
const path = require('path');
const { test, expect } = require('@playwright/test');
const { BASE_URL } = require('./helpers');

const LONG_TEXT = '3'.repeat(300);
const STORAGE_STATE_PATH = path.join(__dirname, '.auth', 'customer.json');

test.use({ storageState: STORAGE_STATE_PATH });

test.describe('Checkout — Óptica Global', () => {
  test('CO-09: long address/city do not break the order-confirmed summary', async ({ page }) => {
    await page.goto(`${BASE_URL}/products/optica-zr6046`);
    await page.getByTestId('product-options').getByRole('button', { name: 'Rosa' }).click();
    await page.getByRole('main').getByRole('button', { name: 'Agregar', exact: true }).first().click();
    // Wait for the "add to cart" Server Action to finish before navigating:
    // an immediate goto() can cut the request off mid-flight.
    await page.getByRole('button', { name: /Carrito \(\d+\)/ }).filter({ hasText: /Carrito \([1-9]/ }).waitFor({ timeout: 10000 });

    // Bump the quantity one click at a time with a pause between clicks:
    // clicking too fast can step on the previous action while the UI is
    // still re-rendering.
    await page.goto(`${BASE_URL}/cart`);
    await page.waitForLoadState('networkidle');
    const row = page.getByRole('row', { name: /ZR6046.*Rosa/ });
    for (let i = 0; i < 9; i++) {
      await row.getByLabel('Agregar uno').click();
      await page.waitForTimeout(1200);
    }

    await page.goto(`${BASE_URL}/products/optica-zr6048`);
    await page.getByTestId('product-options').getByRole('button', { name: 'Naranja' }).click();
    await page.getByRole('main').getByRole('button', { name: 'Agregar', exact: true }).first().click();
    await page.waitForTimeout(2000);

    await page.goto(`${BASE_URL}/cart`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'Ir al checkout' }).click();

    await page.getByText('Usar una dirección nueva').click();
    await page.locator('input[name="shipping_address.first_name"]').fill(LONG_TEXT);
    await page.locator('input[name="shipping_address.last_name"]').fill(LONG_TEXT);
    await page.locator('input[name="shipping_address.address_1"]').fill(LONG_TEXT);
    await page.locator('input[name="shipping_address.city"]').fill(LONG_TEXT);
    await page.locator('input[name="shipping_address.postal_code"]').fill('1414');
    // The phone number is already pre-filled (the account has a saved
    // address) in an input hidden behind the +54 selector — no need to fill
    // it again.
    await page.locator('input[name="dni_cuit"]').fill('20345678');
    await page.getByRole('button', { name: /continuar al envío/i }).click();

    // The shipping step is sometimes already expanded into "payment" (single
    // available method); if the "continue to payment" button doesn't show
    // up, move on. The payment step takes a moment to initialize the
    // provider (Manual Payment) before showing "Continue to review".
    const payButton = page.getByRole('button', { name: /continuar al pago/i });
    await page.waitForTimeout(3000);
    if (await payButton.count()) {
      await payButton.click();
    }
    await page.getByRole('button', { name: /continuar a revisión/i }).waitFor({ timeout: 20000 });
    await page.getByRole('button', { name: /continuar a revisión/i }).click();
    await page.getByRole('button', { name: 'Confirmar pedido' }).click();
    await page.waitForURL(/\/order\/.+\/confirmed/, { timeout: 15000 });

    const addressLine = page.locator('[data-testid="shipping-address-summary"] p').nth(1);
    const overflow = await addressLine.evaluate((el) => ({
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
    }));

    // Currently scrollWidth is ~549 vs. clientWidth ~283 (the text doesn't
    // even fit half its column): visually confirms it spills onto "Contact"
    // and "Method", as seen in the real screenshot. Once the fix caps the
    // field length (or adds wrapping), this should flip to
    // scrollWidth <= clientWidth and the test passes on its own, untouched.
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
  });
});
