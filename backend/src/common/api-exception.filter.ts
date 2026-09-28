import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { AuthError } from '../auth/auth.errors';
import { DayError } from '../days/days.service';
import { TaskError } from '../tasks/tasks.service';

interface ErrorBody {
  code: string;
  message: string;
  fieldErrors?: Record<string, string[]>;
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const response = host
      .switchToHttp()
      .getResponse<{ status(code: number): { json(body: ErrorBody): void } }>();
    let status = 500;
    let body: ErrorBody = {
      code: 'INTERNAL_ERROR',
      message: 'İşlem tamamlanamadı. Lütfen tekrar deneyin.',
    };
    if (error instanceof DayError || error instanceof TaskError) {
      status = error.code === 'EMPTY_UPDATE' ? 400 : 404;
      body = {
        code: error.code,
        message:
          error.code === 'DAY_NOT_FOUND'
            ? 'Staj günü bulunamadı.'
            : error.code === 'TASK_NOT_FOUND'
              ? 'Görev bulunamadı.'
              : 'Güncellemek için en az bir alan gönderin.',
      };
    } else if (error instanceof AuthError) {
      status = error.code === 'EMAIL_TAKEN' ? 409 : 401;
      body = {
        code: error.code,
        message:
          error.code === 'EMAIL_TAKEN'
            ? 'Bu e-posta adresi zaten kayıtlı.'
            : error.code === 'INVALID_CREDENTIALS'
              ? 'E-posta veya şifre hatalı.'
              : 'Oturumunuz geçersiz veya süresi dolmuş. Lütfen giriş yapın.',
        ...(error.code === 'EMAIL_TAKEN'
          ? { fieldErrors: { email: ['Bu e-posta adresi zaten kayıtlı.'] } }
          : {}),
      };
    } else if (error instanceof HttpException) {
      status = error.getStatus();
      const value = error.getResponse();
      if (typeof value === 'object' && 'code' in value && 'message' in value) {
        body = value as ErrorBody;
      } else if (status < 500) {
        body = {
          code: `HTTP_${status}`,
          message:
            status === 404 ? 'İstenen kaynak bulunamadı.' : 'İstek işlenemedi.',
        };
      }
    }
    // Never include request bodies, tokens, hashes or database exceptions in responses/logs.
    response.status(status).json(body);
  }
}
