// src/common/filters/http-exception.filter.ts
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request & { requestId?: string }>();

    const timestamp = new Date().toISOString();
    const path = req.url;

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const payload = exception.getResponse() as any;

      return res.status(statusCode).json({
        statusCode,
        code: payload?.code ?? 'HTTP_EXCEPTION',
        message: payload?.message ?? exception.message,
        details: payload?.details,
        timestamp,
        path,
        requestId: req.requestId,
      });
    }

    return res.status(500).json({
      statusCode: 500,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Unexpected error',
      timestamp,
      path,
      requestId: req.requestId,
    });
  }
}
