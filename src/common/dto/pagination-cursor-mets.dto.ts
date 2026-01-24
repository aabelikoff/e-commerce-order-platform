import { ApiProperty } from '@nestjs/swagger';

export class PaginationCursorMetaDto {
  @ApiProperty({ description: 'Next cursor' })
  nextCursor: string | null;

  @ApiProperty({ description: 'Previouts cursor', required: false })
  prevCursor?: string;

  @ApiProperty({ description: 'Has next flag' })
  hasNext: boolean;
}
