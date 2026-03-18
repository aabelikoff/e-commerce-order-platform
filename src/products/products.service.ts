import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Product } from 'src/database/entities';
import { Repository } from 'typeorm';
import { FindProductsQueryDto } from './v1/dto/find-products.query.dto';
import { ResponseListDto } from 'src/common/dto/response-list.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepositoriy: Repository<Product>,
  ) {}

  async findProducts(
    query: FindProductsQueryDto,
  ): Promise<ResponseListDto<Product>> {
    console.log('Received query:', query);
    console.log('Fields type:', typeof query.fields);
    console.log('Fields value:', query.fields);

    const q = query.q?.trim();
    const sort = query.sort ?? 'createdAt';
    const order = (query.order ?? 'desc').toUpperCase() as 'ASC' | 'DESC';
    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;
    const fields = query.fields;

    const qb = this.productsRepositoriy.createQueryBuilder('p');

    const sortFieldMap: Record<string, string> = {
      price: 'price',
      createdAt: 'createdAt',
      name: 'name',
    };

    const allowedDirectFields = new Set([
      'id',
      'name',
      'price',
      'description',
      'stock',
      'createdAt',
      'updatedAt',
    ]);

    qb.select('p.id');
    if (fields && fields.length > 0) {
      const selectedFields = new Set<string>(['p.id', `p.${sort}`]);

      for (const field of fields) {
        if (field === 'items') {
          continue;
        }

        if (allowedDirectFields.has(field)) {
          selectedFields.add(`p.${field}`);
        }
      }

      if (selectedFields.size > 0) {
        qb.select(Array.from(selectedFields));
      }

      if (fields.includes('items')) {
        qb.leftJoin('p.items', 'items');
        qb.addSelect([
          'items.id',
          'items.quantity',
          'items.unitPrice',
          'items.discountAmount',
        ]);
      }
    } else {
      qb.select(Array.from(allowedDirectFields).map((field) => `p.${field}`));
    }

    if (q) {
      qb.andWhere('p.name ILIKE :q', { q: `%${q}%` });
    }

    const sortMap: Record<string, string> = {
      price: 'p.price',
      createdAt: 'p.createdAt',
      name: 'p.name',
    };

    qb.orderBy(sortMap[sort], order).take(limit).skip(offset);

    console.log(qb.getSql());
    console.log(qb.getParameters());

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      pagination: {
        total,
        limit,
        offset,
      },
    };
  }
}
