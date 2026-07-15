// Test plan case API-08: can a customer (non-admin) trigger an Admin action,
// like marking an order as delivered?
//
// API-level design (request fixture, no UI): the "Mark as delivered" button
// only lives in Admin, which a regular customer can't even log into — the
// real risk is backend authorization (Broken Function Level Authorization,
// OWASP API Top 10), not something clickable from the storefront.
//
// TODO: the final URL segment ("mark-as-delivered") hasn't been confirmed
// via DevTools yet; it's using the best guess based on Medusa v2. If any
// test here returns 404 instead of 401/403, adjust the route by opening
// Admin, clicking "Mark as delivered", and copying the real request. The
// order and fulfillment originally used were real, confirmed via
// GET /admin/orders with an admin token (shown here with placeholder IDs,
// not the real ones); the real mutation was never run because the session's
// risk classification blocked it by default (writing to a real production
// order) and there was no explicit confirmation to force it.
const { test, expect } = require('@playwright/test');
const { ADMIN_API_URL, MEDUSA_PUBLISHABLE_KEY } = require('./helpers');

const ORDER_ID = 'order_EXAMPLE_ID'; // replace with a real order ID to run this
const FULFILLMENT_ID = 'ful_EXAMPLE_ID'; // replace with a real fulfillment ID to run this
const MARK_AS_DELIVERED_URL = `${ADMIN_API_URL}/orders/${ORDER_ID}/fulfillments/${FULFILLMENT_ID}/mark-as-delivered`;

test.describe('Control de acceso — Óptica Global', () => {
  test('CA-01: marking an order as delivered with no auth token is rejected', async ({ request }) => {
    const response = await request.post(MARK_AS_DELIVERED_URL, { data: {} });
    expect([401, 403]).toContain(response.status());
  });

  test('CA-02: the storefront publishable key (no customer token) is not enough for an Admin action', async ({ request }) => {
    const response = await request.post(MARK_AS_DELIVERED_URL, {
      data: {},
      headers: { 'x-publishable-api-key': MEDUSA_PUBLISHABLE_KEY },
    });
    expect([401, 403]).toContain(response.status());
  });

  // Pending ideal case (not automated yet): is a real logged-in customer
  // token (non-admin role) rejected by this same endpoint? Can't test this
  // without doing a real manual login once and generating a storageState —
  // a mocked login wouldn't produce a valid JWT/cookie the backend would
  // accept, so a test with that mock would give false confidence. Stays as
  // a manual case (API-08 in the spreadsheet) until that real login is set up.
});
