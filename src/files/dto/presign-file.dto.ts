import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsMimeType,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import {
  EFileOwnerType,
  EFileVisibility,
} from '../../database/entities/file-record.entity';

export class PresignFileDto {
  @ApiProperty({ enum: EFileOwnerType, example: EFileOwnerType.USER })
  @IsEnum(EFileOwnerType)
  ownerType: EFileOwnerType;

  @ApiProperty({ description: 'UUID of owner entity' })
  @IsUUID()
  ownerId: string;

  @ApiProperty({ example: 'image/jpeg' })
  @IsMimeType()
  contentType: string;

  @ApiProperty({ example: 245678, description: 'File size in bytes' })
  @IsInt()
  @Min(1)
  @Max(20 * 1024 * 1024)
  sizeBytes: number;

  @ApiProperty({ example: 'avatar.jpg', required: false })
  @IsOptional()
  @IsString()
  originalName?: string;

  @ApiProperty({
    enum: EFileVisibility,
    required: false,
    default: EFileVisibility.PRIVATE,
  })
  @IsOptional()
  @IsEnum(EFileVisibility)
  visibility?: EFileVisibility;
}

