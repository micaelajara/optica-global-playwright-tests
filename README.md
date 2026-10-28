# Óptica Global — QA with Playwright

End-to-end test suite I wrote as a freelance QA for [Óptica Global](https://opticaglobal.store/ar), a B2B wholesale eyewear ecommerce (Medusa JS), now live in production.

This repo is a **sanitized showcase** of the real work: same test code, without the client's internal data (bug evidence with real order/customer IDs, pricing, admin emails, etc.), which is documented separately in a private companion repo.

## What it covers

- `tests/optica-global/seo.spec.ts` — document language, title, meta description, `robots.txt`, `sitemap.xml`, canonical tag, image alt text, unique `<h1>` per product page.
- `tests/optica-global/catalogo.spec.ts` — category filters, out-of-stock variants shown as disabled.
- `tests/optica-global/control-acceso.spec.ts` — API-level access control (OWASP API Top 10 / Broken Function Level Authorization): confirms an Admin endpoint rejects requests with no token and with only the storefront's publishable key.
- `tests/optica-global/checkout.spec.ts` — end-to-end checkout with a real login (email OTP) and a real completed order (Manual Payment, no real charge), reproducing a text-overflow bug on the order-confirmed page when Address/City/Name are too long.
- `tests/optica-global/setup-auth.ts` — generates the `storageState` for an authenticated customer session by reading the OTP code straight from [yopmail](https://yopmail.com)'s public inbox, no manual steps needed.

## Why the login is real, not mocked

Óptica Global's login is a Next.js Server Action: "send code" and "verify code" both post to the same endpoint, distinguished only by an internal header — there's no dedicated URL to intercept with `page.route()`. Mocking that response would give false confidence (it wouldn't validate the real backend), so checkout is tested against a genuinely authenticated session.

## How to run

```
npm install
npx playwright test tests/optica-global
```

Requires a local `.env` (see `.env.example`) with:
- Admin credentials, for tests that call the real API.
- `MEDUSA_PUBLISHABLE_KEY`, the storefront's publishable key (not secret, but varies per environment).
- `CUSTOMER_EMAIL`, an `@yopmail.com` account that already has a placed order (a brand-new account can't log in until it completes its first order).

Before running `checkout.spec.ts` for the first time (or if the login expires), generate the `storageState`:

```
npm run setup-auth
```

`control-acceso.spec.ts` uses placeholder order/fulfillment IDs (`_EXAMPLE_ID`) — to run it against a real environment, swap them for real IDs pulled from Admin.

## CI/CD

`.github/workflows/playwright.yml` splits the suite by risk instead of running everything on every push:

- **Type check** runs on every push/PR, no browsers needed — fails fast on type errors before the heavier jobs spin up.
- **SEO + Catálogo** run automatically on every push/PR — they're read-only against the production storefront. Bugs the dev team already fixed stay as regression checks; the one still open (missing canonical tag, BUG-07) is marked `test.fail()`, so the run is green while the bug is known and turns red the day it's fixed and the annotation needs to come out.
- **Control de acceso** and **Checkout** are manual (`workflow_dispatch` only). Control de acceso needs real order/fulfillment IDs (the placeholders 404). Checkout completes a real order and consumes real stock on every run, so it doesn't belong in an unattended, automatic trigger.

Secrets used in CI (`MEDUSA_PUBLISHABLE_KEY`, `CUSTOMER_EMAIL`) map to the same variables documented in `.env.example`, set as repo secrets instead of a committed `.env`.

## Stack

Playwright + TypeScript, against a Next.js storefront on top of Medusa JS v2. `tsc --noEmit` (via `npm run typecheck`) gates every push in CI.
