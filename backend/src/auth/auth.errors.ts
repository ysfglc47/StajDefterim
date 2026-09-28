export class AuthError extends Error {
  constructor(
    public readonly code:
      'INVALID_CREDENTIALS' | 'EMAIL_TAKEN' | 'UNAUTHORIZED',
  ) {
    super(code);
  }
}
