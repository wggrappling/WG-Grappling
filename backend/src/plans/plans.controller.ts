import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';
import { PlansService } from './plans.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../../generated/prisma/enums';
import { Audit } from '../audit/audit.decorator';

@ApiTags('Plans')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.RECEPTION)
  @ApiOperation({ summary: 'Listar todos os planos' })
  @ApiResponse({ status: 200, description: 'Lista de planos retornada com sucesso.' })
  findAll() {
    return this.plansService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.RECEPTION)
  @ApiOperation({ summary: 'Buscar plano por ID' })
  @ApiParam({ name: 'id', description: 'ID do plano' })
  @ApiResponse({ status: 200, description: 'Plano retornado com sucesso.' })
  findOne(@Param('id') id: string) {
    return this.plansService.findOne(Number(id));
  }

  @Post()
  @Audit({ action: 'CREATE', entity: 'Plan' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Criar novo plano' })
  @ApiBody({ type: CreatePlanDto })
  @ApiResponse({ status: 201, description: 'Plano criado com sucesso.' })
  create(@Body() createPlanDto: CreatePlanDto) {
    return this.plansService.create(createPlanDto);
  }

  @Patch(':id')
  @Audit({ action: 'UPDATE', entity: 'Plan', entityIdParam: 'id' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Atualizar plano' })
  @ApiParam({ name: 'id', description: 'ID do plano' })
  @ApiBody({ type: UpdatePlanDto })
  @ApiResponse({ status: 200, description: 'Plano atualizado com sucesso.' })
  update(@Param('id') id: string, @Body() updatePlanDto: UpdatePlanDto) {
    return this.plansService.update(Number(id), updatePlanDto);
  }

  @Delete(':id')
  @Audit({ action: 'DELETE', entity: 'Plan', entityIdParam: 'id' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Remover plano' })
  @ApiParam({ name: 'id', description: 'ID do plano' })
  @ApiResponse({ status: 200, description: 'Plano removido com sucesso.' })
  remove(@Param('id') id: string) {
    return this.plansService.remove(Number(id));
  }
}
