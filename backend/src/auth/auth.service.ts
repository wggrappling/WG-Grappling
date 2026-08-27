import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { verifyPassword } from './password-hashing';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) return null;
    if (!user.active) return null;

    const verification = await verifyPassword(password, user.password);
    if (!verification.valid) return null;
    if (verification.rehashFailed) {
      this.logger.warn('Falha ao gerar rehash seguro da credencial.');
    } else if (verification.rehash) {
      try {
        await this.usersService.upgradePasswordHash(user.id, user.password, verification.rehash);
      } catch {
        this.logger.warn('Falha ao persistir rehash seguro da credencial.');
      }
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active,
      sessionVersion: user.sessionVersion,
      createdAt: user.createdAt,
    };
  }

  async login(user: any) {
    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role,
      sessionVersion: user.sessionVersion,
    };
    const access_token = this.jwtService.sign(payload);
    const publicUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active,
      createdAt: user.createdAt,
    };

    return {
      access_token,
      user: publicUser,
    };
  }
}
