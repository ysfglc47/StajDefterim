import {
  test,
  expect,
  type APIRequestContext,
  type Page,
} from '@playwright/test';
import { randomUUID } from 'node:crypto';

const api = 'http://127.0.0.1:3100';
const password = 'Test-password-2026';
async function account(request: APIRequestContext) {
  const email = `${randomUUID()}@example.com`;
  expect(
    (
      await request.post(`${api}/auth/register`, {
        data: { name: 'Day Student', email, password },
      })
    ).status(),
  ).toBe(201);
  const session = (await (
    await request.post(`${api}/auth/login`, { data: { email, password } })
  ).json()) as { accessToken: string };
  return { email, token: session.accessToken };
}
async function login(page: Page, email: string) {
  await page.goto('/giris');
  await page.getByLabel('E-posta adresi').fill(email);
  await page.getByLabel('Şifre', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Giriş yap', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Merhaba, Day Student.' }),
  ).toBeVisible();
}
async function navigateInSession(page: Page, path: string) {
  await page.evaluate((url) => {
    window.history.pushState(null, '', url);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, path);
}

test('create, detail, partial edit, persistence, cancel and confirmed deletion', async ({
  page,
  request,
}) => {
  const owner = await account(request);
  await login(page, owner.email);
  await expect(
    page.getByText('Henüz staj günü eklemedin.', { exact: false }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Yeni Gün Ekle' }).first().click();
  await page.getByLabel('Tarih', { exact: true }).fill('2028-02-29');
  await page.getByLabel('Başlık', { exact: true }).fill('  İlk API çalışmam  ');
  await page
    .getByLabel('Açıklama (isteğe bağlı)')
    .fill('İlk satır\nİkinci satır');
  await page.getByRole('button', { name: 'Günü oluştur' }).click();
  await expect(
    page.getByRole('heading', { name: 'İlk API çalışmam' }),
  ).toBeVisible();
  await expect(page.locator('time')).toHaveText('29.02.2028');
  const detailUrl = page.url();
  await page.getByRole('link', { name: 'Düzenle', exact: true }).click();
  await expect(page.getByLabel('Başlık', { exact: true })).toHaveValue(
    'İlk API çalışmam',
  );
  await page.getByLabel('Başlık', { exact: true }).fill('Düzenlenmiş gün');
  await page.getByRole('button', { name: 'Değişiklikleri kaydet' }).click();
  await expect(page.getByRole('status')).toContainText('kaydedildi');
  await expect(
    page.getByText('İlk satır\nİkinci satır', { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page).toHaveURL(/\/giris$/);
  await login(page, owner.email);
  await page.getByRole('heading', { name: 'Düzenlenmiş gün' }).click();
  await expect(page).toHaveURL(detailUrl);
  const remove = page.getByRole('button', { name: 'Günü sil', exact: true });
  await remove.click();
  await expect(page.getByRole('dialog')).toContainText('bağlı tüm görevler');
  await expect(
    page.getByRole('button', { name: 'Vazgeç', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(remove).toBeFocused();
  await remove.click();
  await page.route('**/days/*', (route) =>
    route.request().method() === 'DELETE' ? route.abort() : route.continue(),
  );
  await page.getByRole('button', { name: 'Evet, günü sil' }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText(
    'Sunucuya ulaşılamadı',
  );
  await expect(
    page.getByRole('heading', { name: 'Düzenlenmiş gün' }),
  ).toBeVisible();
  await page.unroute('**/days/*');
  await page.getByRole('button', { name: 'Evet, günü sil' }).click();
  await expect(page).toHaveURL(/\/gunler$/);
  await expect(
    page
      .getByRole('status')
      .filter({ hasText: 'Staj günü ve bağlı görevleri silindi.' }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Düzenlenmiş gün' }),
  ).toHaveCount(0);
});

test('field and network errors preserve values, loading blocks duplicate submission', async ({
  page,
  request,
}) => {
  const owner = await account(request);
  await login(page, owner.email);
  await page.getByRole('link', { name: 'Yeni Gün Ekle' }).first().click();
  await page.getByRole('button', { name: 'Günü oluştur' }).click();
  await expect(page.locator('#title-error')).toBeVisible();
  await expect(page.getByLabel('Başlık', { exact: true })).toBeFocused();
  await page.getByLabel('Başlık', { exact: true }).fill('Ağ testi');
  await page.getByLabel('Açıklama (isteğe bağlı)').fill('Kaybolmayan not');
  await page.route('**/days', (route) => route.abort());
  await page.getByRole('button', { name: 'Günü oluştur' }).click();
  await expect(page.getByRole('alert')).toContainText('Sunucuya ulaşılamadı');
  await expect(page.getByLabel('Başlık', { exact: true })).toHaveValue(
    'Ağ testi',
  );
  await expect(page.getByLabel('Açıklama (isteğe bağlı)')).toHaveValue(
    'Kaybolmayan not',
  );
  await page.unroute('**/days');
  let calls = 0;
  let release!: () => void;
  const waiting = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/days', async (route) => {
    calls++;
    await waiting;
    await route.continue();
  });
  await page.getByRole('button', { name: 'Günü oluştur' }).click();
  await expect(
    page.getByRole('button', { name: 'Kaydediliyor…' }),
  ).toBeDisabled();
  await page
    .locator('form')
    .evaluate((form) =>
      form.dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true }),
      ),
    );
  expect(calls).toBe(1);
  release();
  await expect(page.getByRole('heading', { name: 'Ağ testi' })).toBeVisible();
});

test('two accounts see separate lists and foreign/missing detail and edit routes show 404', async ({
  page,
  request,
}) => {
  const owner = await account(request);
  const visitor = await account(request);
  const created = await request.post(`${api}/days`, {
    headers: { Authorization: `Bearer ${owner.token}` },
    data: { date: '2026-09-25', title: 'Private record' },
  });
  const day = (await created.json()) as { id: string };
  await login(page, visitor.email);
  await expect(
    page.getByRole('heading', { name: 'Private record' }),
  ).toHaveCount(0);
  for (const path of [
    `/gunler/${day.id}`,
    `/gunler/${day.id}/duzenle`,
    '/gunler/missing',
  ]) {
    await navigateInSession(page, path);
    await expect(
      page.getByRole('heading', { name: 'Staj günü bulunamadı.' }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Private record' }),
    ).toHaveCount(0);
  }
});

test('list retries after failure and long content fits mobile, tablet and desktop', async ({
  page,
  request,
}) => {
  const owner = await account(request);
  for (const date of ['2025-01-01', '2030-01-01']) {
    await request.post(`${api}/days`, {
      headers: { Authorization: `Bearer ${owner.token}` },
      data: {
        date,
        title: 'UzunBaşlık'.repeat(12),
        description: 'A'.repeat(2000),
      },
    });
  }
  await page.route('**/days', (route) => route.abort());
  await login(page, owner.email);
  await expect(
    page.getByRole('heading', { name: 'Kayıtlar yüklenemedi.' }),
  ).toBeVisible();
  await page.unroute('**/days');
  await page.getByRole('button', { name: 'Tekrar dene', exact: true }).click();
  await expect(page.locator('.day-card time')).toHaveText([
    '01.01.2030',
    '01.01.2025',
  ]);
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.locator('.day-card').first().click();
    await expect(
      page.getByRole('heading', { name: 'Günün notları' }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.getByRole('button', { name: 'Günü sil', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.getByRole('button', { name: 'Vazgeç', exact: true }).click();
    await page.getByRole('link', { name: 'Düzenle', exact: true }).click();
    await expect(page.getByLabel('Başlık', { exact: true })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page
      .getByRole('link', { name: 'Staj günlerim', exact: true })
      .click();
    await expect(page.locator('.day-card')).toHaveCount(2);
  }
});
