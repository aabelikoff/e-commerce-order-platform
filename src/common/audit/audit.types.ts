export const AuditAction = {
  AuthLoginFailed: 'auth.login_failed',
  PaymentCaptureRequested: 'payment.capture_requested',
  OrderStatusOverride: 'order.status_override',
} as const;

export type AuditAction =
  (typeof AuditAction)[keyof typeof AuditAction];

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
  action: AuditAction;
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
