import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '../../generated/prisma/enums';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AuthenticatedContext } from './context/authenticated-context.decorator';
import type { AuthenticatedUserContext } from './context/authenticated-user-context';
import { StudentContextGuard } from './context/student-context.guard';
import { MeProjectionDto } from './dto/me-projection.dto';
import { SelfProfileProjectionDto } from './dto/self-profile-projection.dto';
import { MeService } from './me.service';

@ApiTags('Self-Service')
@ApiBearerAuth('access-token')
@Controller('me')
@UseGuards(JwtAuthGuard, RolesGuard, StudentContextGuard)
@Roles(UserRole.ALUNO)
export class MeController {
  constructor(private readonly meService: MeService) {}

  @Get()
  @ApiOkResponse({ type: MeProjectionDto })
  getMe(@AuthenticatedContext() context: AuthenticatedUserContext) {
    return this.meService.getMe(context);
  }

  @Get('profile')
  @ApiOkResponse({ type: SelfProfileProjectionDto })
  getProfile(@AuthenticatedContext() context: AuthenticatedUserContext) {
    return this.meService.getProfile(context);
  }
}
