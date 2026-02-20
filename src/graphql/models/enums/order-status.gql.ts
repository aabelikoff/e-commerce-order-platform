import { registerEnumType } from '@nestjs/graphql';
import { EPaymentStatus, EOrderStatus } from '../../../database/entities';

registerEnumType(EOrderStatus, { name: 'EOrderStatus' });
export { EOrderStatus };
    
registerEnumType(EPaymentStatus, { name: 'EPaymentStatus' });
export { EPaymentStatus };
