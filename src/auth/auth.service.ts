import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from 'src/database/entities';
import { AuthUser, JwtAccessPayload } from './types';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  private async validateUser(
    email: string,
    password: string,
  ): Promise<AuthUser> {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email })
      .getOne();

    if (!user?.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (!isValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const safeUser: AuthUser = {
      sub: user.id,
      email: user.email,
      roles: user.roles ?? [],
      scopes: user.scopes ?? [],
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

  async login(dto: LoginDto): Promise<{ accessToken: string }> {
    const { email, password } = dto;

    const user = await this.validateUser(email, password);

    return this.signAccessToken(user);
  }
}
