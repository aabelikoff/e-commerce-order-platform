import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Roles, Scopes } from '../decorators';
import { getUser } from '../../common/utils/request.utils';
import { ROLES_KEY, SCOPES_KEY } from '../decorators';

@Injectable()
export class AccessGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const requiredScopes = this.reflector.getAllAndOverride<string[]>(SCOPES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (
      (!requiredRoles || requiredRoles.length === 0) &&
      (!requiredScopes || requiredScopes.length === 0)
    ) {
      return true;
    }

    const user = getUser(context);

    if (!user) {
      throw new UnauthorizedException(
        'Authentication required',
      );
    }

    const hasRole = requiredRoles
      ? requiredRoles.some((role) => user.roles?.includes(role))
      : true;
    const hasScope = requiredScopes
      ? requiredScopes.some((scope) => user.scopes?.includes(scope))
      : true;

    if (!hasRole) {
      throw new ForbiddenException('Access denied: insufficient role');
    }

    if (!hasScope) {
      throw new ForbiddenException('Access denied: insufficient permissions');
    }

    return hasRole && hasScope;
  }
}
