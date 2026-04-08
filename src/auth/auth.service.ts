import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from 'src/database/entities';
import { AuthUser, JwtAccessPayload } from './types';
import { LoginDto } from './dto/login.dto';
import { checkArrayToEnum } from 'src/common/utils/chek-array-to-enum.utils';
import { EUnitedScopes } from './access/scopes';
import { ERoles } from './access/roles';
import {
  AuditAction,
  AuditRequestContext,
  AuditService,
} from 'src/common/audit';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    private jwtService: JwtService,
    private readonly auditService: AuditService,
  ) {}

  private async validateUser(
    email: string,
    password: string,
    request?: AuditRequestContext,
  ): Promise<AuthUser> {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email })
      .getOne();

    if (!user?.passwordHash) {
      this.auditService.recordWithRequest(
        {
          action: AuditAction.AuthLoginFailed,
          actor: {
            id: 'anonymous',
            roles: ['anonymous'],
          },
          targetType: 'auth_identity',
          targetId: 'unknown',
          outcome: 'failure',
          reason: 'invalid_credentials',
        },
        request,
      );
      throw new UnauthorizedException('Invalid email or password');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (!isValid) {
      this.auditService.recordWithRequest(
        {
          action: AuditAction.AuthLoginFailed,
          actor: {
            id: user.id,
            roles: user.roles ?? [],
            scopes: user.scopes ?? [],
          },
          targetType: 'user',
          targetId: user.id,
          outcome: 'failure',
          reason: 'invalid_credentials',
        },
        request,
      );
      throw new UnauthorizedException('Invalid email or password');
    }

    const rawRoles = user.roles ?? [];
    const rawScopes = user.scopes ?? [];
    const roles = checkArrayToEnum(rawRoles, ERoles)
      ? rawRoles
      : [];
    const scopes = checkArrayToEnum(rawScopes, EUnitedScopes)
      ? rawScopes
      : [];

    const safeUser: AuthUser = {
      sub: user.id,
      email: user.email,
      roles,
      scopes,
    };

    return safeUser;
  }

  private signAccessToken(user: AuthUser): {
    accessToken: string;
  } {
    const payload: JwtAccessPayload = {
      sub: user.sub,
      email: user.email,
      roles: user.roles ?? [],
      scopes: user.scopes ?? [],
    };

    const accessToken = this.jwtService.sign(payload);

    return { accessToken };
  }

  async login(
    dto: LoginDto,
    request?: AuditRequestContext,
  ): Promise<{ accessToken: string }> {
    const { email, password } = dto;

    const user = await this.validateUser(email, password, request);

    return this.signAccessToken(user);
  }
}
