import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { finalize } from 'rxjs/operators';
import { randomUUID } from 'crypto';
import { GqlExecutionContext } from '@nestjs/graphql';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler) {

    const http = context.switchToHttp();
    const req = http.getRequest<any>();
    const res = http.getResponse<any>();

    if (!req) return next.handle();

    const requestId = req.headers['x-request-id'] ?? req.requestId ?? randomUUID();
    req.requestId = requestId;

    const startedAt = Date.now();

    return next.handle().pipe(
      finalize(() => {
        const latencyMs = Date.now() - startedAt;

        this.logger.log(
          JSON.stringify({
            msg: 'http_request',
            requestId,
            method: req.method,
            path: req.url,
            statusCode: res.statusCode,
            latencyMs,
          }),
        );
      }),
    );
  }
}
