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
    const req = context.switchToHttp().getRequest();

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
}
