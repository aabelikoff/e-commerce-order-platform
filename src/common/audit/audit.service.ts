import { Injectable, Logger } from '@nestjs/common';
import {
  AuditActorContext,
  AuditEvent,
  AuditOutcome,
  AuditRequestContext,
} from './audit.types';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  record(
    event: Omit<AuditEvent, 'actorId' | 'actorRole' | 'scopes'> & {
      actor?: AuditActorContext;
    },
  ): void {
    const payload = {
      logType: 'audit',
      timestamp: new Date().toISOString(),
      action: event.action,
      actorId: event.actor?.id,
      actorRole: event.actor?.roles ?? [],
      scopes: event.actor?.scopes ?? [],
      targetType: event.targetType,
      targetId: event.targetId,
      outcome: event.outcome,
      correlationId: event.correlationId ?? event.requestId,
      requestId: event.requestId,
      reason: event.reason,
      ip: event.ip,
      userAgent: event.userAgent,
      details: event.details,
    };

    const line = JSON.stringify(payload);

    if (event.outcome === 'failure' || event.outcome === 'denied') {
      this.logger.warn(line);
      return;
    }

    this.logger.log(line);
  }

  recordWithRequest(
    event: Omit<
      AuditEvent,
      | 'actorId'
      | 'actorRole'
      | 'scopes'
      | 'correlationId'
      | 'requestId'
      | 'ip'
      | 'userAgent'
    > & { actor?: AuditActorContext },
    request?: AuditRequestContext,
  ): void {
    this.record({
      ...event,
      correlationId: request?.requestId,
      requestId: request?.requestId,
      ip: request?.ip,
      userAgent: request?.userAgent,
    });
  }
}

export function buildAuditRequestContext(
  request?: Partial<{
    requestId: string;
    ip: string;
    headers: Record<string, string | string[] | undefined>;
  }>,
): AuditRequestContext | undefined {
  if (!request) {
    return undefined;
  }

  const userAgentHeader = request.headers?.['user-agent'];
  const userAgent = Array.isArray(userAgentHeader)
    ? userAgentHeader[0]
    : userAgentHeader;

  return {
    requestId: request.requestId,
    ip: request.ip,
    userAgent,
  };
}
