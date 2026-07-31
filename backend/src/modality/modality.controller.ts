import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';
import { ModalityService } from './modality.service';
import { CreateModalityDto } from './dto/create-modality.dto';
import { UpdateModalityDto } from './dto/update-modality.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Modality')
@UseGuards(JwtAuthGuard)
@Controller('modality')
export class ModalityController {
  constructor(private readonly modalityService: ModalityService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todas as modalidades' })
  @ApiResponse({ status: 200, description: 'Lista de modalidades retornada com sucesso.' })
  findAll() {
    return this.modalityService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar modalidade por ID' })
  @ApiParam({ name: 'id', description: 'ID da modalidade' })
  @ApiResponse({ status: 200, description: 'Modalidade retornada com sucesso.' })
  findOne(@Param('id') id: string) {
    return this.modalityService.findOne(Number(id));
  }

  @Post()
  @ApiOperation({ summary: 'Criar nova modalidade' })
  @ApiBody({ type: CreateModalityDto })
  @ApiResponse({ status: 201, description: 'Modalidade criada com sucesso.' })
  create(@Body() createModalityDto: CreateModalityDto) {
    return this.modalityService.create(createModalityDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar modalidade' })
  @ApiParam({ name: 'id', description: 'ID da modalidade' })
  @ApiBody({ type: UpdateModalityDto })
  @ApiResponse({ status: 200, description: 'Modalidade atualizada com sucesso.' })
  update(@Param('id') id: string, @Body() updateModalityDto: UpdateModalityDto) {
    return this.modalityService.update(Number(id), updateModalityDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover modalidade' })
  @ApiParam({ name: 'id', description: 'ID da modalidade' })
  @ApiResponse({ status: 200, description: 'Modalidade removida com sucesso.' })
  remove(@Param('id') id: string) {
    return this.modalityService.remove(Number(id));
  }
}
