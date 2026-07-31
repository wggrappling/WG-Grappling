import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ChargeService } from './charge.service';
import { ChargeGeneratorService } from './charge-generator.service';
import { CreateChargeDto } from './dto/create-charge.dto';
import { UpdateChargeDto } from './dto/update-charge.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Charges')
@UseGuards(JwtAuthGuard)
@Controller('charges')
export class ChargeController {
  constructor(
    private readonly chargeService: ChargeService,
    private readonly chargeGeneratorService: ChargeGeneratorService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar todas as cobranças' })
  @ApiResponse({ status: 200, description: 'Cobranças retornadas com sucesso.' })
  findAll() {
    return this.chargeService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar cobrança por ID' })
  @ApiParam({ name: 'id', description: 'ID da cobrança' })
  @ApiResponse({ status: 200, description: 'Cobrança retornada com sucesso.' })
  findOne(@Param('id') id: string) {
    return this.chargeService.findOne(Number(id));
  }

  @Post()
  @ApiOperation({ summary: 'Criar nova cobrança' })
  @ApiBody({ type: CreateChargeDto })
  @ApiResponse({ status: 201, description: 'Cobrança criada com sucesso.' })
  create(@Body() createChargeDto: CreateChargeDto) {
    return this.chargeService.create(createChargeDto);
  }

  @Post('generate-monthly')
  @ApiOperation({ summary: 'Gerar mensalidades automáticas para alunos ativos' })
  @ApiResponse({ status: 201, description: 'Cobranças mensais geradas com sucesso.' })
  generateMonthlyCharges() {
    return this.chargeGeneratorService.generateMonthlyCharges();
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar cobrança' })
  @ApiParam({ name: 'id', description: 'ID da cobrança' })
  @ApiBody({ type: UpdateChargeDto })
  @ApiResponse({ status: 200, description: 'Cobrança atualizada com sucesso.' })
  update(@Param('id') id: string, @Body() updateChargeDto: UpdateChargeDto) {
    return this.chargeService.update(Number(id), updateChargeDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover cobrança' })
  @ApiParam({ name: 'id', description: 'ID da cobrança' })
  @ApiResponse({ status: 200, description: 'Cobrança removida com sucesso.' })
  remove(@Param('id') id: string) {
    return this.chargeService.remove(Number(id));
  }
}
