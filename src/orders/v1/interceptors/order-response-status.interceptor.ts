import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class OrderResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        const response = context.switchToHttp().getResponse();
        
        
        if (data && typeof data.created === 'boolean') {
          response.status(data.created ? HttpStatus.CREATED : HttpStatus.OK);
          if ('payment' in data) {
            return {
              order: data.order,
              payment: data.payment,
            };
          }
          return data.order;
        }
        
        return data;
      }),
    );
  }
}
