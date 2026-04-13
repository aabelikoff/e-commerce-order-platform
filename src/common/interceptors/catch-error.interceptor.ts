import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Logger,
  HttpException,
} from '@nestjs/common';
import { catchError, throwError } from 'rxjs';

@Injectable()
export class CatchErrorInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CatchErrorInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler) {
    const http = context.switchToHttp();
    const req = http.getRequest<any>();

    return next.handle().pipe(
      catchError((err) => {
        const status = err instanceof HttpException ? err.getStatus() : 500;

        this.logger.error(
          JSON.stringify({
            msg: 'http_error',
            requestId: req?.requestId,
            method: req?.method,
            path: req?.originalUrl ?? req?.url,
            statusCode: status,
            errorName: err?.name ?? 'Error',
            errorMessage: err instanceof Error ? err.message : String(err),
          }),
          err instanceof Error ? err.stack : undefined,
        );

        return throwError(() => err);
      }),
    );
  }
}
