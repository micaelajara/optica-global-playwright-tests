// Caso API-08 del plan de pruebas: ¿puede un cliente (no admin) disparar una
// acción de Admin, como marcar una orden como entregada?
//
// Diseño a nivel API (request fixture, no UI): el botón "Mark as delivered" vive
// solo en el Admin, al que un cliente normal ni siquiera puede loguearse — el riesgo
// real es de autorización en el backend (Broken Function Level Authorization,
// OWASP API Top 10), no algo clickeable desde el storefront.
//
// TODO: el segmento final de la URL ("mark-as-delivered") no está confirmado por
// DevTools todavía; se usa la mejor estimación según Medusa v2. Si algún test de
// acá da 404 en vez de 401/403, ajustar la ruta abriendo el Admin, haciendo click
// en "Mark as delivered" y copiando la request real. La orden y el fulfillment
// usados originalmente eran reales, confirmados por GET /admin/orders con token
// de admin (acá se muestran con IDs de ejemplo, no los reales); no se ejecutó la
// mutación real porque la clasificación de riesgo de la sesión la bloqueó por
// defecto (escribir sobre una orden de producción real) y no hubo confirmación
// explícita para forzarla.
const { test, expect } = require('@playwright/test');
const { ADMIN_API_URL, MEDUSA_PUBLISHABLE_KEY } = require('./helpers');

const ORDER_ID = 'order_EXAMPLE_ID'; // reemplazar por un ID de orden real al correr
const FULFILLMENT_ID = 'ful_EXAMPLE_ID'; // reemplazar por un ID de fulfillment real al correr
const MARK_AS_DELIVERED_URL = `${ADMIN_API_URL}/orders/${ORDER_ID}/fulfillments/${FULFILLMENT_ID}/mark-as-delivered`;

test.describe('Control de acceso — Óptica Global', () => {
  test('CA-01: marcar una orden como entregada sin ningún token de auth es rechazado', async ({ request }) => {
    const response = await request.post(MARK_AS_DELIVERED_URL, { data: {} });
    expect([401, 403]).toContain(response.status());
  });

  test('CA-02: la publishable key del storefront (sin token de cliente) no alcanza para una acción de Admin', async ({ request }) => {
    const response = await request.post(MARK_AS_DELIVERED_URL, {
      data: {},
      headers: { 'x-publishable-api-key': MEDUSA_PUBLISHABLE_KEY },
    });
    expect([401, 403]).toContain(response.status());
  });

  // Caso ideal pendiente (no automatizado todavía): ¿un token real de cliente
  // logueado (tipo Guest, sin rol admin) es rechazado por este mismo endpoint?
  // No se puede probar sin hacer el login manual real una vez y generar un
  // storageState — un login mockeado no produce un JWT/cookie válido que el
  // backend vaya a aceptar, así que un test con ese mock daría falsa confianza.
  // Queda como caso manual (API-08 en la planilla) hasta que se decida ese login real.
});
