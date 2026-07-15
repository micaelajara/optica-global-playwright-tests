# Óptica Global — QA con Playwright

Suite de tests end-to-end que escribí como QA freelance para [Óptica Global](https://opticaglobal.store/ar), un ecommerce B2B mayorista de anteojos (Medusa JS), hoy en producción.

Este repo es una **muestra sanitizada** del trabajo real: mismo código de tests, sin los datos internos del cliente (evidencia de bugs con IDs de órdenes/clientes reales, precios, emails de administración, etc.), que se documentan aparte en un repo privado.

## Qué cubre

- `tests/optica-global/seo.spec.js` — idioma del documento, title, meta description, `robots.txt`, `sitemap.xml`, canonical, alt text de imágenes, `<h1>` único por ficha de producto.
- `tests/optica-global/catalogo.spec.js` — filtros por categoría, variantes sin stock deshabilitadas.
- `tests/optica-global/control-acceso.spec.js` — control de acceso a nivel de API (OWASP API Top 10 / Broken Function Level Authorization): confirma que un endpoint de Admin rechaza requests sin token y con solo la publishable key del storefront.
- `tests/optica-global/checkout.spec.js` — checkout end-to-end con login real (OTP por email) y un pedido real completo (Manual Payment, sin cobro real), reproduciendo un bug de overflow de texto en la página de orden confirmada cuando Dirección/Localidad/Nombre son muy largos.
- `tests/optica-global/setup-auth.js` — genera el `storageState` de una sesión de cliente autenticado leyendo el código OTP directo de la bandeja pública de [yopmail](https://yopmail.com), sin intervención manual.

## Por qué el login es real y no mockeado

El login de Óptica Global es un Server Action de Next.js: "enviar código" y "verificar código" postean al mismo endpoint, distinguidos solo por un header interno — no hay una URL propia que interceptar con `page.route()`. Mockear esa respuesta daría falsa confianza (no valida el backend real), así que el checkout se prueba con una sesión autenticada de verdad.

## Cómo correr

```
npm install
npx playwright test tests/optica-global
```

Requiere un `.env` local (ver `.env.example`) con:
- Credenciales de Admin, para los tests que llaman a la API real.
- `MEDUSA_PUBLISHABLE_KEY`, la publishable key del storefront (no es secreta, pero varía por ambiente).
- `CUSTOMER_EMAIL`, una cuenta `@yopmail.com` que ya tenga un pedido hecho (una cuenta nueva no puede loguearse hasta completar su primer pedido).

Antes de correr `checkout.spec.js` por primera vez (o si el login expira), generar el `storageState`:

```
node --env-file=.env tests/optica-global/setup-auth.js
```

`control-acceso.spec.js` usa IDs de orden/fulfillment de ejemplo (`_EXAMPLE_ID`) — para correrlo contra un ambiente real hay que reemplazarlos por IDs reales obtenidos vía Admin.

## Stack

Playwright + Node.js, contra un storefront Next.js sobre Medusa JS v2.
