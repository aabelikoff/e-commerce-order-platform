import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Product } from 'src/database/entities';
import { Repository } from 'typeorm';
import { FindProductsQueryDto } from './v1/dto/find-products.query.dto';
import { ResponseListDto } from 'src/common/dto/response-list.dto';
import { paginateQueryBuilderByCursor } from 'src/common/pagination/cursor/paginate-query-builder';
import { CreateProductDto } from './v1/dto/create-product.dto';
import { UpdateProductDto } from './v1/dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
  ) {}

  async findProducts(
    query: FindProductsQueryDto,
  ): Promise<ResponseListDto<Product>> {
    const q = query.q?.trim();
    const fields = query.fields;

    const qb = this.productsRepository.createQueryBuilder('p');

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
      const selectedFields = new Set<string>(['p.id', 'p.createdAt']);

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

    qb.orderBy('p.createdAt', 'DESC').addOrderBy('p.id', 'DESC');

    return paginateQueryBuilderByCursor(qb, query, 'p');
  }

  async createProduct(dto: CreateProductDto): Promise<Product> {
    const product = this.productsRepository.create({
      name: dto.name.trim(),
      price: dto.price,
      description: dto.description.trim(),
      stock: String(dto.stock),
    });

    return this.productsRepository.save(product);
  }

  async updateProduct(id: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.productsRepository.findOne({ where: { id } });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (dto.name !== undefined) {
      product.name = dto.name.trim();
    }

    if (dto.price !== undefined) {
      product.price = dto.price;
    }

    if (dto.description !== undefined) {
      product.description = dto.description.trim();
    }

    if (dto.stock !== undefined) {
      product.stock = String(dto.stock);
    }

    return this.productsRepository.save(product);
  }
}
