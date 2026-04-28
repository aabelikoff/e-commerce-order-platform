import { ApiProperty } from '@nestjs/swagger';

export class LoginResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken!: string;
}

export class AuthUserResponseDto {
  @ApiProperty({ example: '5b9d9f34-6d73-4f2a-a933-7ec49d4c650a' })
  sub!: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  email!: string;

  @ApiProperty({ example: ['user'] })
  roles!: string[];

  @ApiProperty({ example: ['order:read', 'order:write'] })
  scopes!: string[];
}
