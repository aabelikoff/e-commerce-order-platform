import { registerEnumType } from '@nestjs/graphql';
import { EOrderStatus } from 'src/database/entities';

registerEnumType(EOrderStatus, { name: 'EOrderStatus' });
export { EOrderStatus };
