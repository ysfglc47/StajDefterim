export interface AuthUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

export type SafeUser = Omit<AuthUser, 'passwordHash'>;

export abstract class UserRepository {
  abstract findByEmail(email: string): Promise<AuthUser | null>;
  abstract findById(id: string): Promise<SafeUser | null>;
  abstract create(
    data: Pick<AuthUser, 'name' | 'email' | 'passwordHash'>,
  ): Promise<SafeUser>;
}
