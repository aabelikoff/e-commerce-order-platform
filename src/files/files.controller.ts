import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import {
  EOrderScopes,
  EPaymentScopes,
  EProductScopes,
  EUserScopes,
} from 'src/auth/access/scopes';
import { ERoles } from 'src/auth/access/roles';
import { AuthUser } from 'src/auth/types';
import { Scopes, Roles } from 'src/auth/decorators';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { AccessGuard } from 'src/auth/guards/access.guard';
import { PresignFileDto } from './dto/presign-file.dto';
import { FilesService } from './files.service';
import { CompleteUploadDto } from './dto/complete-upload.dto';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  FileResponseDto,
  PresignedUploadResponseDto,
} from './dto/file-response.dto';

@UseGuards(JwtAuthGuard, AccessGuard)
@Controller('files')
@Roles(ERoles.ADMIN, ERoles.SUPPORT, ERoles.USER)
@ApiTags('files')
@ApiBearerAuth()
@Scopes(
  EUserScopes.USER_WRITE,
  EProductScopes.PRODUCT_WRITE,
  EOrderScopes.ORDER_WRITE,
  EPaymentScopes.PAYMENT_WRITE,
)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}
  @Post('presign')
  @ApiOperation({ summary: 'Create a presigned upload URL for a file' })
  @ApiOkResponse({ type: PresignedUploadResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token' })
  @ApiForbiddenResponse({ description: 'Insufficient scope or role' })
  async presign(
    @Req() req: Request & { user: AuthUser },
    @Body() dto: PresignFileDto,
  ) {
    return await this.filesService.createPresignedUpload(req.user, dto);
  }

  @Post('complete')
  @ApiOperation({ summary: 'Complete a previously presigned upload' })
  @ApiOkResponse({ type: FileResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token' })
  @ApiForbiddenResponse({ description: 'Insufficient scope or role' })
  @ApiNotFoundResponse({ description: 'File not found' })
  async complete(
    @Req() req: Request & { user: AuthUser },
    @Body() dto: CompleteUploadDto,
  ) {
    return await this.filesService.completeUpload(req.user, dto);
  }

  @Scopes(
    EUserScopes.USER_READ,
    EProductScopes.PRODUCT_READ,
    EOrderScopes.ORDER_READ,
    EPaymentScopes.PAYMENT_READ,
  )
  @Get(':id')
  @ApiOperation({ summary: 'Get file metadata and public view by id' })
  @ApiParam({ name: 'id', description: 'File id (UUID)' })
  @ApiOkResponse({ type: FileResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid bearer token' })
  @ApiForbiddenResponse({ description: 'Insufficient scope or role' })
  @ApiNotFoundResponse({ description: 'File not found' })
  async getById(
    @Req() req: Request & { user: AuthUser },
    @Param('id') id: string,
  ) {
    return await this.filesService.getFileById(req.user, id);
  }
}
