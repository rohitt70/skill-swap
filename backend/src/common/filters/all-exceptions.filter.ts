
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;

    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = isHttpException
      ? exception.getResponse()
      : 'Internal server error';

    // Log unexpected exceptions on the server for diagnosis.
    if (!isHttpException) {
      const error =
        exception instanceof Error ? exception : new Error(String(exception));

      this.logger.error(
        `Unhandled exception on ${request.method} ${request.path}`,
        error.stack,
      );

      // Keep the actual error and stack trace out of the HTTP response.
    } else {
      const details =
        typeof message === 'object'
          ? (message as { message?: unknown }).message ?? message
          : message;

      this.logger.warn(
        `HTTP ${status} ${request.method} ${request.path} - ${JSON.stringify(details)}`,
      );
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.path,
      error: isHttpException ? message : 'Internal server error',
    });
  }
}
