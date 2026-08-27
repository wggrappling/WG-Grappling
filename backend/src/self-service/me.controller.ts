import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
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
import { SelfAcademicService } from './self-academic.service';
import {
  SelfAttendanceProjectionDto,
  SelfFinanceProjectionDto,
  SelfGraduationsProjectionDto,
  SelfModalitiesProjectionDto,
} from './dto/self-academic-projections.dto';
import { SelfAttendanceQueryDto } from './dto/self-attendance-query.dto';
import { AddCartItemDto, UpdateCartItemDto } from './dto/self-store.dto';
import { SelfCheckoutDto } from '../store/dto/store.dto';
import { StoreService } from '../store/store.service';
import { SelfStoreService } from './self-store.service';
import {
  SelfServiceCapability,
  StudentAccessPolicy,
} from './context/student-access.policy';

@ApiTags('Self-Service')
@ApiBearerAuth('access-token')
@Controller('me')
@UseGuards(JwtAuthGuard, RolesGuard, StudentContextGuard)
@Roles(UserRole.ALUNO)
export class MeController {
  constructor(
    private readonly meService: MeService,
    private readonly academicService: SelfAcademicService,
    private readonly storeService: SelfStoreService,
    private readonly accessPolicy: StudentAccessPolicy,
    private readonly operations: StoreService,
  ) {}

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

  @Get('graduations')
  @ApiOkResponse({ type: SelfGraduationsProjectionDto })
  getGraduations(@AuthenticatedContext() context: AuthenticatedUserContext) {
    return this.academicService.getGraduations(context);
  }

  @Get('modalities')
  @ApiOkResponse({ type: SelfModalitiesProjectionDto })
  getModalities(@AuthenticatedContext() context: AuthenticatedUserContext) {
    return this.academicService.getModalities(context);
  }

  @Get('attendance')
  @ApiOkResponse({ type: SelfAttendanceProjectionDto })
  getAttendance(
    @AuthenticatedContext() context: AuthenticatedUserContext,
    @Query() query: SelfAttendanceQueryDto,
  ) {
    return this.academicService.getAttendance(context, query);
  }

  @Get('finance')
  @ApiOkResponse({ type: SelfFinanceProjectionDto })
  getFinance(@AuthenticatedContext() context: AuthenticatedUserContext) {
    return this.academicService.getFinance(context);
  }

  @Get('store/products')
  getStoreProducts() {
    return this.storeService.getProducts();
  }

  @Get('store/products/:id')
  getStoreProduct(@Param('id', ParseIntPipe) productId: number) {
    return this.storeService.getProduct(productId);
  }

  @Get('store/products/:id/image')
  async getStoreProductImage(@Param('id', ParseIntPipe) productId: number, @Res({ passthrough: true }) response: Response) {
    const image = await this.operations.getProductImage(productId);
    response.setHeader('Content-Type', image.mimeType);
    response.setHeader('Content-Length', String(image.data.length));
    return new StreamableFile(image.data);
  }

  @Get('cart')
  getCart(@AuthenticatedContext() context: AuthenticatedUserContext) {
    return this.storeService.getCart(context);
  }

  @Post('cart/items')
  addCartItem(
    @AuthenticatedContext() context: AuthenticatedUserContext,
    @Body() dto: AddCartItemDto,
  ) {
    this.accessPolicy.assertCapability(context, SelfServiceCapability.OPERATE);
    return this.storeService.addCartItem(context, dto.productId, dto.variantId, dto.quantity);
  }

  @Patch('cart/items/:id')
  updateCartItem(
    @AuthenticatedContext() context: AuthenticatedUserContext,
    @Param('id', ParseIntPipe) itemId: number,
    @Body() dto: UpdateCartItemDto,
  ) {
    this.accessPolicy.assertCapability(context, SelfServiceCapability.OPERATE);
    return this.storeService.updateCartItem(context, itemId, dto.quantity);
  }

  @Delete('cart/items/:id')
  @HttpCode(200)
  removeCartItem(
    @AuthenticatedContext() context: AuthenticatedUserContext,
    @Param('id', ParseIntPipe) itemId: number,
  ) {
    this.accessPolicy.assertCapability(context, SelfServiceCapability.OPERATE);
    return this.storeService.removeCartItem(context, itemId);
  }

  @Get('orders')
  getOrders(@AuthenticatedContext() context: AuthenticatedUserContext) {
    return this.storeService.getOrders(context);
  }

  @Post('orders')
  createOrder(@AuthenticatedContext() context: AuthenticatedUserContext, @Body() dto: SelfCheckoutDto) {
    this.accessPolicy.assertCapability(context, SelfServiceCapability.OPERATE);
    return this.operations.createSelfOrder(context.studentId, dto, { id: context.userId, role: context.role });
  }

  @Get('orders/:id')
  getOrder(
    @AuthenticatedContext() context: AuthenticatedUserContext,
    @Param('id', ParseIntPipe) orderId: number,
  ) {
    return this.storeService.getOrder(context, orderId);
  }
}
