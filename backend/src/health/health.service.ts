import { Injectable } from '@nestjs/common';
import { HealthRepository } from './health.repository';

@Injectable()
export class HealthService {
  constructor(private readonly repository: HealthRepository) {}

  async check() {
    await this.repository.checkSchema();
    return { status: 'ok' as const, database: 'connected' as const };
  }
}
