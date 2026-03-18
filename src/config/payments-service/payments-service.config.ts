import { registerAs } from '@nestjs/config';
import { IPaymentsServiceConfig } from './payments-service.types';

export const paymentsServiceConfig = registerAs(
  'paymentsServiceConfig',
  (): IPaymentsServiceConfig => ({
    paymentsGrpcUrl: process.env.PAYMENTS_GRPC_URL ?? 'localhost:5021',
    paymentsGrpcBindUrl: process.env.PAYMENTS_GRPC_BIND_URL ?? '0.0.0.0:5021',
    paymentsGrpcTimeoutMs: Number(process.env.PAYMENTS_RPC_TIMEOUT_MS ?? 2500),
  }),
);
