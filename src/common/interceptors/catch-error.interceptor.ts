import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { catchError, throwError, of } from 'rxjs';

@Injectable()
export class CatchErrorInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    return next.handle().pipe(
      catchError((err) => {
        // Here you can log the error or transform it before re-throwing
        // For example, logging the error:
        console.error('An error occurred:', err);

        // Re-throw the error to be handled by NestJS exception filters
          return throwError(() => err);
        //   return of({ ok: 'err' });
      }),
    );
  }
}
