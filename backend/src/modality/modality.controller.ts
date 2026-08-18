import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';
import { ModalityService } from './modality.service';
import { CreateModalityDto } from './dto/create-modality.dto';
import { UpdateModalityDto } from './dto/update-modality.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../../generated/prisma/enums';
import { Audit } from '../audit/audit.decorator';

@ApiTags('Modality')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('modality')
export class ModalityController {
  constructor(private readonly modalityService: ModalityService) {}

  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.RECEPTION, UserRole.TEACHER)
  @ApiOperation({ summary: 'Listar todas as modalidades' })
  @ApiResponse({ status: 200, description: 'Lista de modalidades retornada com sucesso.' })
  findAll() {
    return this.modalityService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.RECEPTION, UserRole.TEACHER)
  @ApiOperation({ summary: 'Buscar modalidade por ID' })
  @ApiParam({ name: 'id', description: 'ID da modalidade' })
  @ApiResponse({ status: 200, description: 'Modalidade retornada com sucesso.' })
  findOne(@Param('id') id: string) {
    return this.modalityService.findOne(Number(id));
  }

  @Post()
  @Audit({ action: 'CREATE', entity: 'Modality' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Criar nova modalidade' })
  @ApiBody({ type: CreateModalityDto })
  @ApiResponse({ status: 201, description: 'Modalidade criada com sucesso.' })
  create(@Body() createModalityDto: CreateModalityDto) {
    return this.modalityService.create(createModalityDto);
  }

  @Patch(':id')
  @Audit({ action: 'UPDATE', entity: 'Modality', entityIdParam: 'id' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Atualizar modalidade' })
  @ApiParam({ name: 'id', description: 'ID da modalidade' })
  @ApiBody({ type: UpdateModalityDto })
  @ApiResponse({ status: 200, description: 'Modalidade atualizada com sucesso.' })
  update(@Param('id') id: string, @Body() updateModalityDto: UpdateModalityDto) {
    return this.modalityService.update(Number(id), updateModalityDto);
  }

  @Delete(':id')
  @Audit({ action: 'DELETE', entity: 'Modality', entityIdParam: 'id' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Remover modalidade' })
  @ApiParam({ name: 'id', description: 'ID da modalidade' })
  @ApiResponse({ status: 200, description: 'Modalidade removida com sucesso.' })
  remove(@Param('id') id: string) {
    return this.modalityService.remove(Number(id));
  }
}
