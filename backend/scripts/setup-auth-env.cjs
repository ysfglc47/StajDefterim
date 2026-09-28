const { existsSync, readFileSync, writeFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { randomBytes } = require('node:crypto');
const { parse } = require('dotenv');

const path = resolve(__dirname, '../.env');
const contents = readFileSync(
  existsSync(path) ? path : resolve(__dirname, '../.env.example'),
  'utf8',
);
if (parse(contents).JWT_SECRET) {
  console.log('JWT_SECRET already exists; kept unchanged.');
} else {
  const withoutEmptyKey = contents.replace(/^JWT_SECRET=.*(?:\r?\n|$)/gm, '');
  writeFileSync(
    path,
    `${withoutEmptyKey.trimEnd()}\nJWT_SECRET="${randomBytes(48).toString('hex')}"\n`,
  );
  console.log('A random JWT_SECRET was saved to backend/.env.');
}
