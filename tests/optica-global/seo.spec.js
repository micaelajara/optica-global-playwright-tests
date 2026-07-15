// Casos SEO-01 a SEO-07 y SEO-10 del plan de pruebas (BUG-02 a BUG-08 y BUG-10 en Reportes).
// Estos tests documentan bugs ya confirmados manualmente: hoy deberían fallar en rojo;
// van a pasar a verde cuando el equipo de desarrollo corrija cada uno.
const { test, expect } = require('@playwright/test');
const { ROOT_URL, BASE_URL, PRODUCT_URL } = require('./helpers');

test.describe('SEO — Óptica Global', () => {
  test('SEO-01: el idioma del documento es español, no inglés', async ({ page }) => {
    await page.goto(BASE_URL);
    const lang = await page.locator('html').getAttribute('lang');
    expect(lang).toMatch(/^es/);
  });

  test('SEO-02: el title de la home incluye el nombre de la marca', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page).toHaveTitle(/Óptica Global/i);
  });

  test('SEO-03: la meta description no es el texto genérico por defecto', async ({ page }) => {
    await page.goto(BASE_URL);
    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description).not.toBe('Catálogo de productos.');
  });

  test('SEO-04: /robots.txt sirve un archivo de texto real, no el HTML de la home', async ({ request }) => {
    const response = await request.get(`${ROOT_URL}/robots.txt`);
    expect(response.headers()['content-type']).toContain('text/plain');
  });

  test('SEO-05: /sitemap.xml sirve un XML real, no el HTML de la home', async ({ request }) => {
    const response = await request.get(`${ROOT_URL}/sitemap.xml`);
    expect(response.headers()['content-type']).toContain('xml');
  });

  test('SEO-06: la página declara un link rel="canonical"', async ({ page }) => {
    await page.goto(BASE_URL);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
  });

  test('SEO-07: las imágenes de producto no usan un alt genérico', async ({ page }) => {
    await page.goto(BASE_URL);
    const genericAlt = page.locator('img[alt="Thumbnail"]');
    expect(await genericAlt.count()).toBe(0);
  });

  test('SEO-10: la ficha de producto tiene un <h1> único', async ({ page }) => {
    await page.goto(PRODUCT_URL);
    await expect(page.locator('h1')).toHaveCount(1);
  });
});
