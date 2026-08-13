import { Body, Controller, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { UserRole } from '../../generated/prisma/enums';
import { Audit } from '../audit/audit.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateGraduationDto, UpdateGraduationDto } from './dto/graduation.dto';
import { GraduationService } from './graduation.service';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class GraduationController {
  constructor(private readonly service: GraduationService) {}

  @Get('students/:id/graduations')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.RECEPTION, UserRole.TEACHER)
  list(@Param('id') id: string, @Request() request: any) {
    return this.service.findAll(Number(id), request.user);
  }

  @Post('students/:id/graduations')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Audit({ action: 'CREATE', entity: 'Graduation' })
  create(@Param('id') id: string, @Body() dto: CreateGraduationDto, @Request() request: any) {
    return this.service.create(Number(id), dto, request.user);
  }

  @Patch('graduations/:id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Audit({ action: 'UPDATE', entity: 'Graduation', entityIdParam: 'id' })
  update(@Param('id') id: string, @Body() dto: UpdateGraduationDto) {
    return this.service.update(Number(id), dto);
  }
}
