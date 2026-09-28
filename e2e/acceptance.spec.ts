import {
  test,
  expect,
  type APIRequestContext,
  type Page,
} from '@playwright/test';
import { randomUUID } from 'node:crypto';

const api = 'http://127.0.0.1:3100';
async function signedIn(page: Page, request: APIRequestContext) {
  const email = `${randomUUID()}@example.com`;
  const password = 'Acceptance-2026';
  expect(
    (
      await request.post(`${api}/auth/register`, {
        data: { name: 'Acceptance Student', email, password },
      })
    ).status(),
  ).toBe(201);
  await page.goto('/giris');
  await page.getByLabel('E-posta adresi').fill(email);
  await page.getByLabel('Şifre', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Giriş yap', exact: true }).click();
  await expect(page).toHaveURL(/\/gunler$/);
}

test('real server 400 and simulated 500 display errors, preserve fields and allow retry', async ({
  page,
  request,
}) => {
  await signedIn(page, request);
  await page
    .getByRole('link', { name: 'Yeni Gün Ekle', exact: true })
    .first()
    .click();
  await page.getByLabel('Başlık', { exact: true }).fill('Korunacak başlık');
  await page.getByLabel('Açıklama (isteğe bağlı)').fill('Korunacak açıklama');
  await page.route('**/days', async (route) => {
    const original = route.request().postDataJSON() as Record<string, unknown>;
    await route.continue({
      postData: JSON.stringify({ ...original, title: 'x'.repeat(121) }),
    });
  });
  const invalid = page.waitForResponse(
    (response) => response.url().endsWith('/days') && response.status() === 400,
  );
  await page.getByRole('button', { name: 'Günü oluştur' }).click();
  await invalid;
  await expect(page.locator('#title-error')).toContainText('1–120');
  await expect(page.getByRole('alert')).toContainText('işaretli alanları');
  await expect(page.getByLabel('Başlık', { exact: true })).toHaveValue(
    'Korunacak başlık',
  );
  await expect(page.getByLabel('Açıklama (isteğe bağlı)')).toHaveValue(
    'Korunacak açıklama',
  );
  await page.unroute('**/days');
  await page.route('**/days', (route) =>
    route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({
        code: 'INTERNAL_ERROR',
        message: 'İşlem tamamlanamadı. Lütfen tekrar deneyin.',
      }),
    }),
  );
  await page.getByRole('button', { name: 'Günü oluştur' }).click();
  await expect(page.getByRole('alert')).toContainText('İşlem tamamlanamadı');
  await expect(page.getByLabel('Başlık', { exact: true })).toHaveValue(
    'Korunacak başlık',
  );
  await expect(page).toHaveURL(/\/gunler\/yeni$/);
  await page.unroute('**/days');
  await page.getByRole('button', { name: 'Günü oluştur' }).click();
  await expect(page.getByRole('status')).toContainText('oluşturuldu');
  await page.getByRole('link', { name: 'Staj günlerim', exact: true }).click();
  await expect(page.locator('.day-card')).toHaveCount(1);
});

test('mutation 401 clears session and cannot display a false success', async ({
  page,
  request,
}) => {
  await signedIn(page, request);
  await page
    .getByRole('link', { name: 'Yeni Gün Ekle', exact: true })
    .first()
    .click();
  await page.getByLabel('Başlık', { exact: true }).fill('Oturum kontrolü');
  await page.getByRole('button', { name: 'Günü oluştur' }).click();
  await page.getByRole('button', { name: 'Görev ekle', exact: true }).click();
  await page.getByLabel('Görev başlığı').fill('Oturumu kontrol et');
  await page.getByRole('button', { name: 'Görevi ekle', exact: true }).click();
  const row = page.getByRole('listitem', {
    name: 'Oturumu kontrol et',
    exact: true,
  });
  // Remove the bearer header so the real backend rejects this mutation.
  await page.route('**/tasks/*', (route) => {
    const headers = { ...route.request().headers() };
    delete headers.authorization;
    return route.continue({ headers });
  });
  const unauthorized = page.waitForResponse(
    (response) =>
      response.url().includes('/tasks/') && response.status() === 401,
  );
  await row.getByLabel('Görev durumu').selectOption('DONE');
  await unauthorized;
  await expect(page).toHaveURL(/\/giris$/);
  await expect(page.getByRole('status')).toContainText('oturum geçersiz');
  await expect(
    page.getByRole('button', { name: 'Çıkış yap', exact: true }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(() => [localStorage.length, sessionStorage.length]),
  ).toEqual([0, 0]);
});
