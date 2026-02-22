import DataLoader from 'dataloader';
import {
  User,
  Product,
  Order,
  OrderItem,
  Payment,
} from '../../database/entities';
import { AuthUser } from '../../auth/types';

export type AppLoaders = {
  userByIdLoader: DataLoader<string, User | null>;
  productByIdLoader: DataLoader<string, Product | null>;
  orderItemsByOrderIdLoader: DataLoader<string, OrderItem[]>;
  paymentsByOrderIdLoader: DataLoader<string, Payment[]>;
};

export type GraphQLContext = {
  loaders: AppLoaders;
  req: Request & { user?: AuthUser };
};
