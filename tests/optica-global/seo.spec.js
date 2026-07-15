// SEO-01 through SEO-07 and SEO-10 cases from the test plan (BUG-02 through
// BUG-08 and BUG-10 in the report). These tests document already-confirmed
// bugs: today they're expected to fail red; they'll go green once the dev
// team fixes each one.
const { test, expect } = require('@playwright/test');
const { ROOT_URL, BASE_URL, PRODUCT_URL } = require('./helpers');

test.describe('SEO — Óptica Global', () => {
  test('SEO-01: document language is Spanish, not English', async ({ page }) => {
    await page.goto(BASE_URL);
    const lang = await page.locator('html').getAttribute('lang');
    expect(lang).toMatch(/^es/);
  });

  test('SEO-02: home title includes the brand name', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page).toHaveTitle(/Óptica Global/i);
  });

  test('SEO-03: meta description is not the generic default text', async ({ page }) => {
    await page.goto(BASE_URL);
    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description).not.toBe('Catálogo de productos.');
  });

  test('SEO-04: /robots.txt serves a real text file, not the home HTML', async ({ request }) => {
    const response = await request.get(`${ROOT_URL}/robots.txt`);
    expect(response.headers()['content-type']).toContain('text/plain');
  });

  test('SEO-05: /sitemap.xml serves real XML, not the home HTML', async ({ request }) => {
    const response = await request.get(`${ROOT_URL}/sitemap.xml`);
    expect(response.headers()['content-type']).toContain('xml');
  });

  test('SEO-06: the page declares a rel="canonical" link', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
  });

  test('SEO-07: product images do not use a generic alt', async ({ page }) => {
    await page.goto(BASE_URL);
    const genericAlt = page.locator('img[alt="Thumbnail"]');
    expect(await genericAlt.count()).toBe(0);
  });

  test('SEO-10: the product page has a single <h1>', async ({ page }) => {
    await page.goto(PRODUCT_URL);
    await expect(page.locator('h1')).toHaveCount(1);
  });
});
