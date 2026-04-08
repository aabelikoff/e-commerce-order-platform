export enum EOrderScopes {
  ORDER_READ = 'order:read',
  ORDER_WRITE = 'order:write',
}

export enum EProductScopes {
  PRODUCT_READ = 'product:read',
  PRODUCT_WRITE = 'product:write',
}

export enum EUserScopes {
  USER_READ = 'user:read',
  USER_WRITE = 'user:write',
}

export enum EPaymentScopes {
  PAYMENT_READ = 'payment:read',
  PAYMENT_WRITE = 'payment:write',
}

export enum ERefundScopes {
  REFUND_WRITE = 'refund:write',
}

export const UNITED_SCOPES = [
  ...Object.values(EOrderScopes),
  ...Object.values(EProductScopes),
  ...Object.values(EUserScopes),
  ...Object.values(EPaymentScopes),
  ...Object.values(ERefundScopes),
] as const;

export type EUnitedScopes = (typeof UNITED_SCOPES)[number];
