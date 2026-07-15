// Caso CO-09 del plan de pruebas (bug ya confirmado, BUG-01 en Reportes):
// Dirección de envío / Localidad no validan longitud máxima de caracteres,
// y el texto largo rompe el layout del resumen de la orden confirmada.
//
// Login real (no mockeado): el login es un Server Action de Next.js — "enviar
// código" y "verificar código" postean al mismo /ar/account, distinguidos solo
// por un header interno, así que no hay URL que interceptar con page.route().
// En cambio, se reusa un storageState generado una vez por separado con
// `node --env-file=.env tests/optica-global/setup-auth.js` (login real vía
// yopmail). Si el storageState falta o expiró, correr ese script de nuevo.
//
// El carrito se arma con dos productos/variantes con stock real confirmado
// para superar el mínimo de pedido de $150.000 sin pisar el límite de stock
// de otras variantes. El stock se va consumiendo con cada corrida real de
// este test (completa una orden real de verdad) — si vuelve a fallar por
// "Carrito (0)" después de "Agregar", chequear stock real vía
// GET /admin/products?fields=*variants.inventory_items.inventory.location_levels
// y cambiar la variante acá por otra con unidades disponibles.
//
// El bug se confirmó visualmente recién en la página de orden confirmada
// (/order/{id}/confirmed), NO en el paso de Revisión del checkout: ese paso
// contiene el overflow dentro de su propia columna (no se ve roto), pero la
// orden confirmada usa un layout distinto donde el texto sí se derrama sobre
// las columnas vecinas (Contacto, Método). Cada pedido real generado por este
// test queda visible en el Admin (Manual Payment, sin cobro real) — mismo
// mecanismo que las órdenes de prueba #1 a #12 ya existentes.
//
// getBoundingClientRect() de un elemento NO crece por el contenido que se
// desborda (overflow: visible no expande la caja del propio elemento) — por
// eso la comparación de bounding boxes entre columnas no detecta el bug. La
// forma correcta de probarlo es scrollWidth vs clientWidth del párrafo que
// contiene el texto: si scrollWidth > clientWidth, el texto no entra en su
// propia caja y se está derramando visualmente sobre lo que esté al lado.
const path = require('path');
const { test, expect } = require('@playwright/test');
const { BASE_URL } = require('./helpers');

const LONG_TEXT = '3'.repeat(300);
const STORAGE_STATE_PATH = path.join(__dirname, '.auth', 'customer.json');

test.use({ storageState: STORAGE_STATE_PATH });

test.describe('Checkout — Óptica Global', () => {
  test('CO-09: dirección/localidad muy largas no rompen el resumen de la orden confirmada', async ({ page }) => {
    await page.goto(`${BASE_URL}/products/optica-zr6046`);
    await page.getByTestId('product-options').getByRole('button', { name: 'Rosa' }).click();
    await page.getByRole('main').getByRole('button', { name: 'Agregar', exact: true }).first().click();
    // Esperar a que el Server Action de "agregar al carrito" termine antes de
    // navegar: un goto() inmediato puede cortar el request a mitad de camino.
    await page.getByRole('button', { name: /Carrito \(\d+\)/ }).filter({ hasText: /Carrito \([1-9]/ }).waitFor({ timeout: 10000 });

    // Subir la cantidad de a un click con espera entre clicks: clickear muy rápido
    // seguido puede pisar el paso anterior (la UI todavía no terminó de re-renderizar).
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
    // El teléfono ya viene precargado (cuenta con dirección guardada) en un input
    // oculto detrás del selector +54 — no hace falta completarlo de nuevo.
    await page.locator('input[name="dni_cuit"]').fill('20345678');
    await page.getByRole('button', { name: /continuar al envío/i }).click();

    // El paso de envío a veces ya viene expandido a "pago" (método único
    // disponible); si el botón de "continuar al pago" no aparece, seguimos.
    // El paso de pago tarda un momento en inicializar el proveedor (Manual
    // Payment) antes de mostrar "Continuar a revisión".
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

    // Hoy da scrollWidth ~549 vs clientWidth ~283 (texto no entra ni a la mitad
    // de su columna): confirma visualmente que se derrama sobre "Contacto" y
    // "Método", tal como se ve en el screenshot real. Cuando el fix limite la
    // longitud del campo (o agregue wrap), esto debería pasar a scrollWidth <=
    // clientWidth y el test pasa solo, sin tocarlo.
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
  });
});
