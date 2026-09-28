import {
  test,
  expect,
  type APIRequestContext,
  type Page,
} from '@playwright/test';
import { randomUUID } from 'node:crypto';

const api = 'http://127.0.0.1:3100';
const password = 'Test-password-2026';
async function setup(request: APIRequestContext) {
  const email = `${randomUUID()}@example.com`;
  expect(
    (
      await request.post(`${api}/auth/register`, {
        data: { name: 'Task Student', email, password },
      })
    ).status(),
  ).toBe(201);
  const session = (await (
    await request.post(`${api}/auth/login`, { data: { email, password } })
  ).json()) as { accessToken: string };
  const day = (await (
    await request.post(`${api}/days`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
      data: { date: '2026-09-25', title: 'Görev günü' },
    })
  ).json()) as { id: string };
  return { email, token: session.accessToken, dayId: day.id };
}
async function openDay(page: Page, email: string) {
  await page.goto('/giris');
  await page.getByLabel('E-posta adresi').fill(email);
  await page.getByLabel('Şifre', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Giriş yap', exact: true }).click();
  await page.getByRole('heading', { name: 'Görev günü', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Görevler', exact: true }),
  ).toBeVisible();
}
async function addTask(page: Page, title: string) {
  await page.getByRole('button', { name: 'Görev ekle', exact: true }).click();
  await expect(page.getByLabel('Görev başlığı', { exact: true })).toBeFocused();
  await page.getByLabel('Görev başlığı', { exact: true }).fill(title);
  await page.getByRole('button', { name: 'Görevi ekle', exact: true }).click();
  await expect(
    page.getByRole('listitem', { name: title, exact: true }),
  ).toBeVisible();
}

test('task create, status, edit, persistence, cancel, single delete and day cascade', async ({
  page,
  request,
}) => {
  const owner = await setup(request);
  await openDay(page, owner.email);
  await addTask(page, 'İlk görev');
  await addTask(page, 'Korunacak görev');
  let row = page.getByRole('listitem', { name: 'İlk görev', exact: true });
  await expect(row.locator('.task-status')).toHaveText('Yapılacak');
  await row
    .getByLabel('Görev durumu', { exact: true })
    .selectOption('IN_PROGRESS');
  await expect(row.locator('.task-status')).toHaveText('Devam Ediyor');
  await row.getByRole('button', { name: 'Görevi düzenle' }).click();
  await row.getByLabel('Görev başlığı').fill('Düzenlenmiş görev');
  await row
    .getByLabel('Görev açıklaması (isteğe bağlı)')
    .fill('Birinci satır\nİkinci satır');
  await row.getByLabel('Görev durumu').selectOption('DONE');
  await row.getByRole('button', { name: 'Görevi kaydet' }).click();
  row = page.getByRole('listitem', { name: 'Düzenlenmiş görev', exact: true });
  await expect(row.locator('.task-status')).toHaveText('Tamamlandı');
  await page.reload();
  await expect(page).toHaveURL(/\/giris$/);
  await openDay(page, owner.email);
  await expect(row.locator('.task-status')).toHaveText('Tamamlandı');
  await expect(
    row.getByText('Birinci satır\nİkinci satır', { exact: true }),
  ).toBeVisible();
  await row.getByLabel('Görev durumu').selectOption('TODO');
  await expect(row.locator('.task-status')).toHaveText('Yapılacak');
  await row.getByRole('button', { name: 'Görevi sil', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText(
    'Staj günü ve diğer görevler korunacak',
  );
  await expect(
    page.getByRole('button', { name: 'Vazgeç', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(row).toBeVisible();
  await expect(
    row.getByRole('button', { name: 'Görevi sil', exact: true }),
  ).toBeFocused();
  await row.getByRole('button', { name: 'Görevi sil', exact: true }).click();
  await page.getByRole('button', { name: 'Evet, görevi sil' }).click();
  await expect(row).toHaveCount(0);
  const sibling = page.getByRole('listitem', {
    name: 'Korunacak görev',
    exact: true,
  });
  await expect(sibling).toBeVisible();
  const detail = (await (
    await request.get(`${api}/days/${owner.dayId}`, {
      headers: { Authorization: `Bearer ${owner.token}` },
    })
  ).json()) as { tasks: { id: string }[] };
  expect(detail.tasks).toHaveLength(1);
  await page.getByRole('button', { name: 'Günü sil', exact: true }).click();
  await page.getByRole('button', { name: 'Evet, günü sil' }).click();
  await expect(page).toHaveURL(/\/gunler$/);
  expect(
    (
      await request.patch(`${api}/tasks/${detail.tasks[0].id}`, {
        headers: { Authorization: `Bearer ${owner.token}` },
        data: { status: 'DONE' },
      })
    ).status(),
  ).toBe(404);
});

test('create validation, network retry and duplicate-submit prevention', async ({
  page,
  request,
}) => {
  const owner = await setup(request);
  await openDay(page, owner.email);
  await page.getByRole('button', { name: 'Görev ekle', exact: true }).click();
  await page.getByRole('button', { name: 'Görevi ekle', exact: true }).click();
  await expect(
    page.getByText('Başlık 1–120 karakter arasında olmalıdır.', {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByLabel('Görev başlığı').fill('Ağ testi');
  await page.getByLabel('Görev açıklaması (isteğe bağlı)').fill('Korunan not');
  await page.route('**/days/*/tasks', (route) => route.abort());
  await page.getByRole('button', { name: 'Görevi ekle', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Sunucuya ulaşılamadı');
  await expect(page.getByLabel('Görev başlığı')).toHaveValue('Ağ testi');
  await expect(page.getByLabel('Görev açıklaması (isteğe bağlı)')).toHaveValue(
    'Korunan not',
  );
  await page.unroute('**/days/*/tasks');
  let count = 0;
  let release!: () => void;
  const wait = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/days/*/tasks', async (route) => {
    count++;
    await wait;
    await route.continue();
  });
  await page.getByRole('button', { name: 'Görevi ekle', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Kaydediliyor…' }),
  ).toBeDisabled();
  await page
    .getByRole('form', { name: 'Yeni görev' })
    .evaluate((form) =>
      form.dispatchEvent(
        new Event('submit', { bubbles: true, cancelable: true }),
      ),
    );
  expect(count).toBe(1);
  release();
  await expect(
    page.getByRole('listitem', { name: 'Ağ testi', exact: true }),
  ).toBeVisible();
});

test('failed status, edit and delete keep the current task and allow retry', async ({
  page,
  request,
}) => {
  const owner = await setup(request);
  await openDay(page, owner.email);
  await addTask(page, 'Mevcut görev');
  let row = page.getByRole('listitem', { name: 'Mevcut görev', exact: true });
  await page.route('**/tasks/*', (route) => route.abort());
  await row.getByLabel('Görev durumu').selectOption('DONE');
  await expect(row.getByRole('alert')).toContainText('Sunucuya ulaşılamadı');
  await expect(row.getByLabel('Görev durumu')).toHaveValue('TODO');
  await expect(row.locator('.task-status')).toHaveText('Yapılacak');
  await row.getByRole('button', { name: 'Görevi düzenle' }).click();
  await row.getByLabel('Görev başlığı').fill('Yeni görev adı');
  await row.getByRole('button', { name: 'Görevi kaydet' }).click();
  await expect(row.getByRole('alert')).toContainText('Sunucuya ulaşılamadı');
  await expect(row.getByLabel('Görev başlığı')).toHaveValue('Yeni görev adı');
  await page.unroute('**/tasks/*');
  await row.getByRole('button', { name: 'Görevi kaydet' }).click();
  row = page.getByRole('listitem', { name: 'Yeni görev adı', exact: true });
  await expect(row).toBeVisible();
  await page.route('**/tasks/*', (route) => route.abort());
  await row.getByRole('button', { name: 'Görevi sil', exact: true }).click();
  await page.getByRole('button', { name: 'Evet, görevi sil' }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText(
    'Sunucuya ulaşılamadı',
  );
  await expect(row).toBeVisible();
  await page.unroute('**/tasks/*');
  await page.getByRole('button', { name: 'Evet, görevi sil' }).click();
  await expect(row).toHaveCount(0);
  await expect(
    page.getByRole('heading', { name: 'Görev günü', exact: true }),
  ).toBeVisible();
});

test('long tasks fit all target widths and task form supports keyboard use', async ({
  page,
  request,
}) => {
  const owner = await setup(request);
  const title = 'UzunGörev'.repeat(13);
  await request.post(`${api}/days/${owner.dayId}/tasks`, {
    headers: { Authorization: `Bearer ${owner.token}` },
    data: { title, description: 'A'.repeat(2000) },
  });
  await openDay(page, owner.email);
  const row = page.getByRole('listitem', { name: title, exact: true });
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(row).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await row.getByRole('button', { name: 'Görevi düzenle' }).click();
    await expect(row.getByLabel('Görev başlığı')).toBeFocused();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await row.getByRole('button', { name: 'Vazgeç', exact: true }).click();
    await row.getByRole('button', { name: 'Görevi sil', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.keyboard.press('Escape');
  }
  await page.getByRole('button', { name: 'Görev ekle', exact: true }).click();
  await page.keyboard.type('Keyboard task');
  await page.keyboard.press('Tab');
  await page.keyboard.type('Keyboard note');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('listitem', { name: 'Keyboard task', exact: true }),
  ).toBeVisible();
});
