import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { MetricsService } from './metrics.service';

@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest();
    const response = http.getResponse();
    const startedAt = process.hrtime.bigint();

    return next.handle().pipe(
      finalize(() => {
        const durationSeconds =
          Number(process.hrtime.bigint() - startedAt) / 1_000_000_000;

        this.metricsService.recordHttpRequest(
          {
            method: request.method,
            route: this.resolveRoute(request),
            status: String(response.statusCode ?? 500),
          },
          durationSeconds,
        );
      }),
    );
  }

  private resolveRoute(request: {
    route?: { path?: string | string[] };
    baseUrl?: string;
    path?: string;
  }): string {
    const routePath = request.route?.path;

    if (typeof routePath === 'string') {
      return this.normalizeRoute(`${request.baseUrl ?? ''}/${routePath}`);
    }

    if (Array.isArray(routePath) && routePath.length > 0) {
      return this.normalizeRoute(
        `${request.baseUrl ?? ''}/${routePath[0] ?? ''}`,
      );
    }

    return this.normalizeRoute(request.path ?? 'unknown');
  }

  private normalizeRoute(route: string): string {
    const normalized = route.replace(/\/+/g, '/');
    return normalized.startsWith('/') ? normalized : `/${normalized}`;
  }
}
