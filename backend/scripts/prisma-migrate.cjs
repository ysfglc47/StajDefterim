require('dotenv/config');
const { closeSync, mkdirSync, openSync } = require('node:fs');
const { dirname, resolve } = require('node:path');
const { spawnSync } = require('node:child_process');

const url = process.env.DATABASE_URL;
if (!url?.startsWith('file:')) {
  throw new Error('DATABASE_URL must point to a SQLite file.');
}

// Prisma's Windows engine can fail before creating a missing SQLite file.
// Append mode creates an empty file without truncating an existing database.
const databasePath = resolve(url.slice(5));
mkdirSync(dirname(databasePath), { recursive: true });
closeSync(openSync(databasePath, 'a'));

const result = spawnSync(
  process.execPath,
  [
    require.resolve('prisma/build/index.js'),
    'migrate',
    ...process.argv.slice(2),
  ],
  { stdio: 'inherit', env: process.env },
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
