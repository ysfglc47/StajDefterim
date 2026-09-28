import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';
import { AUTH } from '../auth.constants';
import { LoginDto } from './login.dto';

export class RegisterDto extends LoginDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: 'Ad metin olmalıdır.' })
  @Length(AUTH.nameMin, AUTH.nameMax, {
    message: 'Ad 2–80 karakter arasında olmalıdır.',
  })
  name!: string;
}
