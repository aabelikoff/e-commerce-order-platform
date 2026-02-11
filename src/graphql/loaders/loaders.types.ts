import DataLoader from 'dataloader';
import { User, Product, OrderItem } from '../../database/entities';

export type GraphQLLoaders = {
  productByIdLoader: DataLoader<string, Product | null>;
  userByIdLoader: DataLoader<string, User | null>;
  orderItemByOrderIdLoader: DataLoader<string, OrderItem[]>;
};

export type GraphQLContext = {
  req: any;
  loaders: GraphQLLoaders;
};
