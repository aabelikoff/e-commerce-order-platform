import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ProductsService } from '../products.service';
import { FindProductsQueryDto } from './dto/find-products.query.dto';
import { Product } from 'src/database/entities';
import { ResponseListDto } from 'src/common/dto/response-list.dto';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ProductsListResponseDto } from './dto/product-response.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { AccessGuard } from 'src/auth/guards/access.guard';
import { Roles, Scopes } from 'src/auth/decorators';
import { ERoles } from 'src/auth/access/roles';
import { EProductScopes } from 'src/auth/access/scopes';
import { ProductResponseDto } from './dto/product-response.dto';

@Controller('products')
@ApiTags('products')
export class ProductsV1Controller {
  constructor(private readonly productService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Search and list products' })
  @ApiOkResponse({ type: ProductsListResponseDto })
  async findProducts(
    @Query() query: FindProductsQueryDto,
  ): Promise<ResponseListDto<Product>> {
    return await this.productService.findProducts(query);
  }

  @UseGuards(JwtAuthGuard, AccessGuard)
  @Roles(ERoles.ADMIN, ERoles.SUPPORT)
  @Scopes(EProductScopes.PRODUCT_WRITE)
  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create product (admin/support)' })
  @ApiCreatedResponse({ type: ProductResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token' })
  @ApiForbiddenResponse({ description: 'Insufficient scope or role' })
  async createProduct(@Body() dto: CreateProductDto): Promise<Product> {
    return this.productService.createProduct(dto);
  }

  @UseGuards(JwtAuthGuard, AccessGuard)
  @Roles(ERoles.ADMIN, ERoles.SUPPORT)
  @Scopes(EProductScopes.PRODUCT_WRITE)
  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update product (admin/support)' })
  @ApiParam({ name: 'id', description: 'Product id (UUID)' })
  @ApiOkResponse({ type: ProductResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token' })
  @ApiForbiddenResponse({ description: 'Insufficient scope or role' })
  @ApiNotFoundResponse({ description: 'Product not found' })
  async updateProduct(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ): Promise<Product> {
    return this.productService.updateProduct(id, dto);
  }
}
