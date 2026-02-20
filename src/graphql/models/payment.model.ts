import { Field, GraphQLISODateTime, ID, ObjectType } from '@nestjs/graphql';
import { EPaymentStatus } from 'src/database/entities';

@ObjectType()
export class PaymentModel {
  @Field(() => ID, { description: 'Unique identifier of the payment (UUID)' })
  id: string;

  @Field(() => EPaymentStatus, {
    description:
      'Current status of the payment (UNPAID, PENDING, PAID, FAILED, REFUNDED)',
  })
  status: EPaymentStatus;

  @Field(() => GraphQLISODateTime, {
    nullable: true,
    description: 'Timestamp when the payment was made',
  })
  paidAt: Date | null;

  @Field(() => String, {
    description:
      'Amount paid for the order, represented as a string to preserve precision',
  })
  paidAmount: string;

  @Field(() => GraphQLISODateTime, {
    description: 'Timestamp when the payment record was created',
  })
  createdAt: Date;

  @Field(() => GraphQLISODateTime, {
    description: 'Timestamp when the payment record was last updated',
  })
  updatedAt: Date;
}
