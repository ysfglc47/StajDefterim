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
const { JwtService } = require('@nestjs/jwt');
const { verify } = require('@node-rs/argon2');
const { AppModule } = require('../dist/app.module.js');
const { AUTH } = require('../dist/auth/auth.constants.js');

test('auth API acceptance (FR-01–03, FR-14–15)', async (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'stajdefterim-auth-'));
  const previous = {
    url: process.env.DATABASE_URL,
    secret: process.env.JWT_SECRET,
  };
  process.env.DATABASE_URL = `file:${join(directory, 'auth.db').replaceAll('\\', '/')}`;
  process.env.JWT_SECRET = randomBytes(48).toString('hex');
  let app;
  let prisma;
  let user;
  let session;
  const password = '  Test-şifre-2026  ';
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
    const post = (path, body) =>
      fetch(`${base}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    const me = (token) =>
      fetch(`${base}/auth/me`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    const jwt = new JwtService({
      secret: process.env.JWT_SECRET,
      signOptions: { issuer: AUTH.issuer, audience: AUTH.audience },
    });

    await t.test(
      'register normalizes fields and persists only a salted Argon2id hash',
      async () => {
        const response = await post('/auth/register', {
          name: '  Test Öğrenci  ',
          email: '  Test@Example.COM ',
          password,
        });
        assert.equal(response.status, 201);
        assert.equal(response.headers.get('cache-control'), 'no-store');
        user = await response.json();
        assert.deepEqual(Object.keys(user).sort(), [
          'createdAt',
          'email',
          'id',
          'name',
        ]);
        assert.equal(user.name, 'Test Öğrenci');
        assert.equal(user.email, 'test@example.com');
        const stored = await prisma.user.findUniqueOrThrow({
          where: { id: user.id },
        });
        assert.match(stored.passwordHash, /^\$argon2id\$/);
        assert.ok(await verify(stored.passwordHash, password));
        assert.equal(await verify(stored.passwordHash, password.trim()), false);
        assert.equal(JSON.stringify(user).includes(password), false);
      },
    );

    await t.test(
      'duplicate and concurrent registrations produce 409 without overwriting accounts',
      async () => {
        assert.equal(
          (
            await post('/auth/register', {
              name: 'Another User',
              email: 'TEST@example.com',
              password,
            })
          ).status,
          409,
        );
        const responses = await Promise.all(
          [1, 2].map(() =>
            post('/auth/register', {
              name: 'Race User',
              email: 'race@example.com',
              password,
            }),
          ),
        );
        assert.deepEqual(responses.map((r) => r.status).sort(), [201, 409]);
        assert.equal(
          await prisma.user.count({ where: { email: 'race@example.com' } }),
          1,
        );
        const hashes = await prisma.user.findMany({
          select: { passwordHash: true },
        });
        assert.notEqual(hashes[0].passwordHash, hashes[1].passwordHash);
      },
    );

    await t.test(
      'invalid and extra fields are rejected without writes',
      async () => {
        const count = await prisma.user.count();
        for (const invalid of [
          { name: ' ', email: 'valid@example.com', password },
          { name: 'a'.repeat(81), email: 'valid@example.com', password },
          { name: 'Valid', email: 'not-email', password },
          { name: 'Valid', email: `${'a'.repeat(250)}@example.com`, password },
          { name: 'Valid', email: 'valid@example.com', password: 'short' },
          {
            name: 'Valid',
            email: 'valid@example.com',
            password: 'a'.repeat(129),
          },
          {
            name: 'Valid',
            email: 'valid@example.com',
            password,
            userId: 'other',
          },
          { name: 'Valid', email: ['array@example.com'], password },
          { name: 'Valid', email: 'valid@example.com', password: 123456789 },
          {},
          null,
          [],
        ]) {
          const response = await post('/auth/register', invalid);
          assert.equal(response.status, 400);
          const error = await response.json();
          assert.ok(error.code && error.message);
          assert.equal(JSON.stringify(error).includes(password), false);
        }
        assert.equal(await prisma.user.count(), count);
      },
    );

    await t.test(
      'login uses the same error for missing account and wrong password',
      async () => {
        const wrong = await post('/auth/login', {
          email: user.email,
          password: 'Wrong-password',
        });
        const missing = await post('/auth/login', {
          email: 'missing@example.com',
          password: 'Wrong-password',
        });
        assert.equal(wrong.status, 401);
        assert.equal(missing.status, 401);
        assert.deepEqual(await wrong.json(), await missing.json());
        assert.equal(
          (
            await post('/auth/login', {
              email: user.email,
              password: password.trim(),
            })
          ).status,
          401,
        );
      },
    );

    await t.test(
      'login issues a 30 minute token and me returns safe user fields',
      async () => {
        const response = await post('/auth/login', {
          email: ' TEST@EXAMPLE.COM ',
          password,
        });
        assert.equal(response.status, 200);
        session = await response.json();
        const claims = await jwt.verifyAsync(session.accessToken);
        assert.equal(claims.exp - claims.iat, 1800);
        assert.equal(claims.sub, user.id);
        assert.equal(session.expiresAt, claims.exp * 1000);
        assert.deepEqual(session.user, user);
        assert.equal('passwordHash' in claims, false);
        const profile = await me(session.accessToken);
        assert.equal(profile.status, 200);
        assert.deepEqual(await profile.json(), user);
      },
    );

    await t.test(
      'missing, malformed, expired, forged and inappropriate tokens return 401',
      async () => {
        const now = Math.floor(Date.now() / 1000);
        for (const token of [
          undefined,
          'broken.token.value',
          await jwt.signAsync({ sub: user.id, exp: now - 1 }),
          await jwt.signAsync({ sub: user.id }),
          await jwt.signAsync({ sub: 123, exp: now + 60 }),
          await jwt.signAsync({ sub: 'missing-user', exp: now + 60 }),
          await jwt.signAsync(
            { sub: user.id, exp: now + 60 },
            { secret: 'a-different-secret-which-is-not-trusted' },
          ),
          await jwt.signAsync(
            { sub: user.id, exp: now + 60 },
            { audience: 'other-app' },
          ),
          await jwt.signAsync(
            { sub: user.id, exp: now + 60 },
            { algorithm: 'HS384' },
          ),
        ]) {
          const response = await me(token);
          assert.equal(response.status, 401);
          assert.equal((await response.json()).code, 'UNAUTHORIZED');
        }
      },
    );

    await t.test(
      'password boundaries are accepted without silent truncation',
      async () => {
        for (const length of [8, 128]) {
          const credentials = {
            email: `boundary${length}@example.com`,
            password: 'x'.repeat(length),
          };
          assert.equal(
            (await post('/auth/register', { name: 'Boundary', ...credentials }))
              .status,
            201,
          );
          assert.equal((await post('/auth/login', credentials)).status, 200);
        }
      },
    );

    await t.test(
      'deleted users cannot continue using an otherwise valid token',
      async () => {
        await prisma.user.delete({ where: { id: user.id } });
        assert.equal((await me(session.accessToken)).status, 401);
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
