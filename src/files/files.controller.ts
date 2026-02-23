import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
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

@UseGuards(JwtAuthGuard, AccessGuard)
@Controller('files')
@Roles(ERoles.ADMIN, ERoles.SUPPORT, ERoles.USER)
@Scopes(
  EUserScopes.USER_WRITE,
  EProductScopes.PRODUCT_WRITE,
  EOrderScopes.ORDER_WRITE,
  EPaymentScopes.PAYMENT_WRITE,
)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}
  @Post('presign')
  async presign(
    @Req() req: Request & { user: AuthUser },
    @Body() dto: PresignFileDto,
  ) {
    return await this.filesService.createPresignedUpload(req.user, dto);
  }

  @Post('complete')
  async complete(
    @Req() req: Request & { user: AuthUser },
    @Body() dto: CompleteUploadDto,
  ) {
    return await this.filesService.completeUpload(req.user, dto);
  }
}
