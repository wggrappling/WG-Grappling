import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../users/users.service';
import { ConfigService } from '@nestjs/config';

type JwtPayload = {
  sub: number;
  email: string;
  role: string;
  sessionVersion: number;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly usersService: UsersService, config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.usersService.findForAuthentication(payload.sub);
    const validSession = user
      && user.active
      && Number.isInteger(payload.sessionVersion)
      && payload.sessionVersion === user.sessionVersion
      && payload.role === user.role;
    if (!validSession) throw new UnauthorizedException('Sessão inválida.');
    const { sessionVersion: _sessionVersion, ...safeUser } = user;
    return safeUser;
  }
}
