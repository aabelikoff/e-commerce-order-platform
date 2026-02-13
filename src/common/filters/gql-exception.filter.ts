// src/common/filters/gql-exception.filter.ts
import { Catch, Logger } from '@nestjs/common';
import { GqlExceptionFilter, GqlArgumentsHost } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';
import { HttpException } from '@nestjs/common';

@Catch()
export class GqlAllExceptionsFilter implements GqlExceptionFilter {
  private readonly logger = new Logger(GqlAllExceptionsFilter.name);

  catch(exception: any, host: any) {
    const gqlHost = GqlArgumentsHost.create(host);
    const ctx = gqlHost.getContext<{ req?: any }>();
    const requestId = ctx?.req?.requestId ?? ctx?.req?.headers?.['x-request-id'];

    this.logger.error(
      `GraphQL error${requestId ? ` (requestId=${requestId})` : ''}`,
      exception?.stack ?? String(exception),
    );

    if (exception instanceof HttpException) {
      return exception; // Nest/Apollo сами превратят в GraphQL error корректно
    }

    return new GraphQLError('Internal error while processing request', {
      extensions: {
        code: 'INTERNAL_SERVER_ERROR',
        requestId,
      },
    });
  }
}