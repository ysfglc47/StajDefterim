const assert = require('node:assert/strict');
const { test } = require('node:test');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const { randomBytes } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const { PrismaClient } = require('../dist/generated/prisma/client.js');
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('../dist/app.module.js');

test('days API acceptance (FR-04–08, FR-13–14)', async (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'stajdefterim-days-'));
  const previous = {
    url: process.env.DATABASE_URL,
    secret: process.env.JWT_SECRET,
  };
  process.env.DATABASE_URL = `file:${join(directory, 'days.db').replaceAll('\\', '/')}`;
  process.env.JWT_SECRET = randomBytes(48).toString('hex');
  let app;
  let prisma;
  let day;
  try {
    execFileSync(
      process.execPath,
      [resolve(__dirname, '../scripts/prisma-migrate.cjs'), 'deploy'],
      { cwd: resolve(__dirname, '..'), env: process.env, stdio: 'pipe' },
    );
    prisma = new PrismaClient({
      adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL }),
    });
    app = await NestFactory.create(AppModule, { logger: false });
    await app.listen(0, '127.0.0.1');
    const base = await app.getUrl();
    const call = (method, path, token, body) =>
      fetch(`${base}${path}`, {
        method,
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    async function account(email) {
      const credentials = { email, password: 'Test-password-2026' };
      assert.equal(
        (
          await call('POST', '/auth/register', null, {
            ...credentials,
            name: 'Test User',
          })
        ).status,
        201,
      );
      return (await call('POST', '/auth/login', null, credentials)).json();
    }
    const a = await account('owner@example.com');
    const b = await account('other@example.com');

    await t.test('every day endpoint requires authentication', async () => {
      for (const [method, path] of [
        ['GET', '/days'],
        ['POST', '/days'],
        ['GET', '/days/missing'],
        ['PATCH', '/days/missing'],
        ['DELETE', '/days/missing'],
      ])
        assert.equal((await call(method, path)).status, 401);
    });
    await t.test(
      'creation assigns owner server-side, preserves date and normalizes title',
      async () => {
        assert.deepEqual(
          await (await call('GET', '/days', a.accessToken)).json(),
          [],
        );
        const response = await call('POST', '/days', a.accessToken, {
          date: '2028-02-29',
          title: '  API çalışması  ',
        });
        assert.equal(response.status, 201);
        day = await response.json();
        assert.equal(day.title, 'API çalışması');
        assert.equal(day.date, '2028-02-29');
        assert.equal(day.description, null);
        assert.equal('userId' in day, false);
        assert.equal(
          (
            await prisma.internshipDay.findUniqueOrThrow({
              where: { id: day.id },
            })
          ).userId,
          a.user.id,
        );
        await prisma.$disconnect();
        assert.equal(
          (
            await prisma.internshipDay.findUniqueOrThrow({
              where: { id: day.id },
            })
          ).date,
          '2028-02-29',
        );
      },
    );
    await t.test(
      'list is newest first, permits duplicate/future dates and separates accounts',
      async () => {
        for (const date of ['2030-01-01', '2028-02-29', '2020-01-01'])
          assert.equal(
            (
              await call('POST', '/days', a.accessToken, {
                date,
                title: 'Another day',
              })
            ).status,
            201,
          );
        const listed = await (await call('GET', '/days', a.accessToken)).json();
        assert.deepEqual(
          listed.map((item) => item.date),
          ['2030-01-01', '2028-02-29', '2028-02-29', '2020-01-01'],
        );
        assert.deepEqual(
          await (await call('GET', '/days', b.accessToken)).json(),
          [],
        );
      },
    );
    await t.test(
      'another account cannot read, modify or delete a known day ID',
      async () => {
        for (const method of ['GET', 'PATCH', 'DELETE']) {
          const body = method === 'PATCH' ? { title: 'Attack' } : undefined;
          const foreign = await call(
            method,
            `/days/${day.id}`,
            b.accessToken,
            body,
          );
          const missing = await call(
            method,
            '/days/missing',
            b.accessToken,
            body,
          );
          assert.equal(foreign.status, 404);
          assert.equal(missing.status, 404);
          assert.deepEqual(await foreign.json(), await missing.json());
        }
        assert.equal(
          (
            await prisma.internshipDay.findUniqueOrThrow({
              where: { id: day.id },
            })
          ).title,
          day.title,
        );
      },
    );
    await t.test(
      'invalid calendar dates, nulls, lengths and extra fields never modify data',
      async () => {
        const invalidDates = [
          '2026-02-29',
          '1900-02-29',
          '2026-04-31',
          '2026-13-01',
          '0000-01-01',
          '2026-1-01',
          '2026-01-01T00:00:00Z',
          null,
          20260925,
        ];
        const count = await prisma.internshipDay.count();
        for (const invalid of [
          ...invalidDates.map((date) => ({ date })),
          { title: '  ' },
          { title: 'a'.repeat(121) },
          { description: 'a'.repeat(2001) },
          { title: null },
          { description: null },
          { userId: b.user.id },
          { id: 'other' },
          { tasks: [] },
        ]) {
          const create = await call('POST', '/days', a.accessToken, {
            date: '2026-09-25',
            title: 'Valid',
            ...invalid,
          });
          const update = await call(
            'PATCH',
            `/days/${day.id}`,
            a.accessToken,
            invalid,
          );
          assert.equal(create.status, 400);
          assert.equal(update.status, 400);
          assert.ok((await update.json()).fieldErrors);
        }
        assert.equal(
          (await call('PATCH', `/days/${day.id}`, a.accessToken, {})).status,
          400,
        );
        assert.equal(await prisma.internshipDay.count(), count);
        assert.equal(
          (
            await prisma.internshipDay.findUniqueOrThrow({
              where: { id: day.id },
            })
          ).title,
          day.title,
        );
      },
    );
    await t.test(
      'partial updates preserve omitted fields and detail includes only related tasks',
      async () => {
        const updated = await call('PATCH', `/days/${day.id}`, a.accessToken, {
          description: 'a'.repeat(2000),
          title: 'b'.repeat(120),
        });
        assert.equal(updated.status, 200);
        assert.equal((await updated.json()).date, day.date);
        const task = await prisma.task.create({
          data: { dayId: day.id, title: 'Related task' },
        });
        const detail = await (
          await call('GET', `/days/${day.id}`, a.accessToken)
        ).json();
        assert.deepEqual(
          detail.tasks.map((item) => item.id),
          [task.id],
        );
        assert.equal(detail.tasks[0].status, 'TODO');
        await call('PATCH', `/days/${day.id}`, a.accessToken, {
          description: '',
          date: '2000-02-29',
        });
        const saved = await prisma.internshipDay.findUniqueOrThrow({
          where: { id: day.id },
        });
        assert.equal(saved.description, '');
        assert.equal(saved.date, '2000-02-29');
        assert.equal(saved.title.length, 120);
      },
    );
    await t.test(
      'deletion cascades atomically and rollback leaves day and tasks intact',
      async () => {
        await prisma.$executeRawUnsafe(
          `CREATE TRIGGER prevent_task_delete BEFORE DELETE ON "Task" BEGIN SELECT RAISE(ABORT, 'test rollback'); END`,
        );
        assert.equal(
          (await call('DELETE', `/days/${day.id}`, a.accessToken)).status,
          500,
        );
        assert.equal(
          await prisma.internshipDay.count({ where: { id: day.id } }),
          1,
        );
        assert.equal(await prisma.task.count({ where: { dayId: day.id } }), 1);
        await prisma.$executeRawUnsafe('DROP TRIGGER prevent_task_delete');
        const response = await call('DELETE', `/days/${day.id}`, a.accessToken);
        assert.equal(response.status, 204);
        assert.equal(await response.text(), '');
        assert.equal(await prisma.task.count({ where: { dayId: day.id } }), 0);
        assert.equal(
          (await call('GET', `/days/${day.id}`, a.accessToken)).status,
          404,
        );
        assert.equal(
          await prisma.internshipDay.count({ where: { userId: a.user.id } }),
          3,
        );
      },
    );
  } finally {
    if (app) await app.close();
    if (prisma) await prisma.$disconnect();
    if (previous.url === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previous.url;
    if (previous.secret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previous.secret;
    rmSync(directory, { recursive: true, force: true });
  }
});
