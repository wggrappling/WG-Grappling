import {
  BadRequestException,
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
import { SelfNoticeService } from './self-notice.service';
import { SelfNoticeProjectionDto } from './dto/self-notice-projection.dto';
import { SelfDocumentService } from './self-document.service';
import { SelfDocumentProjectionDto } from './dto/self-document-projection.dto';
import { SelfScheduleService } from './self-schedule.service';
import { SelfScheduleProjectionDto } from './dto/self-schedule-projection.dto';
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
    private readonly noticeService: SelfNoticeService,
    private readonly documentService: SelfDocumentService,
    private readonly scheduleService: SelfScheduleService,
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

  @Get('notices')
  @ApiOkResponse({ type: SelfNoticeProjectionDto, isArray: true })
  getNotices(@AuthenticatedContext() context: AuthenticatedUserContext) {
    return this.noticeService.getNotices(context);
  }

  @Get('notices/:id')
  @ApiOkResponse({ type: SelfNoticeProjectionDto })
  getNotice(
    @AuthenticatedContext() context: AuthenticatedUserContext,
    @Param('id', ParseIntPipe) noticeId: number,
  ) {
    return this.noticeService.getNotice(context, noticeId);
  }

  @Post('notices/:id/read')
  @HttpCode(200)
  @ApiOkResponse({ type: SelfNoticeProjectionDto })
  markNoticeRead(
    @AuthenticatedContext() context: AuthenticatedUserContext,
    @Param('id', ParseIntPipe) noticeId: number,
  ) {
    return this.noticeService.markRead(context, noticeId);
  }

  @Get('documents')
  @ApiOkResponse({ type: SelfDocumentProjectionDto, isArray: true })
  getDocuments(@AuthenticatedContext() context: AuthenticatedUserContext) {
    return this.documentService.getDocuments(context);
  }

  @Get('documents/:id')
  @ApiOkResponse({ type: SelfDocumentProjectionDto })
  getDocument(
    @AuthenticatedContext() context: AuthenticatedUserContext,
    @Param('id', ParseIntPipe) documentId: number,
  ) {
    return this.documentService.getDocument(context, documentId);
  }

  @Get('documents/:id/download')
  async getDocumentFile(
    @AuthenticatedContext() context: AuthenticatedUserContext,
    @Param('id', ParseIntPipe) documentId: number,
    @Query('download') download: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const file = await this.documentService.getFile(context, documentId);
    const disposition = download === 'true' || !file.inline ? 'attachment' : 'inline';
    response.setHeader('Content-Type', file.mimeType);
    response.setHeader('Content-Disposition', `${disposition}; filename*=UTF-8''${encodeURIComponent(file.name)}`);
    response.setHeader('Content-Length', String(file.data.length));
    return new StreamableFile(file.data);
  }

  @Get('schedule')
  @ApiOkResponse({ type: SelfScheduleProjectionDto })
  getSchedule(@AuthenticatedContext() context: AuthenticatedUserContext) {
    return this.scheduleService.getSchedule(context);
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
    const image = await this.storeService.getProductImage(productId);
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
    if (dto.paymentMethod === 'PIX_MANUAL' || dto.paymentMethod === 'CREDIT_CARD_PHYSICAL') {
      throw new BadRequestException('Pagamento manual ou físico deve ser informado pela recepção.');
    }
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
