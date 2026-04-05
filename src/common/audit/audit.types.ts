export type AuditOutcome = 'success' | 'failure' | 'denied';

export interface AuditRequestContext {
  requestId?: string;
  ip?: string;
  userAgent?: string;
}

export interface AuditActorContext {
  id?: string;
  roles?: string[];
  scopes?: string[];
}

export interface AuditEvent {
  action: string;
  actorId?: string;
  actorRole?: string[];
  scopes?: string[];
  targetType: string;
  targetId?: string;
  outcome: AuditOutcome;
  correlationId?: string;
  requestId?: string;
  reason?: string;
  ip?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
}
