export interface IThrottlingPolicyConfig {
  ttl: number;
  limit: number;
}

export interface IThrottlingConfig {
  default: IThrottlingPolicyConfig;
  auth: IThrottlingPolicyConfig;
  payments: IThrottlingPolicyConfig;
  adminWrites: IThrottlingPolicyConfig;
}
