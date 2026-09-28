const assert = require('node:assert/strict');
const { test } = require('node:test');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const { execFileSync } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const { PrismaClient } = require('../dist/generated/prisma/client.js');
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('../dist/app.module.js');

test('clean migration, persistence, constraints, cascade and HTTP health', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'stajdefterim-test-'));
  const databaseUrl = `file:${join(directory, 'test.db').replaceAll('\\', '/')}`;
  const previousUrl = process.env.DATABASE_URL;
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = randomBytes(48).toString('hex');
  process.env.DATABASE_URL = databaseUrl;
  let prisma;
  let app;
  try {
    execFileSync(
      process.execPath,
      [resolve(__dirname, '../scripts/prisma-migrate.cjs'), 'deploy'],
      { cwd: resolve(__dirname, '..'), env: process.env, stdio: 'pipe' },
    );
    const createClient = () =>
      new PrismaClient({
        adapter: new PrismaBetterSqlite3({ url: databaseUrl }),
      });
    prisma = createClient();
    const user = await prisma.user.create({
      data: {
        name: 'Test User',
        email: 'test@example.invalid',
        passwordHash: 'test-only-placeholder',
      },
    });
    await assert.rejects(
      prisma.user.create({
        data: {
          name: 'Duplicate',
          email: user.email,
          passwordHash: 'test-only-placeholder',
        },
      }),
      { code: 'P2002' },
    );
    const day = await prisma.internshipDay.create({
      data: {
        userId: user.id,
        date: '2026-09-25',
        title: 'Test day',
        tasks: { create: { title: 'Test task' } },
      },
      include: { tasks: true },
    });
    assert.equal(day.tasks[0].status, 'TODO');
    await prisma.internshipDay.create({
      data: {
        userId: user.id,
        date: day.date,
        title: 'Same date is allowed',
      },
    });
    await assert.rejects(
      prisma.task.create({
        data: {
          dayId: 'missing-day',
          title: 'Orphan task',
        },
      }),
      { code: 'P2003' },
    );

    await prisma.$disconnect();
    prisma = createClient();
    assert.equal(
      (await prisma.internshipDay.findUniqueOrThrow({ where: { id: day.id } }))
        .date,
      '2026-09-25',
    );
    await prisma.internshipDay.delete({ where: { id: day.id } });
    assert.equal(await prisma.task.count({ where: { dayId: day.id } }), 0);

    app = await NestFactory.create(AppModule, { logger: false });
    await app.listen(0, '127.0.0.1');
    const url = await app.getUrl();
    const response = await fetch(`${url}/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      status: 'ok',
      database: 'connected',
    });
    await prisma.$executeRawUnsafe('DROP TABLE "Task"');
    const unavailable = await fetch(`${url}/health`);
    assert.equal(unavailable.status, 503);
    assert.deepEqual(await unavailable.json(), {
      code: 'DATABASE_UNAVAILABLE',
      message: 'Veritabanı bağlantısı hazır değil.',
    });
  } finally {
    if (app) await app.close();
    if (prisma) await prisma.$disconnect();
    if (previousUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousUrl;
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
    rmSync(directory, { recursive: true, force: true });
  }
});
