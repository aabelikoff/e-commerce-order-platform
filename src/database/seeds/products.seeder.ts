import { Seeder } from 'typeorm-extension';
import { DataSource } from 'typeorm';
import { Product } from '../entities';

export default class ProductsSeed implements Seeder {
  public async run(dataSource: DataSource) {
    const repo = dataSource.getRepository(Product);
    console.log('ProductsSeed started...');
    for (let product of seedProducts) {
      if (await repo.findOne({ where: { name: product.name } })) continue;
      await repo.insert(product);
    }
  }
}

const seedProducts = [
  {
    name: 'Wireless Bluetooth Headphones',
    price: '79.99',
    description:
      'Premium noise-cancelling over-ear headphones with 30-hour battery life. Features adaptive sound control and crystal-clear audio quality for music lovers and professionals.',
    stock: '150',
  },
  {
    name: 'Ergonomic Gaming Mouse',
    price: '49.99',
    description:
      'High-precision optical gaming mouse with customizable RGB lighting and 7 programmable buttons. Designed for comfort during extended gaming sessions with adjustable DPI settings up to 16000.',
    stock: '200',
  },
  {
    name: 'Stainless Steel Water Bottle',
    price: '24.99',
    description:
      'Double-wall vacuum insulated water bottle that keeps drinks cold for 24 hours or hot for 12 hours. BPA-free, leak-proof design with wide mouth for easy cleaning. 32oz capacity.',
    stock: '500',
  },
  {
    name: 'Mechanical Keyboard RGB',
    price: '129.99',
    description:
      'Full-size mechanical keyboard with hot-swappable switches and per-key RGB backlighting. Features aluminum frame, detachable USB-C cable, and dedicated media controls for ultimate typing experience.',
    stock: '75',
  },
  {
    name: 'Portable Phone Charger 20000mAh',
    price: '34.99',
    description:
      'Ultra-high capacity power bank with dual USB ports and USB-C PD fast charging. Can charge most smartphones 4-6 times. LED display shows remaining battery percentage. Perfect for travel and emergencies.',
    stock: '300',
  },
];
