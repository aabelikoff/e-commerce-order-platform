import DataLoader from 'dataloader';
import { User, Product, Order, OrderItem, Payment } from '../../database/entities';


export type AppLoaders = {
  userByIdLoader: DataLoader<string, User | null>;
  productByIdLoader: DataLoader<string, Product | null>;
  orderItemsByOrderIdLoader: DataLoader<string, OrderItem[]>;
  paymentsByOrderIdLoader: DataLoader<string, Payment[]>;
};

export type GraphQLContext = {
  loaders: AppLoaders;
};