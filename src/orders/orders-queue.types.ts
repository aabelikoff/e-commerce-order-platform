export interface OrdersProcessMessage {
  messageId: string;
  orderId: string;
  createdAt: string;
  attempt: number;
  simulate?: 'alwaysFail';
}

export interface OrdersDlqMessage extends OrdersProcessMessage {
  failedAt: string;
  errorReason: string;
}
