import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { type AuthUser } from './types';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthThrottle } from '../common/decorators';
import { buildAuditRequestContext } from '../common/audit';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @AuthThrottle()
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Request & { requestId?: string },
  ): Promise<{ accessToken: string }> {
    return this.authService.login(loginDto, buildAuditRequestContext(req));
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req: Request & { user: AuthUser }): AuthUser {
    return req.user;
  }
}
