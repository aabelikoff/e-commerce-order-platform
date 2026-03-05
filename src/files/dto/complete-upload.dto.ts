import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CompleteUploadDto {
  @ApiProperty({
    type: 'string',
    description: 'presaved file id',
    example: '4444444-4444-5555-66545646',
  })
  @IsUUID()
  fileId: string;
}
