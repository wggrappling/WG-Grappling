import { Controller, Post, Body, Get, Request, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags, ApiOkResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Audit } from '../audit/audit.decorator';

@ApiTags('Autenticação')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
  async login(@Body() body: LoginDto) {
    const user = await this.authService.validateUser(body.email, body.password);
    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }
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
