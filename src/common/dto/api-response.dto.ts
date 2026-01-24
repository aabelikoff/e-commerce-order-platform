import { ApiProperty } from '@nestjs/swagger';
import { ResponseMetaDto } from './response-meta.dto';


export class ApiResponseDto<T> {
  @ApiProperty({ description: 'The response data' })
  data: T;

  @ApiProperty({
    type: ResponseMetaDto,
    description: 'Metadata about the response',
  })
  meta: ResponseMetaDto;
}
