import { BadRequestException, ValidationPipe } from '@nestjs/common';

export function createValidationPipe() {
  return new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    validationError: { target: false, value: false },
    exceptionFactory: (errors) =>
      new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Lütfen işaretli alanları kontrol edin.',
        fieldErrors: Object.fromEntries(
          errors.map((error) => [
            error.property,
            error.constraints?.whitelistValidation
              ? ['Bu alan gönderilemez.']
              : Object.values(error.constraints ?? {}),
          ]),
        ),
      }),
  });
}
