import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    const status = exception instanceof HttpException ? exception.getStatus() : 500;
    const responseBody = exception instanceof HttpException ? exception.getResponse() : 'Internal server error';
    const message = getExceptionMessage(exception, responseBody);
    const stack = exception instanceof Error ? exception.stack : undefined;

    this.logger.error(`${request.method} ${request.originalUrl} failed with ${status}: ${message}`, stack);

    if (typeof responseBody === 'object') {
      response.status(status).json(responseBody);
      return;
    }

    response.status(status).json({
      statusCode: status,
      message,
      error: status === 500 ? 'Error' : undefined,
    });
  }
}

function getExceptionMessage(exception: unknown, responseBody: unknown) {
  if (typeof responseBody === 'object' && responseBody !== null) {
    const message = (responseBody as { message?: unknown }).message;

    if (Array.isArray(message)) {
      return message.join(' ');
    }

    if (typeof message === 'string') {
      return message;
    }
  }

  if (typeof responseBody === 'string') {
    return responseBody;
  }

  return exception instanceof Error ? exception.message : 'Unknown error';
}
