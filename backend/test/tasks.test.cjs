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

test('tasks API acceptance (FR-09–11, FR-13–14, BR-05–06)', async (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'stajdefterim-tasks-'));
  const previous = {
    url: process.env.DATABASE_URL,
    secret: process.env.JWT_SECRET,
  };
  process.env.DATABASE_URL = `file:${join(directory, 'tasks.db').replaceAll('\\', '/')}`;
  process.env.JWT_SECRET = randomBytes(48).toString('hex');
  let app;
  let prisma;
  let task;
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
      const input = { email, password: 'Test-password-2026' };
      assert.equal(
        (
          await call('POST', '/auth/register', null, {
            ...input,
            name: 'Test User',
          })
        ).status,
        201,
      );
      return (await call('POST', '/auth/login', null, input)).json();
    }
    const a = await account('owner@example.com');
    const b = await account('other@example.com');
    const createDay = async (token) =>
      (
        await call('POST', '/days', token, { date: '2026-09-25', title: 'Day' })
      ).json();
    const day = await createDay(a.accessToken);
    const otherDay = await createDay(a.accessToken);
    const foreignDay = await createDay(b.accessToken);

    await t.test('all task operations require authentication', async () => {
      for (const [method, path] of [
        ['POST', `/days/${day.id}/tasks`],
        ['PATCH', '/tasks/missing'],
        ['DELETE', '/tasks/missing'],
      ])
        assert.equal((await call(method, path)).status, 401);
    });
    await t.test(
      'creation normalizes title, defaults to TODO and appears only in its day',
      async () => {
        const response = await call(
          'POST',
          `/days/${day.id}/tasks`,
          a.accessToken,
          { title: '  İlk görev  ' },
        );
        assert.equal(response.status, 201);
        task = await response.json();
        assert.equal(task.title, 'İlk görev');
        assert.equal(task.description, null);
        assert.equal(task.status, 'TODO');
        assert.deepEqual(Object.keys(task).sort(), [
          'createdAt',
          'description',
          'id',
          'status',
          'title',
          'updatedAt',
        ]);
        assert.equal(
          (await prisma.task.findUniqueOrThrow({ where: { id: task.id } }))
            .dayId,
          day.id,
        );
        const detail = await (
          await call('GET', `/days/${day.id}`, a.accessToken)
        ).json();
        assert.deepEqual(
          detail.tasks.map((item) => item.id),
          [task.id],
        );
        assert.deepEqual(
          (
            await (
              await call('GET', `/days/${otherDay.id}`, a.accessToken)
            ).json()
          ).tasks,
          [],
        );
      },
    );
    await t.test(
      'a second account cannot add to the day, update/delete its task or read it via day detail',
      async () => {
        const rejected = await call(
          'POST',
          `/days/${day.id}/tasks`,
          b.accessToken,
          { title: 'Attack' },
        );
        const missing = await call(
          'POST',
          '/days/missing/tasks',
          b.accessToken,
          { title: 'Attack' },
        );
        assert.equal(rejected.status, 404);
        assert.equal(missing.status, 404);
        assert.deepEqual(await rejected.json(), await missing.json());
        for (const method of ['PATCH', 'DELETE']) {
          const body =
            method === 'PATCH'
              ? { title: 'Attack', status: 'DONE' }
              : undefined;
          const foreign = await call(
            method,
            `/tasks/${task.id}`,
            b.accessToken,
            body,
          );
          const absent = await call(
            method,
            '/tasks/missing',
            b.accessToken,
            body,
          );
          assert.equal(foreign.status, 404);
          assert.equal(absent.status, 404);
          assert.deepEqual(await foreign.json(), await absent.json());
        }
        assert.equal(
          (await call('GET', `/days/${day.id}`, b.accessToken)).status,
          404,
        );
        assert.equal(await prisma.task.count(), 1);
        assert.equal(
          (await prisma.task.findUniqueOrThrow({ where: { id: task.id } }))
            .title,
          task.title,
        );
      },
    );
    await t.test(
      'all status transitions work and partial updates preserve other fields',
      async () => {
        for (const from of ['TODO', 'IN_PROGRESS', 'DONE']) {
          for (const to of ['TODO', 'IN_PROGRESS', 'DONE']) {
            assert.equal(
              (
                await call('PATCH', `/tasks/${task.id}`, a.accessToken, {
                  status: from,
                })
              ).status,
              200,
            );
            const response = await call(
              'PATCH',
              `/tasks/${task.id}`,
              a.accessToken,
              { status: to },
            );
            assert.equal(response.status, 200);
            const saved = await response.json();
            assert.equal(saved.status, to);
            assert.equal(saved.title, task.title);
          }
        }
        await call('PATCH', `/tasks/${task.id}`, a.accessToken, {
          title: '  Düzenlendi  ',
          description: 'Notlar',
        });
        const saved = await prisma.task.findUniqueOrThrow({
          where: { id: task.id },
        });
        assert.equal(saved.title, 'Düzenlendi');
        assert.equal(saved.status, 'DONE');
        assert.equal(saved.dayId, day.id);
        await call('PATCH', `/tasks/${task.id}`, a.accessToken, {
          description: '',
        });
        await prisma.$disconnect();
        assert.equal(
          (await prisma.task.findUniqueOrThrow({ where: { id: task.id } }))
            .description,
          '',
        );
      },
    );
    await t.test(
      'invalid fields/status and reparenting are rejected without changing the task',
      async () => {
        const before = await prisma.task.findUniqueOrThrow({
          where: { id: task.id },
        });
        for (const invalid of [
          { title: '' },
          { title: '  ' },
          { title: 'x'.repeat(121) },
          { description: 'x'.repeat(2001) },
          { title: null },
          { description: null },
          { status: null },
          { status: 'done' },
          { status: 'INVALID' },
          { status: 1 },
          { dayId: otherDay.id },
          { dayId: foreignDay.id },
          { userId: b.user.id },
          { id: 'other' },
          {},
        ]) {
          assert.equal(
            (await call('PATCH', `/tasks/${task.id}`, a.accessToken, invalid))
              .status,
            400,
          );
        }
        for (const invalid of [
          {},
          { title: ' ' },
          { title: 12 },
          { title: 'Valid', description: null },
          { title: 'Valid', status: 'DONE' },
          { title: 'Valid', dayId: foreignDay.id },
        ])
          assert.equal(
            (
              await call(
                'POST',
                `/days/${day.id}/tasks`,
                a.accessToken,
                invalid,
              )
            ).status,
            400,
          );
        assert.deepEqual(
          await prisma.task.findUniqueOrThrow({ where: { id: task.id } }),
          before,
        );
        assert.equal(await prisma.task.count(), 1);
        const boundary = await call(
          'PATCH',
          `/tasks/${task.id}`,
          a.accessToken,
          { title: 'x'.repeat(120), description: 'x'.repeat(2000) },
        );
        assert.equal(boundary.status, 200);
      },
    );
    await t.test(
      'deleting a task returns empty 204 and preserves its parent and siblings',
      async () => {
        const sibling = await (
          await call('POST', `/days/${day.id}/tasks`, a.accessToken, {
            title: 'Sibling',
          })
        ).json();
        const response = await call(
          'DELETE',
          `/tasks/${task.id}`,
          a.accessToken,
        );
        assert.equal(response.status, 204);
        assert.equal(await response.text(), '');
        assert.equal(
          await prisma.internshipDay.count({ where: { id: day.id } }),
          1,
        );
        assert.equal(await prisma.task.count({ where: { id: sibling.id } }), 1);
        assert.equal(
          (await call('DELETE', `/tasks/${task.id}`, a.accessToken)).status,
          404,
        );
        assert.equal(
          (
            await call('PATCH', `/tasks/${task.id}`, a.accessToken, {
              status: 'DONE',
            })
          ).status,
          404,
        );
      },
    );
    await t.test(
      'day deletion cascades API-created tasks and failed deletion rolls everything back',
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
        assert.equal(
          (await call('DELETE', `/days/${day.id}`, a.accessToken)).status,
          204,
        );
        assert.equal(await prisma.task.count({ where: { dayId: day.id } }), 0);
        assert.equal(
          (
            await call('POST', `/days/${day.id}/tasks`, a.accessToken, {
              title: 'Too late',
            })
          ).status,
          404,
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
