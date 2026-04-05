import { SetMetadata } from '@nestjs/common';

export const THROTTLING_POLICY_METADATA_KEY = 'throttling:policy';

export type ThrottlingPolicyName = 'auth' | 'payments' | 'adminWrites';

export const UseThrottlePolicy = (policy: ThrottlingPolicyName) =>
  SetMetadata(THROTTLING_POLICY_METADATA_KEY, policy);

export const AuthThrottle = () => UseThrottlePolicy('auth');

export const PaymentsThrottle = () => UseThrottlePolicy('payments');

export const AdminWritesThrottle = () => UseThrottlePolicy('adminWrites');
