import { PaginationCursorMetaDto } from './pagination-cursor-meta.dto';
import { PaginationOffsetMetaDto } from 'src/common/dto/pagination-offset-meta.dto';

export interface ResponseListDto<T> {
  items: T[];
  pagination: PaginationCursorMetaDto | PaginationOffsetMetaDto;
}
