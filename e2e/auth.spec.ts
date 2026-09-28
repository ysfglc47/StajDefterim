import {
  test,
  expect,
  type APIRequestContext,
  type Page,
} from '@playwright/test';
import { randomUUID } from 'node:crypto';

const password = '  Test-password-2026  ';
const api = 'http://127.0.0.1:3100';

async function createAccount(request: APIRequestContext) {
  const email = `${randomUUID()}@example.com`;
  const result = await request.post(`${api}/auth/register`, {
    data: { name: 'Test Öğrenci', email, password },
  });
  expect(result.status()).toBe(201);
  return email;
}

async function fillLogin(page: Page, email: string, secret = password) {
  await page.getByLabel('E-posta adresi').fill(email);
  await page.getByLabel('Şifre', { exact: true }).fill(secret);
}

async function signIn(page: Page, email: string) {
  await page.goto('/giris');
  await fillLogin(page, email);
  await page.getByRole('button', { name: 'Giriş yap', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Merhaba, Test Öğrenci.' }),
  ).toBeVisible();
}

test('register, login, logout and refresh keep the session only in memory', async ({
  page,
}) => {
  const email = `${randomUUID()}@example.com`;
  await page.goto('/kayit');
  await page.getByLabel('Adın', { exact: true }).fill('  Test Öğrenci  ');
  await fillLogin(page, email);
  await page
    .getByRole('button', { name: 'Hesap oluştur', exact: true })
    .click();
  await expect(page).toHaveURL(/\/giris$/);
  await expect(page.getByRole('status')).toContainText('Hesabın oluşturuldu');
  await fillLogin(page, email);
  await page.getByRole('button', { name: 'Giriş yap', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Merhaba, Test Öğrenci.' }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => [
      localStorage.length,
      sessionStorage.length,
      document.cookie,
    ]),
  ).toEqual([0, 0, '']);
  await page.getByRole('button', { name: 'Çıkış yap' }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/giris$/);
  await expect(page.getByRole('status')).toContainText('Çıkış yaptın');
  await signIn(page, email);
  await page.reload();
  await expect(page).toHaveURL(/\/giris$/);
  await expect(page.getByLabel('Şifre', { exact: true })).toHaveValue('');
});

test('direct protected URLs redirect visitors to login', async ({ page }) => {
  for (const path of ['/gunler', '/gunler/yeni', '/gunler/example/duzenle']) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/giris$/);
    await expect(
      page.getByRole('heading', { name: 'Giriş yap', exact: true }),
    ).toBeVisible();
  }
});

test('client validation and duplicate email errors preserve form input', async ({
  page,
  request,
}) => {
  const email = await createAccount(request);
  await page.goto('/kayit');
  await page
    .getByRole('button', { name: 'Hesap oluştur', exact: true })
    .click();
  await expect(page.getByLabel('Adın', { exact: true })).toBeFocused();
  await expect(page.locator('#name-error')).toBeVisible();
  await page.getByLabel('Adın', { exact: true }).fill('Another Student');
  await fillLogin(page, email);
  await page
    .getByRole('button', { name: 'Hesap oluştur', exact: true })
    .click();
  await expect(page.getByRole('alert')).toContainText('zaten kayıtlı');
  await expect(page.getByLabel('E-posta adresi')).toHaveValue(email);
  await expect(page.getByLabel('Şifre', { exact: true })).toHaveValue(password);
});

test('wrong password and network errors allow retry without losing input', async ({
  page,
  request,
}) => {
  const email = await createAccount(request);
  await page.goto('/giris');
  await fillLogin(page, email, 'Wrong-password');
  await page.getByRole('button', { name: 'Giriş yap', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText(
    'E-posta veya şifre hatalı',
  );
  await expect(page.getByLabel('Şifre', { exact: true })).toHaveValue(
    'Wrong-password',
  );
  await fillLogin(page, email);
  await page.route('**/auth/login', (route) => route.abort());
  await page.getByRole('button', { name: 'Giriş yap', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Sunucuya ulaşılamadı');
  await expect(page.getByLabel('Şifre', { exact: true })).toHaveValue(password);
  await page.unroute('**/auth/login');
  await page.getByRole('button', { name: 'Giriş yap', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Merhaba, Test Öğrenci.' }),
  ).toBeVisible();
});

test('session expiry and a protected API 401 clear the session', async ({
  page,
  request,
}) => {
  const email = await createAccount(request);
  await page.clock.install();
  await signIn(page, email);
  await page.clock.fastForward(31 * 60 * 1000);
  await expect(page).toHaveURL(/\/giris$/);
  await expect(page.getByRole('status')).toContainText('süresi doldu');
  // Restore the browser clock before using a fresh server token.
  await page.clock.setSystemTime(new Date());
  await page.route('**/auth/me', (route) =>
    route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 'UNAUTHORIZED',
        message: 'Oturum geçersiz.',
      }),
    }),
  );
  await fillLogin(page, email);
  await page.getByRole('button', { name: 'Giriş yap', exact: true }).click();
  await expect(page).toHaveURL(/\/giris$/);
  await expect(page.getByRole('status')).toContainText('oturum geçersiz');
  await expect(page.getByRole('button', { name: 'Çıkış yap' })).toHaveCount(0);
});

test('an unavailable profile request offers retry instead of displaying protected content', async ({
  page,
  request,
}) => {
  const email = await createAccount(request);
  await page.route('**/auth/me', (route) => route.abort());
  await page.goto('/giris');
  await fillLogin(page, email);
  await page.getByRole('button', { name: 'Giriş yap', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Bağlantı kurulamadı' }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: /Merhaba/ })).toHaveCount(0);
  await page.unroute('**/auth/me');
  await page.getByRole('button', { name: 'Tekrar dene', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Merhaba, Test Öğrenci.' }),
  ).toBeVisible();
});

test('pending submissions disable the form and send only one request', async ({
  page,
  request,
}) => {
  const email = await createAccount(request);
  let calls = 0;
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/auth/login', async (route) => {
    calls++;
    await held;
    await route.continue();
  });
  await page.goto('/giris');
  await fillLogin(page, email);
  await page.getByRole('button', { name: 'Giriş yap', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Giriş yapılıyor…' }),
  ).toBeDisabled();
  await page.locator('form').evaluate((form) => {
    form.dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    );
  });
  expect(calls).toBe(1);
  release();
  await expect(
    page.getByRole('heading', { name: 'Merhaba, Test Öğrenci.' }),
  ).toBeVisible();
});

test('auth pages fit 375, 768 and 1440 pixels and support keyboard submission', async ({
  page,
  request,
}) => {
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ['/kayit', '/giris']) {
      await page.goto(path);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      await expect(page.getByLabel('E-posta adresi')).toBeVisible();
    }
  }
  const email = await createAccount(request);
  await page.getByLabel('E-posta adresi').focus();
  await page.keyboard.type(email);
  await page.keyboard.press('Tab');
  await page.keyboard.type(password);
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('heading', { name: 'Merhaba, Test Öğrenci.' }),
  ).toBeVisible();
});
