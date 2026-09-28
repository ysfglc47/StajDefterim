import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AUTH } from './auth.constants';
import { AuthError } from './auth.errors';
import { PasswordService } from './password.service';
import { UserRepository } from './user.repository';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly passwords: PasswordService,
    private readonly jwt: JwtService,
  ) {}

  async register(input: { name: string; email: string; password: string }) {
    const passwordHash = await this.passwords.hash(input.password);
    return this.users.create({
      name: input.name,
      email: input.email,
      passwordHash,
    });
  }

  async login(input: { email: string; password: string }) {
    const user = await this.users.findByEmail(input.email);
    const valid = await this.passwords.verify(
      user?.passwordHash,
      input.password,
    );
    if (!user || !valid) throw new AuthError('INVALID_CREDENTIALS');
    const issuedAt = Math.floor(Date.now() / 1000);
    const expiresAt = issuedAt + AUTH.tokenLifetimeSeconds;
    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      iat: issuedAt,
      exp: expiresAt,
    });
    return {
      accessToken,
      tokenType: 'Bearer',
      expiresAt: expiresAt * 1000,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
    };
  }

  async authenticate(token: string) {
    let payload: { sub?: unknown; exp?: unknown };
    try {
      payload = await this.jwt.verifyAsync(token);
    } catch {
      throw new AuthError('UNAUTHORIZED');
    }
    if (typeof payload.sub !== 'string' || typeof payload.exp !== 'number') {
      throw new AuthError('UNAUTHORIZED');
    }
    const user = await this.users.findById(payload.sub);
    if (!user) throw new AuthError('UNAUTHORIZED');
    return user;
  }
}
