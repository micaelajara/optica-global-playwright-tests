// Genera un storageState real (JWT de cliente logueado) para tests que necesitan
// llegar autenticados al checkout, evitando mockear el login con page.route()
// (no funciona acá: el login es un Server Action de Next.js que postea al mismo
// /ar/account tanto para "enviar código" como para "verificar código", distinguidos
// solo por un header interno — no hay URL propia que interceptar).
//
// Requiere CUSTOMER_EMAIL en .env: un cliente @yopmail.com que YA tenga un pedido
// hecho (una cuenta nueva no puede loguearse hasta completar su primer pedido,
// ver BUG-15 en el plan de pruebas). yopmail expone su bandeja por web sin login,
// así que este script lee el código directamente, sin intervención manual.
//
// Correrlo de nuevo si el storageState expira o si cambia CUSTOMER_EMAIL:
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
      lastError = new Error('El último mail no contiene un código de 6 dígitos');
    } catch (e) {
      lastError = e;
    }
  }
  await mailPage.close();
  throw new Error('No se pudo leer el código de acceso de ' + email + ': ' + lastError?.message);
}

(async () => {
  if (!CUSTOMER_EMAIL) throw new Error('Falta CUSTOMER_EMAIL en .env (ver .env.example)');

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
    throw new Error('El login no terminó en sesión iniciada — revisar CUSTOMER_EMAIL o el flujo de identificación');
  }

  await loginPage.context().storageState({ path: STORAGE_STATE_PATH });
  console.log('storageState guardado en', STORAGE_STATE_PATH);
  await browser.close();
})();
