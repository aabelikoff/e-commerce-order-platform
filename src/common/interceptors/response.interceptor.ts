import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map } from 'rxjs/operators';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const req = context.switchToHttp().getRequest<{
      path?: string;
      requestId?: string;
    }>();

    if (!req) return next.handle();
    if (this.shouldBypassResponseWrap(req.path)) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => ({
        data,
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.requestId,
        },
      })),
    );
  }

  private shouldBypassResponseWrap(path?: string): boolean {
    const normalizedPath = (path ?? '').replace(/^\/v\d+\//, '/');
    return ['/health', '/ready', '/metrics'].includes(normalizedPath);
  }
}
