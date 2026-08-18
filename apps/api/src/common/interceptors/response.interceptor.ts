import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';
import { ApiResult } from '../http/api-result';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next.handle().pipe(
      map((result: unknown) => {
        if (result instanceof ApiResult) {
          const apiResult = result as ApiResult<unknown>;
          return {
            success: true,
            message: apiResult.message,
            data: apiResult.data,
            ...(apiResult.redirectUrl
              ? { redirectUrl: apiResult.redirectUrl }
              : {}),
          };
        }
        return { success: true, message: 'OK', data: result ?? null };
      }),
    );
  }
}
