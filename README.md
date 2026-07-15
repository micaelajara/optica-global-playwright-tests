# Óptica Global — QA with Playwright

End-to-end test suite I wrote as a freelance QA for [Óptica Global](https://opticaglobal.store/ar), a B2B wholesale eyewear ecommerce (Medusa JS), now live in production.

This repo is a **sanitized showcase** of the real work: same test code, without the client's internal data (bug evidence with real order/customer IDs, pricing, admin emails, etc.), which is documented separately in a private companion repo.

## What it covers

- `tests/optica-global/seo.spec.js` — document language, title, meta description, `robots.txt`, `sitemap.xml`, canonical tag, image alt text, unique `<h1>` per product page.
- `tests/optica-global/catalogo.spec.js` — category filters, out-of-stock variants shown as disabled.
- `tests/optica-global/control-acceso.spec.js` — API-level access control (OWASP API Top 10 / Broken Function Level Authorization): confirms an Admin endpoint rejects requests with no token and with only the storefront's publishable key.
- `tests/optica-global/checkout.spec.js` — end-to-end checkout with a real login (email OTP) and a real completed order (Manual Payment, no real charge), reproducing a text-overflow bug on the order-confirmed page when Address/City/Name are too long.
- `tests/optica-global/setup-auth.js` — generates the `storageState` for an authenticated customer session by reading the OTP code straight from [yopmail](https://yopmail.com)'s public inbox, no manual steps needed.

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

Before running `checkout.spec.js` for the first time (or if the login expires), generate the `storageState`:

```
node --env-file=.env tests/optica-global/setup-auth.js
```

`control-acceso.spec.js` uses placeholder order/fulfillment IDs (`_EXAMPLE_ID`) — to run it against a real environment, swap them for real IDs pulled from Admin.

## Stack

Playwright + Node.js, against a Next.js storefront on top of Medusa JS v2.
