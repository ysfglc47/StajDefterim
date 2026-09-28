import { Transform } from 'class-transformer';
import { IsIn, IsString, Length, MaxLength, ValidateIf } from 'class-validator';
import { TEXT_LIMITS, trimTitle } from '../../common/text.validation';
import { TASK_STATUSES, TaskStatus } from '../task.types';

export class CreateTaskDto {
  @Transform(trimTitle)
  @IsString({ message: 'Başlık metin olmalıdır.' })
  @Length(1, TEXT_LIMITS.title, {
    message: 'Başlık 1–120 karakter arasında olmalıdır.',
  })
  title!: string;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString({ message: 'Açıklama metin olmalıdır.' })
  @MaxLength(TEXT_LIMITS.description, {
    message: 'Açıklama en fazla 2000 karakter olabilir.',
  })
  description?: string;
}

export class UpdateTaskDto {
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Transform(trimTitle)
  @IsString({ message: 'Başlık metin olmalıdır.' })
  @Length(1, TEXT_LIMITS.title, {
    message: 'Başlık 1–120 karakter arasında olmalıdır.',
  })
  title?: string;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString({ message: 'Açıklama metin olmalıdır.' })
  @MaxLength(TEXT_LIMITS.description, {
    message: 'Açıklama en fazla 2000 karakter olabilir.',
  })
  description?: string;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsIn(TASK_STATUSES, {
    message: 'Durum TODO, IN_PROGRESS veya DONE olmalıdır.',
  })
  status?: TaskStatus;
}
