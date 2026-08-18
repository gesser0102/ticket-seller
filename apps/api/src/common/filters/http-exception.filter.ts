import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AppLoggerService } from '../logger/app-logger.service';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: AppLoggerService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const safeMessage = this.resolveSafeMessage(
      exception,
      isHttpException,
      status,
    );

    this.logger.error({
      userId: request.session?.user?.id,
      module: 'HttpExceptionFilter',
      procedure: `${request.method} ${request.url}`,
      message:
        exception instanceof Error ? exception.message : 'Erro desconhecido',
      stack: exception instanceof Error ? exception.stack : undefined,
      params: { body: request.body as unknown, query: request.query },
    });

    response.status(status).json({
      success: false,
      message: safeMessage,
      data: null,
    });
  }

  private resolveSafeMessage(
    exception: unknown,
    isHttpException: boolean,
    status: number,
  ): string {
    if (isHttpException) {
      const body = (exception as HttpException).getResponse();
      if (typeof body === 'string') return body;
      if (body && typeof body === 'object' && 'message' in body) {
        const msg = body.message;
        return Array.isArray(msg) ? msg.join(' ') : String(msg);
      }
    }
    if (status >= 500) {
      return 'Erro interno. Tente novamente em instantes.';
    }
    return 'Não foi possível concluir a solicitação.';
  }
}
