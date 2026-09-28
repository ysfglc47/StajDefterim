import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import type { AuthRequest } from '../auth/auth.guard';
import { CreateDayDto, UpdateDayDto } from './dto/day.dto';
import { DaysService } from './days.service';

@Controller('days')
export class DaysController {
  constructor(private readonly days: DaysService) {}
  @Get()
  @Header('Cache-Control', 'no-store')
  list(@Req() request: AuthRequest) {
    return this.days.list(request.user.id);
  }
  @Post()
  create(@Req() request: AuthRequest, @Body() input: CreateDayDto) {
    return this.days.create(request.user.id, input);
  }
  @Get(':id')
  @Header('Cache-Control', 'no-store')
  detail(@Req() request: AuthRequest, @Param('id') id: string) {
    return this.days.detail(id, request.user.id);
  }
  @Patch(':id')
  update(
    @Req() request: AuthRequest,
    @Param('id') id: string,
    @Body() input: UpdateDayDto,
  ) {
    return this.days.update(id, request.user.id, input);
  }
  @Delete(':id')
  @HttpCode(204)
  remove(@Req() request: AuthRequest, @Param('id') id: string) {
    return this.days.remove(id, request.user.id);
  }
}
