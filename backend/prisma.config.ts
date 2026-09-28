import 'dotenv/config';
import { resolve } from 'node:path';
import { defineConfig, env } from 'prisma/config';

const databaseUrl = env('DATABASE_URL');
if (!databaseUrl.startsWith('file:')) {
  throw new Error('DATABASE_URL must point to a SQLite file.');
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  // An absolute URL keeps the CLI and runtime independent of schema-relative resolution.
  datasource: {
    url: `file:${resolve(databaseUrl.slice(5)).replaceAll('\\', '/')}`,
  },
});
