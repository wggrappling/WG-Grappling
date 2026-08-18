import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ResponsibleService } from './responsible.service';
import { CreateResponsibleDto } from './dto/create-responsible.dto';
import { UpdateResponsibleDto } from './dto/update-responsible.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../../generated/prisma/enums';
import { Audit } from '../audit/audit.decorator';

@ApiTags('Responsible')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.ADMIN)
@Controller('responsible')
export class ResponsibleController {
  constructor(private readonly responsibleService: ResponsibleService) {}

  @Get()
  @ApiOperation({ summary: 'Listar responsáveis' })
  @ApiResponse({ status: 200, description: 'Lista de responsáveis retornada com sucesso.' })
  findAll() {
    return this.responsibleService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar responsável por ID' })
  @ApiParam({ name: 'id', description: 'ID do responsável' })
  @ApiResponse({ status: 200, description: 'Responsável retornado com sucesso.' })
  findOne(@Param('id') id: string) {
    return this.responsibleService.findOne(Number(id));
  }

  @Post()
  @Audit({ action: 'CREATE', entity: 'Responsible' })
  @ApiOperation({ summary: 'Criar responsável' })
  @ApiBody({ type: CreateResponsibleDto })
  @ApiResponse({ status: 201, description: 'Responsável criado com sucesso.' })
  create(@Body() createResponsibleDto: CreateResponsibleDto) {
    return this.responsibleService.create(createResponsibleDto);
  }

  @Patch(':id')
  @Audit({ action: 'UPDATE', entity: 'Responsible', entityIdParam: 'id' })
  @ApiOperation({ summary: 'Atualizar responsável' })
  @ApiParam({ name: 'id', description: 'ID do responsável' })
  @ApiBody({ type: UpdateResponsibleDto })
  @ApiResponse({ status: 200, description: 'Responsável atualizado com sucesso.' })
  update(@Param('id') id: string, @Body() updateResponsibleDto: UpdateResponsibleDto) {
    return this.responsibleService.update(Number(id), updateResponsibleDto);
  }

  @Delete(':id')
  @Audit({ action: 'DELETE', entity: 'Responsible', entityIdParam: 'id' })
  @ApiOperation({ summary: 'Remover responsável' })
  @ApiParam({ name: 'id', description: 'ID do responsável' })
  @ApiResponse({ status: 200, description: 'Responsável removido com sucesso.' })
  remove(@Param('id') id: string) {
    return this.responsibleService.remove(Number(id));
  }
}
