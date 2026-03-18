import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ description: 'First name' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  firstName: string;

  @ApiProperty({ description: 'Last name' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  lastName: string;

  @ApiProperty({ description: 'Email' })
  @IsEmail()
  @Transform(({ value }) => value.toLowerCase().trim())
  email: string;

  @ApiProperty({ description: 'Password' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @Transform(({ value }) => value.trim())
  password: string;
}
