import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MinLength,
  IsEmail,
  IsOptional,
} from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({ description: 'First name', type: 'string' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  firstName?: string;

  @ApiPropertyOptional({ description: 'Last name', type: 'string' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  lastName?: string;

  @ApiPropertyOptional({ description: 'Email', type: 'string' })
  @IsOptional()
  @IsEmail()
  email?: string;
}
