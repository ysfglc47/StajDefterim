const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const { randomBytes } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('../dist/app.module.js');

const directory = mkdtempSync(join(tmpdir(), 'stajdefterim-e2e-'));
process.env.DATABASE_URL = `file:${join(directory, 'browser.db').replaceAll('\\', '/')}`;
process.env.JWT_SECRET = randomBytes(48).toString('hex');

async function start() {
  execFileSync(
    process.execPath,
    [resolve(__dirname, '../scripts/prisma-migrate.cjs'), 'deploy'],
    { cwd: resolve(__dirname, '..'), env: process.env, stdio: 'pipe' },
  );
  const app = await NestFactory.create(AppModule, { logger: false });
  app.enableCors({ origin: 'http://localhost:5174' });
  const stop = async () => {
    await app.close();
    rmSync(directory, { recursive: true, force: true });
    process.exit(0);
  };
  process.once('SIGTERM', () => void stop());
  process.once('SIGINT', () => void stop());
  await app.listen(3100, '127.0.0.1');
}

void start().catch(() => {
  console.error('E2E API could not start.');
  process.exitCode = 1;
});
