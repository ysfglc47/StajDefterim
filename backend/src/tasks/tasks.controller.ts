import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import type { AuthRequest } from '../auth/auth.guard';
import { CreateTaskDto, UpdateTaskDto } from './dto/task.dto';
import { TasksService } from './tasks.service';

@Controller()
export class TasksController {
  constructor(private readonly tasks: TasksService) {}
  @Post('days/:dayId/tasks')
  create(
    @Req() request: AuthRequest,
    @Param('dayId') dayId: string,
    @Body() input: CreateTaskDto,
  ) {
    return this.tasks.create(dayId, request.user.id, input);
  }
  @Patch('tasks/:id')
  update(
    @Req() request: AuthRequest,
    @Param('id') id: string,
    @Body() input: UpdateTaskDto,
  ) {
    return this.tasks.update(id, request.user.id, input);
  }
  @Delete('tasks/:id')
  @HttpCode(204)
  remove(@Req() request: AuthRequest, @Param('id') id: string) {
    return this.tasks.remove(id, request.user.id);
  }
}
