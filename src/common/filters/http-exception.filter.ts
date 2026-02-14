// src/common/filters/problem-details.filter.ts
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ProblemDetails } from '../types/problem-details';
import { GqlArgumentsHost } from '@nestjs/graphql';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const timestamp = new Date().toISOString();

    const httpCtx = host.switchToHttp();
    const res = httpCtx.getResponse<Response>();
    const req = httpCtx.getRequest<Request & { requestId?: string }>();

    if (!res || !req) {
      throw exception;
    }

    const instance = req.originalUrl || req.url || 'graphql';

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse() as any;

      // Nest default: { statusCode, message, error }
      // payload.message could be string | string[]
      const code = payload?.code ?? 'HTTP_EXCEPTION';

      const title =
        payload?.title ??
        (typeof payload?.error === 'string'
          ? payload.error
          : HttpStatus[status]) ??
        'Error';

      const detail =
        payload?.detail ??
        (typeof payload?.message === 'string'
          ? payload.message
          : typeof exception.message === 'string'
            ? exception.message
            : undefined);

      const errors =
        payload?.errors ??
        (Array.isArray(payload?.message) ? payload.message : payload?.details);

      const problem: ProblemDetails = {
        type: payload?.type ?? mapType(status, code),
        title,
        status,
        ...(detail ? { detail } : {}),
        instance,

        // extensions
        code,
        ...(errors ? { errors } : {}),
        timestamp,
        requestId: req.requestId,
      };

      return res.status(status).type('application/problem+json').json(problem);
    }

    const problem: ProblemDetails = {
      type: 'about:blank',
      title: 'Internal Server Error',
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      detail: 'Unexpected error',
      instance,

      // extensions
      code: 'INTERNAL_SERVER_ERROR',
      timestamp,
      requestId: req.requestId,
    };

    return res
      .status(problem.status)
      .type('application/problem+json')
      .json(problem);
  }
}

function mapType(status: number, code?: string) {
  // RFC allows about:blank as “generic error type”
  // Might be done as URL to documentation: https://api.example.com/problems/...
  if (code) return `urn:problem:${code.toLowerCase()}`;

  switch (status) {
    case 400:
      return 'urn:problem:bad-request';
    case 401:
      return 'urn:problem:unauthorized';
    case 403:
      return 'urn:problem:forbidden';
    case 404:
      return 'urn:problem:not-found';
    case 409:
      return 'urn:problem:conflict';
    case 422:
      return 'urn:problem:validation-error';
    default:
      return status >= 500 ? 'about:blank' : 'urn:problem:http-error';
  }
}
