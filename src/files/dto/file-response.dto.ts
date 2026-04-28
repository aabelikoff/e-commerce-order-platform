import { ApiProperty } from '@nestjs/swagger';
import {
  EFileOwnerType,
  EFileStatus,
  EFileVisibility,
} from 'src/database/entities/file-record.entity';

export class PresignedUploadResponseDto {
  @ApiProperty({ example: '9ac42c67-2d7e-4898-91dd-d2e31fd80503' })
  fileId!: string;

  @ApiProperty({ example: 'user/123/avatar-9ac42c67.jpg' })
  key!: string;

  @ApiProperty({ example: 'https://storage.example.com/presigned-upload-url' })
  uploadUrl!: string;

  @ApiProperty({ example: 'image/jpeg' })
  contentType!: string;
}

export class FileResponseDto {
  @ApiProperty({ example: '9ac42c67-2d7e-4898-91dd-d2e31fd80503' })
  id!: string;

  @ApiProperty({ enum: EFileOwnerType, example: EFileOwnerType.USER })
  ownerType!: EFileOwnerType;

  @ApiProperty({ example: '5b9d9f34-6d73-4f2a-a933-7ec49d4c650a' })
  ownerId!: string;

  @ApiProperty({ enum: EFileStatus, example: EFileStatus.READY })
  status!: EFileStatus;

  @ApiProperty({ enum: EFileVisibility, example: EFileVisibility.PRIVATE })
  visibility!: EFileVisibility;

  @ApiProperty({ example: 'image/jpeg' })
  mimeType!: string;

  @ApiProperty({ example: '245678' })
  size!: string;

  @ApiProperty({ example: 'avatar.jpg' })
  originalName!: string;

  @ApiProperty({ example: 'https://storage.example.com/files/avatar.jpg' })
  url!: string;
}
