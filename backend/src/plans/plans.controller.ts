import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';
import { PlansService } from './plans.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

@ApiTags('Plans')
@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todos os planos' })
  @ApiResponse({ status: 200, description: 'Lista de planos retornada com sucesso.' })
  findAll() {
    return this.plansService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar plano por ID' })
  @ApiParam({ name: 'id', description: 'ID do plano' })
  @ApiResponse({ status: 200, description: 'Plano retornado com sucesso.' })
  findOne(@Param('id') id: string) {
    return this.plansService.findOne(Number(id));
  }

  @Post()
  @ApiOperation({ summary: 'Criar novo plano' })
  @ApiBody({ type: CreatePlanDto })
  @ApiResponse({ status: 201, description: 'Plano criado com sucesso.' })
  create(@Body() createPlanDto: CreatePlanDto) {
    return this.plansService.create(createPlanDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar plano' })
  @ApiParam({ name: 'id', description: 'ID do plano' })
  @ApiBody({ type: UpdatePlanDto })
  @ApiResponse({ status: 200, description: 'Plano atualizado com sucesso.' })
  update(@Param('id') id: string, @Body() updatePlanDto: UpdatePlanDto) {
    return this.plansService.update(Number(id), updatePlanDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover plano' })
  @ApiParam({ name: 'id', description: 'ID do plano' })
  @ApiResponse({ status: 200, description: 'Plano removido com sucesso.' })
  remove(@Param('id') id: string) {
    return this.plansService.remove(Number(id));
  }
}
