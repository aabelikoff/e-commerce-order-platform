import { Transform } from 'class-transformer';
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail()
  @IsString()
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @IsString()
  password: string;
}
