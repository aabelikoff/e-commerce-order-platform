import { EPaymentStatus } from '../database/entities';
import { PaymentStatus } from '../generated/payments/v1/payments';

export const toProtoStatus = (dbStatus: EPaymentStatus): PaymentStatus => {
  switch (dbStatus) {
    case EPaymentStatus.PENDING: {
      return PaymentStatus.PAYMENT_STATUS_AUTHORIZED;
    }
    case EPaymentStatus.PAID: {
      return PaymentStatus.PAYMENT_STATUS_CAPTURED;
    }
    case EPaymentStatus.FAILED: {
      return PaymentStatus.PAYMENT_STATUS_FAILED;
    }
    case EPaymentStatus.REFUNDED: {
      return PaymentStatus.PAYMENT_STATUS_REFUNDED;
    }
    case EPaymentStatus.UNPAID: {
      return PaymentStatus.PAYMENT_STATUS_UNSPECIFIED;
    }
    default: {
      throw new Error('Unknown payment status for Payment entity');
    }
  }
};

export const toDbStatus = (protoStatus: PaymentStatus): EPaymentStatus => {
  switch (protoStatus) {
    case PaymentStatus.PAYMENT_STATUS_AUTHORIZED: {
      return EPaymentStatus.PENDING;
    }
    case PaymentStatus.PAYMENT_STATUS_CAPTURED: {
      return EPaymentStatus.PAID;
    }
    case PaymentStatus.PAYMENT_STATUS_FAILED: {
      return EPaymentStatus.FAILED;
    }
    case PaymentStatus.PAYMENT_STATUS_REFUNDED: {
      return EPaymentStatus.REFUNDED;
    }
    case PaymentStatus.PAYMENT_STATUS_UNSPECIFIED: {
      return EPaymentStatus.UNPAID;
    }
    default: {
      throw new Error('Unknown payment status for Payment entity');
    }
  }
};
