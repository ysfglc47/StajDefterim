import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DaysController } from './days.controller';
import { DaysService } from './days.service';
import { DaysRepository } from './days.repository';
import { PrismaDaysRepository } from './prisma-days.repository';

@Module({
  imports: [PrismaModule],
  controllers: [DaysController],
  providers: [
    DaysService,
    { provide: DaysRepository, useClass: PrismaDaysRepository },
  ],
})
export class DaysModule {}
