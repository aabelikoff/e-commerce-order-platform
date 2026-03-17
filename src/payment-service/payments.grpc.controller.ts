import { Controller, Logger } from '@nestjs/common';
import { RpcException, GrpcMethod } from '@nestjs/microservices';
import { status as GrpcStatus } from '@grpc/grpc-js';
import { PaymentsService } from './payments.service';
import { PAYMENTS_SERVICE_NAME } from '../common/grpc/grpc.constants';
import {
  AuthorizeRequest,
  AuthorizeResponse,
  CaptureRequest,
  GetPaymentStatusRequest,
  GetPaymentStatusResponse,
  OperationResponse,
  RefundRequest,
} from '../generated/payments/v1/payments';

@Controller()
export class PaymentsGrpcController {
  private readonly logger = new Logger(PaymentsGrpcController.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  private mapError(error: unknown): RpcException {
    const message = error instanceof Error ? error.message : 'Internal error';
    const normalized = message.toLowerCase();

    if (
      normalized.includes('invalid') ||
      normalized.includes('empty') ||
      normalized.includes('cannot be')
    ) {
      return new RpcException({
        code: GrpcStatus.INVALID_ARGUMENT,
        message,
      });
    }

    if (
      normalized.includes('not found') ||
      normalized.includes('doesn`t exist')
    ) {
      return new RpcException({
        code: GrpcStatus.NOT_FOUND,
        message,
      });
    }

    return new RpcException({
      code: GrpcStatus.INTERNAL,
      message,
    });
  }

  @GrpcMethod(PAYMENTS_SERVICE_NAME, 'Authorize')
  async authorize(request: AuthorizeRequest): Promise<AuthorizeResponse> {
    try {
      return await this.paymentsService.authorize(request);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Internal error';
      this.logger.error(`Authorization failed: ${message}`);
      throw this.mapError(error);
    }
  }

  @GrpcMethod(PAYMENTS_SERVICE_NAME, 'GetPaymentStatus')
  async getPaymentStatus(
    request: GetPaymentStatusRequest,
  ): Promise<GetPaymentStatusResponse> {
    try {
      return await this.paymentsService.getPaymentStatus(request);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Internal error';
      this.logger.error(`Get payment status failed: ${message}`);
      throw this.mapError(error);
    }
  }

  @GrpcMethod(PAYMENTS_SERVICE_NAME, 'Capture')
  async capture(request: CaptureRequest): Promise<OperationResponse> {
    try {
      return await this.paymentsService.capture(request);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Internal error';
      this.logger.error(`Capture failed: ${message}`);
      throw this.mapError(error);
    }
  }

  @GrpcMethod(PAYMENTS_SERVICE_NAME, 'Refund')
  async refund(request: RefundRequest): Promise<OperationResponse> {
    try {
      return await this.paymentsService.refund(request);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Internal error';
      this.logger.error(`Refund failed: ${message}`);
      throw this.mapError(error);
    }
  }
}
