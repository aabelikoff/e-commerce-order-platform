import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { JwtAccessPayload, AuthUser } from './types';
import { PassportStrategy } from '@nestjs/passport';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('auth.jwtAccessSecret'),
    });
  }
  validate(payload: JwtAccessPayload): AuthUser {
    return {
      sub: payload.sub,
      email: payload.email,
      roles: payload.roles,
      scopes: payload.scopes,
    };
  }
}
