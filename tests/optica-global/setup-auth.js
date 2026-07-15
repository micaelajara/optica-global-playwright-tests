// Generates a real storageState (logged-in customer JWT) for tests that need
// to reach checkout authenticated, avoiding mocking the login with
// page.route() (doesn't work here: login is a Next.js Server Action that
// posts to the same /ar/account for both "send code" and "verify code",
// distinguished only by an internal header — no dedicated URL to intercept).
//
// Requires CUSTOMER_EMAIL in .env: an @yopmail.com account that ALREADY has
// a placed order (a brand-new account can't log in until it completes its
// first order, see BUG-15 in the test plan). yopmail exposes its inbox over
// the web with no login, so this script reads the code directly, with no
// manual step needed.
//
// Run it again if the storageState expires or if CUSTOMER_EMAIL changes:
//   node --env-file=.env tests/optica-global/setup-auth.js
const { chromium } = require('playwright');
const { BASE_URL } = require('./helpers');

const CUSTOMER_EMAIL = process.env.CUSTOMER_EMAIL;
const STORAGE_STATE_PATH = require('path').join(__dirname, '.auth', 'customer.json');

async function readCodeFromYopmail(browser, email) {
  const localPart = email.split('@')[0];
  const mailPage = await browser.newPage({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  });
  await mailPage.goto(`https://yopmail.com/?login=${localPart}`);
  let lastError;
  for (let attempt = 0; attempt < 6; attempt++) {
    await mailPage.waitForTimeout(2000);
    await mailPage.reload();
    await mailPage.waitForTimeout(1000);
    try {
      const inboxFrame = mailPage.frame({ name: 'ifinbox' });
      await inboxFrame.locator('div.m').first().click({ timeout: 3000 });
      await mailPage.waitForTimeout(1000);
      const mailFrame = mailPage.frame({ name: 'ifmail' });
      const text = await mailFrame.locator('body').innerText();
      const match = text.match(/(\d{6})/);
      if (match) {
        await mailPage.close();
        return match[1];
      }
      lastError = new Error('The latest email does not contain a 6-digit code');
    } catch (e) {
      lastError = e;
    }
  }
  await mailPage.close();
  throw new Error('Could not read the access code for ' + email + ': ' + lastError?.message);
}

(async () => {
  if (!CUSTOMER_EMAIL) throw new Error('Missing CUSTOMER_EMAIL in .env (see .env.example)');

  const browser = await chromium.launch();
  const loginPage = await browser.newPage();
  await loginPage.goto(`${BASE_URL}/account`);
  await loginPage.locator('input[name="email"]').fill(CUSTOMER_EMAIL);
  await loginPage.getByRole('button', { name: 'Enviar código' }).click();
  const enterButton = loginPage.getByRole('button', { name: 'Entrar' });
  await enterButton.waitFor({ state: 'visible', timeout: 15000 });

  const code = await readCodeFromYopmail(browser, CUSTOMER_EMAIL);

  const codeInput = loginPage.locator('input').last();
  await codeInput.fill(code);
  await enterButton.click();
  await loginPage.waitForTimeout(2000);

  const loggedIn = await loginPage.getByRole('button', { name: 'Salir' }).count();
  if (!loggedIn) {
    throw new Error('Login did not end in a signed-in session — check CUSTOMER_EMAIL or the identification flow');
  }

  await loginPage.context().storageState({ path: STORAGE_STATE_PATH });
  console.log('storageState saved to', STORAGE_STATE_PATH);
  await browser.close();
})();
