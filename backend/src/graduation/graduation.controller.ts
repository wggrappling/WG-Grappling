import { Body, Controller, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { UserRole } from '../../generated/prisma/enums';
import { Audit } from '../audit/audit.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CancelGraduationDto, CreateGraduationDto, UpdateGraduationDto } from './dto/graduation.dto';
import { GraduationService } from './graduation.service';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class GraduationController {
  constructor(private readonly service: GraduationService) {}

  @Get('graduations/available')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.RECEPTION, UserRole.TEACHER)
  available(@Query('modalityId') modalityId?: string) {
    return this.service.findAvailable(modalityId ? Number(modalityId) : undefined);
  }

  @Get('students/:id/graduations')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.RECEPTION, UserRole.TEACHER)
  list(@Param('id') id: string, @Request() request: any) {
    return this.service.findAll(Number(id), request.user);
  }

  @Get('students/:id/graduations/current')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.RECEPTION, UserRole.TEACHER)
  current(@Param('id') id: string, @Request() request: any) {
    return this.service.findCurrent(Number(id), request.user);
  }

  @Post('students/:id/graduations')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.TEACHER)
  @Audit({ action: 'CREATE', entity: 'Graduation' })
  create(@Param('id') id: string, @Body() dto: CreateGraduationDto, @Request() request: any) {
    return this.service.create(Number(id), dto, request.user);
  }

  @Patch('graduations/:id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Audit({ action: 'UPDATE', entity: 'Graduation', entityIdParam: 'id' })
  update(@Param('id') id: string, @Body() dto: UpdateGraduationDto, @Request() request: any) {
    return this.service.update(Number(id), dto, request.user);
  }

  @Post('graduations/:id/cancel')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Audit({ action: 'CANCEL', entity: 'Graduation', entityIdParam: 'id' })
  cancel(@Param('id') id: string, @Body() dto: CancelGraduationDto, @Request() request: any) {
    return this.service.cancel(Number(id), dto, request.user);
  }
}
