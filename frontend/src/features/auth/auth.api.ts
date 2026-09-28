import { apiRequest } from '../../shared/api/client';

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}
export interface Session {
  user: User;
  accessToken: string;
  expiresAt: number;
  tokenType: 'Bearer';
}
export interface Credentials {
  email: string;
  password: string;
}

export const register = (
  input: Credentials & { name: string },
  signal: AbortSignal,
) =>
  apiRequest<User>('/auth/register', { method: 'POST', body: input, signal });
export const login = (input: Credentials, signal: AbortSignal) =>
  apiRequest<Session>('/auth/login', { method: 'POST', body: input, signal });
