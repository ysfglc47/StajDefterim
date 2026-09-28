export const AUTH = {
  tokenLifetimeSeconds: 30 * 60,
  issuer: 'stajdefterim-api',
  audience: 'stajdefterim-web',
  nameMin: 2,
  nameMax: 80,
  emailMax: 254,
  passwordMin: 8,
  passwordMax: 128,
} as const;
