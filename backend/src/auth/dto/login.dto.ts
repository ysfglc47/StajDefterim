import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { AUTH } from '../auth.constants';

export class LoginDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'Geçerli bir e-posta adresi girin.' })
  @MaxLength(AUTH.emailMax, {
    message: 'E-posta en fazla 254 karakter olabilir.',
  })
  email!: string;

  @IsString({ message: 'Şifre metin olmalıdır.' })
  @MinLength(AUTH.passwordMin, { message: 'Şifre en az 8 karakter olmalıdır.' })
  @MaxLength(AUTH.passwordMax, {
    message: 'Şifre en fazla 128 karakter olabilir.',
  })
  password!: string;
}
