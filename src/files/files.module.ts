import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from 'src/database/entities/order.entity';
import { Payment } from 'src/database/entities/payment.entity';
import { Product } from 'src/database/entities/product.entity';
import { ProductImage } from 'src/database/entities/product-image.entity';
import { User } from 'src/database/entities/user.entity';
import { FileRecord } from 'src/database/entities/file-record.entity';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { S3Service } from './s3.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FileRecord,
      User,
      Product,
      ProductImage,
      Order,
      Payment,
    ]),
  ],
  controllers: [FilesController],
  providers: [FilesService, S3Service],
  exports: [FilesService],
})
export class FilesModule {}
