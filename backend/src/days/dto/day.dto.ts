import { Transform } from 'class-transformer';
import { IsString, Length, MaxLength, ValidateIf } from 'class-validator';
import { CalendarDate, DAY_LIMITS, trimTitle } from '../day.validation';

export class CreateDayDto {
  @CalendarDate()
  date!: string;

  @Transform(trimTitle)
  @IsString({ message: 'Başlık metin olmalıdır.' })
  @Length(1, DAY_LIMITS.title, {
    message: 'Başlık 1–120 karakter arasında olmalıdır.',
  })
  title!: string;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString({ message: 'Açıklama metin olmalıdır.' })
  @MaxLength(DAY_LIMITS.description, {
    message: 'Açıklama en fazla 2000 karakter olabilir.',
  })
  description?: string;
}

export class UpdateDayDto {
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @CalendarDate()
  date?: string;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Transform(trimTitle)
  @IsString({ message: 'Başlık metin olmalıdır.' })
  @Length(1, DAY_LIMITS.title, {
    message: 'Başlık 1–120 karakter arasında olmalıdır.',
  })
  title?: string;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString({ message: 'Açıklama metin olmalıdır.' })
  @MaxLength(DAY_LIMITS.description, {
    message: 'Açıklama en fazla 2000 karakter olabilir.',
  })
  description?: string;
}
