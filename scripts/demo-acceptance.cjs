// Credentials arrive through stdin; they are never written to disk or reported.
const assert = require('node:assert/strict');
const { readFileSync, writeFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { randomUUID } = require('node:crypto');
const { chromium, expect } = require('@playwright/test');
const dataset = require('../docs/demo-data.json');
const API = 'http://localhost:3000';
const WEB = 'http://localhost:5173';
const labels = {
  TODO: 'Yapılacak',
  IN_PROGRESS: 'Devam Ediyor',
  DONE: 'Tamamlandı',
};
let phase = 'input';

async function api(path, token, method = 'GET', body) {
  return fetch(`${API}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
}
async function json(path, token, method = 'GET', body, status = 200) {
  const response = await api(path, token, method, body);
  assert.equal(
    response.status,
    status,
    `API status mismatch: ${method} ${path.split('/')[1]}`,
  );
  return status === 204 ? undefined : response.json();
}
function dayTitle(profile, index) {
  return `${profile.prefix} ${String(index + 1).padStart(2, '0')} — ${profile.days[index].title}`;
}
function taskStatus(day, index) {
  return day < 6
    ? 'DONE'
    : day < 9
      ? index < 4
        ? 'DONE'
        : index < 7
          ? 'IN_PROGRESS'
          : 'TODO'
      : 'TODO';
}

async function login(page, account, profile) {
  const probe = await api('/auth/login', null, 'POST', {
    email: account.email,
    password: account.password,
  });
  if (probe.status === 401) {
    phase = `${profile.key}:register`;
    await page.goto(`${WEB}/kayit`);
    await page.getByLabel('Adın', { exact: true }).fill(profile.name);
    await page.getByLabel('E-posta adresi').fill(account.email);
    await page.getByLabel('Şifre', { exact: true }).fill(account.password);
    const response = page.waitForResponse(
      (r) =>
        r.url() === `${API}/auth/register` && r.request().method() === 'POST',
    );
    await page
      .getByRole('button', { name: 'Hesap oluştur', exact: true })
      .click();
    assert.equal(
      (await response).status(),
      201,
      'Registration failed; existing account credentials were not changed.',
    );
    await expect(page.getByRole('status')).toContainText('Hesabın oluşturuldu');
  } else assert.equal(probe.status, 200);
  phase = `${profile.key}:login`;
  await page.goto(`${WEB}/giris`);
  await page.getByLabel('E-posta adresi').fill(account.email);
  await page.getByLabel('Şifre', { exact: true }).fill(account.password);
  const response = page.waitForResponse(
    (r) => r.url() === `${API}/auth/login` && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Giriş yap', exact: true }).click();
  const result = await response;
  assert.equal(result.status(), 200);
  const session = await result.json();
  await expect(page).toHaveURL(`${WEB}/gunler`);
  await expect(
    page.getByRole('heading', {
      name: `Merhaba, ${session.user.name}.`,
      exact: true,
    }),
  ).toBeVisible();
  return session.accessToken;
}
async function openDay(page, title) {
  await page.getByRole('link', { name: 'Staj günlerim', exact: true }).click();
  await page.getByRole('heading', { name: title, exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Görevler', exact: true }),
  ).toBeVisible();
}
async function createDay(page, date, title, description) {
  await page.getByRole('link', { name: 'Staj günlerim', exact: true }).click();
  await page
    .getByRole('link', { name: 'Yeni Gün Ekle', exact: true })
    .first()
    .click();
  await page.getByLabel('Tarih', { exact: true }).fill(date);
  await page.getByLabel('Başlık', { exact: true }).fill(title);
  await page.getByLabel('Açıklama (isteğe bağlı)').fill(description);
  const response = page.waitForResponse(
    (r) => r.url() === `${API}/days` && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Günü oluştur', exact: true }).click();
  const result = await response;
  assert.equal(result.status(), 201);
  const day = await result.json();
  await expect(
    page.getByRole('heading', { name: title, exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('status')).toContainText('oluşturuldu');
  return day;
}
async function createTask(page, title, description) {
  await page.getByRole('button', { name: 'Görev ekle', exact: true }).click();
  await page.getByLabel('Görev başlığı', { exact: true }).fill(title);
  await page.getByLabel('Görev açıklaması (isteğe bağlı)').fill(description);
  const response = page.waitForResponse(
    (r) =>
      /\/days\/[^/]+\/tasks$/.test(r.url()) && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: 'Görevi ekle', exact: true }).click();
  const result = await response;
  assert.equal(result.status(), 201);
  const task = await result.json();
  await expect(
    page.getByRole('listitem', { name: title, exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Görev eklendi.', { exact: true })).toBeVisible();
  return task;
}

async function seed(page, token, profile) {
  const existing = await json('/days', token);
  let createdDays = 0;
  let createdTasks = 0;
  const ids = [];
  for (let index = 0; index < 10; index++) {
    phase = `${profile.key}:day-${index + 1}`;
    const content = profile.days[index];
    const title = dayTitle(profile, index);
    const matches = existing.filter(
      (item) => item.title === title && item.date === dataset.dates[index],
    );
    assert.ok(
      matches.length <= 1,
      'Duplicate demo days require manual review.',
    );
    let day = matches[0];
    if (day) await openDay(page, title);
    else {
      day = await createDay(
        page,
        dataset.dates[index],
        title,
        content.description,
      );
      createdDays++;
    }
    const detail = await json(`/days/${day.id}`, token);
    ids.push(day.id);
    for (let taskIndex = 0; taskIndex < 10; taskIndex++) {
      const title = content.tasks[taskIndex];
      const matches = detail.tasks.filter((task) => task.title === title);
      assert.ok(matches.length <= 1);
      if (matches.length) continue;
      phase = `${profile.key}:day-${index + 1}:task-${taskIndex + 1}`;
      await createTask(
        page,
        title,
        `${content.title} kapsamında örnek staj görevi: ${title.toLocaleLowerCase('tr-TR')}. ${profile.key === 'dentistry' ? 'Gözetmen eşliğinde eğitim/gözlem notu; gerçek hasta verisi içermez.' : 'Çalışma sonunda bulguları, kullanılan araçları ve öğrenilen noktaları staj günlüğüne ekle.'}`,
      );
      createdTasks++;
      const status = taskStatus(index, taskIndex);
      if (status !== 'TODO') {
        const row = page.getByRole('listitem', { name: title, exact: true });
        await row
          .getByLabel('Görev durumu', { exact: true })
          .selectOption(status);
        await expect(row.locator('.task-status')).toHaveText(labels[status]);
      }
    }
    const saved = await json(`/days/${day.id}`, token);
    assert.equal(saved.tasks.length, 10);
    assert.deepEqual(
      saved.tasks.map((task) => task.title).sort(),
      [...content.tasks].sort(),
    );
    console.log(
      JSON.stringify({
        account: profile.key,
        day: index + 1,
        tasks: saved.tasks.length,
      }),
    );
  }
  const all = await json('/days', token);
  return {
    ids,
    createdDays,
    createdTasks,
    totalDays: all.length,
    preservedOtherDays: all.filter((day) => !ids.includes(day.id)).length,
  };
}

async function uiAudit(page, token, profile) {
  phase = `${profile.key}:ui-audit`;
  let temporaryDay;
  try {
    const title = `İster kontrolü ${randomUUID()}`;
    temporaryDay = await createDay(
      page,
      '2026-09-25',
      title,
      'Geçici kabul testi; kontrol sonunda kaldırılır.',
    );
    await page.getByRole('button', { name: 'Görev ekle', exact: true }).click();
    await page
      .getByRole('button', { name: 'Görevi ekle', exact: true })
      .click();
    await expect(
      page.getByText('Başlık 1–120 karakter arasında olmalıdır.', {
        exact: true,
      }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Vazgeç', exact: true }).click();
    await createTask(page, 'Geçici test görevi', 'İşlem ve bildirim kontrolü.');
    const sibling = await createTask(
      page,
      'Bağlı silme kontrolü',
      'Gün silindiğinde birlikte kaldırılır.',
    );
    let row = page.getByRole('listitem', {
      name: 'Geçici test görevi',
      exact: true,
    });
    await row.getByLabel('Görev durumu').selectOption('DONE');
    await expect(row.locator('.task-status')).toHaveText('Tamamlandı');
    await row.getByRole('button', { name: 'Görevi düzenle' }).click();
    await row.getByLabel('Görev başlığı').fill('Düzenlenen test görevi');
    await row.getByRole('button', { name: 'Görevi kaydet' }).click();
    row = page.getByRole('listitem', {
      name: 'Düzenlenen test görevi',
      exact: true,
    });
    await expect(
      page.getByText('Görev güncellendi.', { exact: true }),
    ).toBeVisible();
    await page.route('**/tasks/*', (route) => route.abort());
    await row.getByLabel('Görev durumu').selectOption('TODO');
    await expect(row.getByRole('alert')).toContainText('Sunucuya ulaşılamadı');
    await expect(row.locator('.task-status')).toHaveText('Tamamlandı');
    await page.unroute('**/tasks/*');
    await row.getByLabel('Görev durumu').selectOption('TODO');
    await expect(row.locator('.task-status')).toHaveText('Yapılacak');
    await row.getByRole('button', { name: 'Görevi sil', exact: true }).click();
    await page.getByRole('button', { name: 'Vazgeç', exact: true }).click();
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: 'Görevi sil', exact: true }).click();
    await page.getByRole('button', { name: 'Evet, görevi sil' }).click();
    await expect(row).toHaveCount(0);
    await expect(
      page.getByText('Görev silindi.', { exact: true }),
    ).toBeVisible();
    await page.getByRole('link', { name: 'Düzenle', exact: true }).click();
    await page
      .getByLabel('Açıklama (isteğe bağlı)')
      .fill('Arayüzden güncelleme doğrulandı.');
    await page.getByRole('button', { name: 'Değişiklikleri kaydet' }).click();
    await expect(
      page.getByText('Değişikliklerin kaydedildi.', { exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Günü sil', exact: true }).click();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.getByRole('button', { name: 'Günü sil', exact: true }).click();
    await page.getByRole('button', { name: 'Evet, günü sil' }).click();
    await expect(
      page.getByText('Staj günü ve bağlı görevleri silindi.', { exact: true }),
    ).toBeVisible();
    assert.equal(
      (await api(`/tasks/${sibling.id}`, token, 'PATCH', { status: 'DONE' }))
        .status,
      404,
    );
    temporaryDay = null;
    await page.getByRole('button', { name: 'Çıkış yap', exact: true }).click();
    await expect(page).toHaveURL(`${WEB}/giris`);
    await expect(page.getByRole('status')).toContainText('Çıkış yaptın');
    return {
      crud: 'passed',
      validationMessage: 'passed',
      successMessages: 'passed',
      networkErrorAndRetry: 'passed',
      cancelDelete: 'passed',
      cascade: 'passed',
      logout: 'passed',
    };
  } finally {
    await page.unroute('**/tasks/*');
    if (temporaryDay) await api(`/days/${temporaryDay.id}`, token, 'DELETE');
  }
}

async function accessAudit(sessions) {
  phase = 'two-account-api-audit';
  const fixtures = [];
  let rejected = 0;
  try {
    for (const session of sessions) {
      const day = await json(
        '/days',
        session.token,
        'POST',
        {
          date: '2026-09-25',
          title: `Geçici sahiplik kontrolü ${randomUUID()}`,
        },
        201,
      );
      fixtures.push({ ...session, day });
      fixtures.at(-1).task = await json(
        `/days/${day.id}/tasks`,
        session.token,
        'POST',
        { title: 'Geçici kontrol görevi' },
        201,
      );
    }
    for (let index = 0; index < 2; index++) {
      const own = fixtures[index];
      const foreign = fixtures[1 - index];
      const before = await json(`/days/${foreign.day.id}`, foreign.token);
      for (const [method, path, body] of [
        ['GET', `/days/${foreign.day.id}`],
        ['PATCH', `/days/${foreign.day.id}`, { title: 'Forbidden' }],
        ['DELETE', `/days/${foreign.day.id}`],
        ['POST', `/days/${foreign.day.id}/tasks`, { title: 'Forbidden' }],
        ['PATCH', `/tasks/${foreign.task.id}`, { status: 'DONE' }],
        ['DELETE', `/tasks/${foreign.task.id}`],
      ]) {
        assert.equal((await api(path, own.token, method, body)).status, 404);
        rejected++;
      }
      assert.deepEqual(
        await json(`/days/${foreign.day.id}`, foreign.token),
        before,
      );
      const ownBefore = await json(`/days/${own.day.id}`, own.token);
      const countBefore = (await json('/days', own.token)).length;
      for (const [method, path, body] of [
        ['POST', '/days', { date: '2026-02-29', title: 'Invalid date' }],
        ['POST', '/days', { date: '2026-09-25', title: ' ' }],
        ['PATCH', `/days/${own.day.id}`, {}],
        ['PATCH', `/days/${own.day.id}`, { userId: 'forged' }],
        ['POST', `/days/${own.day.id}/tasks`, { title: ' ' }],
        [
          'POST',
          `/days/${own.day.id}/tasks`,
          { title: 'Valid', status: 'DONE' },
        ],
        ['PATCH', `/tasks/${own.task.id}`, { status: 'INVALID' }],
        ['PATCH', `/tasks/${own.task.id}`, { dayId: foreign.day.id }],
        ['PATCH', `/tasks/${own.task.id}`, { description: 'x'.repeat(2001) }],
        ['PATCH', `/tasks/${own.task.id}`, { title: 'x'.repeat(121) }],
      ]) {
        const result = await api(path, own.token, method, body);
        assert.equal(result.status, 400);
        const error = await result.json();
        assert.ok(error.code && error.message);
        rejected++;
      }
      assert.deepEqual(await json(`/days/${own.day.id}`, own.token), ownBefore);
      assert.equal((await json('/days', own.token)).length, countBefore);
      const list = await json('/days', own.token);
      assert.ok(!list.some((day) => day.id === foreign.day.id));
    }
    return {
      rejectedRequests: rejected,
      ownershipBothDirections: 'passed',
      invalidDataBothAccounts: 'passed',
      recordsUnchanged: 'passed',
    };
  } finally {
    for (const fixture of fixtures)
      assert.equal(
        (await api(`/days/${fixture.day.id}`, fixture.token, 'DELETE')).status,
        204,
      );
  }
}

async function main() {
  const credentials = JSON.parse(readFileSync(0, 'utf8'));
  assert.equal(credentials.length, 2);
  assert.equal(dataset.dates.length, 10);
  for (const profile of dataset.profiles) {
    assert.equal(profile.days.length, 10);
    for (const day of profile.days) {
      assert.equal(day.tasks.length, 10);
      assert.equal(new Set(day.tasks).size, 10);
    }
  }
  const browser = await chromium.launch({ channel: 'msedge' });
  const sessions = [];
  const accounts = [];
  try {
    for (const profile of dataset.profiles) {
      const account = credentials.find((item) => item.key === profile.key);
      assert.ok(account?.email && account?.password);
      const context = await browser.newContext({
        viewport: { width: 1440, height: 1000 },
      });
      const page = await context.newPage();
      const token = await login(page, account, profile);
      sessions.push({ key: profile.key, token });
      const seeded = await seed(page, token, profile);
      const audit = await uiAudit(page, token, profile);
      accounts.push({
        profile: profile.key,
        sampleDayIds: seeded.ids,
        ...seeded,
        ui: audit,
      });
      await context.close();
    }
    const access = await accessAudit(sessions);
    for (let index = 0; index < sessions.length; index++) {
      phase = `${sessions[index].key}:final-count`;
      const list = await json('/days', sessions[index].token);
      const ids = new Set(accounts[index].sampleDayIds);
      const details = await Promise.all(
        list
          .filter((day) => ids.has(day.id))
          .map((day) => json(`/days/${day.id}`, sessions[index].token)),
      );
      assert.equal(details.length, 10);
      assert.ok(details.every((day) => day.tasks.length === 10));
      accounts[index].totalDays = list.length;
      accounts[index].sampleDays = details.length;
      accounts[index].sampleTasks = details.reduce(
        (total, day) => total + day.tasks.length,
        0,
      );
      delete accounts[index].ids;
      delete accounts[index].sampleDayIds;
    }
    const report = {
      checkedAt: new Date().toISOString(),
      accounts,
      access,
      sampleDateRange: [dataset.dates[0], dataset.dates.at(-1)],
      credentialsStored: false,
    };
    writeFileSync(
      resolve(__dirname, '../docs/demo-verification.json'),
      `${JSON.stringify(report, null, 2)}\n`,
    );
    console.log(JSON.stringify(report));
  } finally {
    await browser.close();
  }
}
void main().catch(() => {
  console.error(
    JSON.stringify({
      phase,
      status: 'failed',
      message:
        'Check stopped. Existing user records were not reset; demo preparation can be retried.',
    }),
  );
  process.exitCode = 1;
});
