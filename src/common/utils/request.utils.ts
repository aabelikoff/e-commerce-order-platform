import { ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';

export function getRequest(context: ExecutionContext) {
  const type = context.getType<'http' | 'graphql'>();

  if (type === 'http') {
    return context.switchToHttp().getRequest();
  }

  // graphql
  return GqlExecutionContext.create(context).getContext().req;
}

export function getUser(context: ExecutionContext) {
  const req = getRequest(context);
  return req.user;
}