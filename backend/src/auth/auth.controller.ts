import { Controller, Post, Body, Get, Request, UnauthorizedException, UseGuards } from '@nestjs/common';
import type { Request as ExpressRequest } from 'express';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags, ApiOkResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Audit } from '../audit/audit.decorator';
import { AuditService } from '../audit/audit.service';
import { LoginRateLimitService } from './login-rate-limit.service';
import { LoginRateLimitedException } from './login-rate-limit.service';
import { resolveLoginClientIp } from './client-ip';

@ApiTags('Autenticação')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly auditService: AuditService,
    private readonly loginRateLimit: LoginRateLimitService,
  ) {}

  @Post('login')
  @Audit({ action: 'LOGIN_SUCCESS', entity: 'User' })
  @ApiOperation({ summary: 'Login de usuário' })
  @ApiBody({ type: LoginDto, description: 'Credenciais para autenticação' })
  @ApiOkResponse({
    description: 'Token JWT e usuário',
    schema: {
      example: {
        access_token: 'eyJhbGciOi...',
        user: { id: 1, name: 'Fulano', email: 'usuario@wg.com', role: 'ADMIN', active: true },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas.' })
  @ApiResponse({ status: 429, description: 'Muitas tentativas. Tente novamente mais tarde.' })
  async login(@Body() body: LoginDto, @Request() request: ExpressRequest) {
    const clientIp = resolveLoginClientIp(request);
    const accountKey = this.loginRateLimit.accountKey(body.email);
    try {
      await this.loginRateLimit.consumeAttempt(clientIp, accountKey);
    } catch (error) {
      if (error instanceof LoginRateLimitedException) {
        await this.auditService.record({
          action: 'LOGIN_RATE_LIMITED',
          entity: 'User',
          metadata: {
            identifierHash: accountKey,
            ipIdentifierHash: this.loginRateLimit.ipKey(clientIp),
            reason: 'RATE_LIMITED',
          },
        });
      }
      throw error;
    }
    const user = await this.authService.validateUser(body.email, body.password);
    if (!user) {
      await this.auditService.record({
        action: 'LOGIN_FAILED',
        entity: 'User',
        metadata: { identifierHash: accountKey, reason: 'INVALID_CREDENTIALS' },
      });
      throw new UnauthorizedException('Credenciais inválidas');
    }
    await this.loginRateLimit.resetAccount(accountKey);
    return this.authService.login(user);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Rota de teste protegida' })
  @ApiOkResponse({ description: 'Retorna os dados do usuário autenticado.' })
  @Get('me')
  profile(@Request() req: any) {
    return req.user;
  }
}
