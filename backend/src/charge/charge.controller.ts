import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ChargeService } from './charge.service';
import { FinancialCycleService } from './financial-cycle.service';
import { CreateChargeDto } from './dto/create-charge.dto';
import { UpdateChargeDto } from './dto/update-charge.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../../generated/prisma/enums';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { Audit } from '../audit/audit.decorator';

@ApiTags('Charges')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('charges')
export class ChargeController {
  constructor(
    private readonly chargeService: ChargeService,
    private readonly financialCycleService: FinancialCycleService,
  ) {}

  @Get()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.RECEPTION)
  @ApiOperation({ summary: 'Listar todas as cobranças' })
  @ApiResponse({ status: 200, description: 'Cobranças retornadas com sucesso.' })
  findAll(@Query('studentId') studentId?: string) {
    return this.chargeService.findAll(studentId === undefined ? undefined : Number(studentId));
  }

  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.RECEPTION)
  @ApiOperation({ summary: 'Buscar cobrança por ID' })
  @ApiParam({ name: 'id', description: 'ID da cobrança' })
  @ApiResponse({ status: 200, description: 'Cobrança retornada com sucesso.' })
  findOne(@Param('id') id: string) {
    return this.chargeService.findOne(Number(id));
  }

  @Get(':id/payments')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.RECEPTION)
  @ApiOperation({ summary: 'Listar pagamentos de uma cobrança' })
  findPayments(@Param('id') id: string) {
    return this.chargeService.findPayments(Number(id));
  }

  @Post(':id/payments')
  @Audit({ action: 'REGISTER_PAYMENT', entity: 'Charge', entityIdParam: 'id' })
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.RECEPTION)
  @ApiOperation({ summary: 'Registrar pagamento manual de uma cobrança' })
  @ApiBody({ type: CreatePaymentDto })
  registerPayment(@Param('id') id: string, @Body() dto: CreatePaymentDto, @Request() req: any) {
    return this.chargeService.registerPayment(Number(id), dto, req.user?.id);
  }

  @Post()
  @Audit({ action: 'CREATE', entity: 'Charge' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Criar nova cobrança' })
  @ApiBody({ type: CreateChargeDto })
  @ApiResponse({ status: 201, description: 'Cobrança criada com sucesso.' })
  create(@Body() createChargeDto: CreateChargeDto) {
    return this.chargeService.create(createChargeDto);
  }

  @Post('generate-monthly')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Gerar mensalidades automáticas para alunos ativos' })
  @ApiResponse({ status: 201, description: 'Cobranças mensais geradas com sucesso.' })
  generateMonthlyCharges() {
    return this.financialCycleService.run();
  }

  @Patch(':id')
  @Audit({ action: 'UPDATE', entity: 'Charge', entityIdParam: 'id' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Atualizar cobrança' })
  @ApiParam({ name: 'id', description: 'ID da cobrança' })
  @ApiBody({ type: UpdateChargeDto })
  @ApiResponse({ status: 200, description: 'Cobrança atualizada com sucesso.' })
  update(@Param('id') id: string, @Body() updateChargeDto: UpdateChargeDto) {
    return this.chargeService.update(Number(id), updateChargeDto);
  }

  @Delete(':id')
  @Audit({ action: 'CANCEL', entity: 'Charge', entityIdParam: 'id' })
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Remover cobrança' })
  @ApiParam({ name: 'id', description: 'ID da cobrança' })
  @ApiResponse({ status: 200, description: 'Cobrança removida com sucesso.' })
  remove(@Param('id') id: string) {
    return this.chargeService.remove(Number(id));
  }
}
