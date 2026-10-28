// SEO-01 through SEO-07 and SEO-10 cases from the test plan (BUG-02 through
// BUG-08 and BUG-10 in the report). These tests document already-confirmed
// bugs. Fixed ones now pass as regression checks; a bug still open is marked
// with test.fail(), so the pipeline stays green while it's known, and the
// test flags it as soon as the fix lands (then the annotation comes out).
import { test, expect } from '@playwright/test';
import { ROOT_URL, BASE_URL, PRODUCT_URL } from './helpers';

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
    test.fail(true, 'BUG-07 still open in production: no rel="canonical" on the home');
    await page.goto(BASE_URL);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
  });

  test('SEO-07: product images do not use a generic alt', async ({ page }) => {
    await page.goto(BASE_URL);
    const genericAlt = page.locator('img[alt="Thumbnail"]');
    expect(await genericAlt.count()).toBe(0);
  });

  test('SEO-10: the product page has a single <h1>', async ({ page }) => {
    // Guard against a false green: if the product is removed from the
    // catalog, the 404 page also has a single <h1>.
    const response = await page.goto(PRODUCT_URL);
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1')).toHaveCount(1);
  });
});
