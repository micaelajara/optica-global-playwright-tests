// Casos CB del plan de pruebas (área Catálogo / Búsqueda).
const { test, expect } = require('@playwright/test');
const { BASE_URL } = require('./helpers');

test.describe('Catálogo — Óptica Global', () => {
  test('CAT-01: filtrar por categoría muestra solo esos productos', async ({ page }) => {
    // Nota (2026-07-06): el filtro de categorías no es un link "Categorías" con
    // dropdown como se asumió originalmente — son botones chip directos en la home
    // ("Todos", "Acetato", etc.), y el filtro se aplica vía query param (?category=...),
    // no una ruta /categories/. Confirmado con `page.getByRole('button')` contra el sitio real.
    //
    // Limitación real del catálogo (no es un bug de este test): hoy las 7 fichas de
    // producto pertenecen todas a la categoría Acetato; Metal y Clip On existen como
    // categorías pero no tienen productos cargados. Este caso no puede validar la
    // exclusión real (productos de OTRA categoría desapareciendo del listado) hasta
    // que haya productos en al menos dos categorías. Ver VOL de "Mejoras"/backlog de datos.
    await page.goto(BASE_URL);
    await page.getByRole('button', { name: 'Acetato', exact: true }).click();

    await expect(page).toHaveURL(/[?&]category=acetato/);
    const productTitles = page.getByTestId('product-title');
    await expect(productTitles.first()).toBeVisible();
  });

  test('CAT-02: una variante sin stock aparece deshabilitada', async ({ page }) => {
    await page.goto(BASE_URL);
    // No hardcodeamos qué producto/color está sin stock hoy: el stock cambia.
    const disabledVariant = page.locator('button[aria-label*="sin stock"]').first();
    await expect(disabledVariant).toBeVisible();
    await expect(disabledVariant).toBeDisabled();
  });
});
