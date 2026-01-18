import { IsString, IsNotEmpty, MinLength, IsEmail } from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  firstName?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  lastName?: string;

  @IsEmail()
  email?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password?: string;
}
