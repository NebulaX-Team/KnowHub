import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';
import { resolveLocale, translatePayloadMessages } from '../i18n/message-translator';

export interface Response<T> {
  code: number;
  data: T;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, Response<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<Response<T>> {
    const request = context.switchToHttp().getRequest<Request>();
    const locale = resolveLocale(request?.headers?.['accept-language']);

    return next.handle().pipe(
      map((data) => ({
        code: 0,
        data: translatePayloadMessages(data, locale),
      })),
    );
  }
}
