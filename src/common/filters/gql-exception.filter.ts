import { ArgumentsHost, Catch, HttpException, Logger } from '@nestjs/common';
import { GqlArgumentsHost, GqlExceptionFilter } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';

type GraphqlRequestContext = {
  req?: {
    requestId?: string;
    headers?: Record<string, string | string[] | undefined>;
  };
};

@Catch()
export class GqlAllExceptionsFilter implements GqlExceptionFilter {
  private readonly logger = new Logger(GqlAllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const gqlHost = GqlArgumentsHost.create(host);
    const ctx = gqlHost.getContext<GraphqlRequestContext>();
    const requestIdHeader = ctx.req?.headers?.['x-request-id'];
    const requestId = Array.isArray(requestIdHeader)
      ? requestIdHeader[0]
      : (requestIdHeader ?? ctx.req?.requestId);

    this.logger.error(
      `GraphQL error${requestId ? ` (requestId=${requestId})` : ''}`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    if (exception instanceof HttpException) {
      return exception;
    }

    return new GraphQLError('Internal error while processing request', {
      extensions: {
        code: 'INTERNAL_SERVER_ERROR',
        requestId,
      },
    });
  }
}
