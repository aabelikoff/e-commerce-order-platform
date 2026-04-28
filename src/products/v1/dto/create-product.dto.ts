import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsNumberString,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'Mechanical Keyboard RGB' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiProperty({ example: '129.99' })
  @IsNumberString()
  price!: string;

  @ApiProperty({
    example: 'Mechanical keyboard with RGB backlight and tactile switches',
  })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({ example: 75, minimum: 0 })
  @IsInt()
  @Min(0)
  stock!: number;
}
