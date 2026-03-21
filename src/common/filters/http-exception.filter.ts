import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { resolveLocale, translateKnownMessage } from '../i18n/message-translator';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const locale = resolveLocale(request.headers['accept-language']);

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let code = 5001;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || responseObj.error || message;
        code = responseObj.code || this.getCodeByStatus(status);
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    message = translateKnownMessage(message, locale);

    // Log error for debugging
    console.error(`[${new Date().toISOString()}] ${request.method} ${request.url}`, {
      status,
      message,
      stack: exception instanceof Error ? exception.stack : undefined,
    });

    response.status(status).json({
      code: code,
      message: message,
      ...(process.env.NODE_ENV === 'development' && { 
        error: exception instanceof Error ? exception.message : String(exception),
        path: request.url,
        timestamp: new Date().toISOString(),
      }),
    });
  }

  private getCodeByStatus(status: number): number {
    switch (status) {
      case 400: return 1001; // Validation error
      case 404: return 1002; // Not found
      case 409: return 1003; // Conflict
      case 401: return 2001; // Unauthorized
      case 403: return 2003; // Forbidden
      case 500: return 5001; // Server error
      default: return 5000;
    }
  }
}
