import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, Request, Res, StreamableFile, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { UserRole } from '../../generated/prisma/enums';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AddStoreVariantDto, CancelOrderDto, CreateStoreOrderDto, CreateStoreProductDto, ManualPaymentDto, RefundPaymentDto, ReviewPaymentDto, StockEntryDto, UpdateStoreOrderStatusDto, UpdateStoreProductDto } from './dto/store.dto';
import { StoreService } from './store.service';

type AuthRequest = { user: { id: number; role: UserRole } };

@Controller('store')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.RECEPTION)
export class StoreController {
  constructor(private readonly store: StoreService) {}

  @Get('products') listProducts(@Request() req: AuthRequest) { return this.store.listProducts(req.user); }

  @Post('products')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  createProduct(@Body() dto: CreateStoreProductDto, @Request() req: AuthRequest) { return this.store.createProduct(dto, req.user); }

  @Patch('products/:id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  updateProduct(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateStoreProductDto, @Request() req: AuthRequest) { return this.store.updateProduct(id, dto, req.user); }

  @Post('products/:id/variants')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  addVariant(@Param('id', ParseIntPipe) id: number, @Body() dto: AddStoreVariantDto, @Request() req: AuthRequest) { return this.store.addVariant(id, dto, req.user); }

  @Post('variants/:id/stock-entries')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  addStock(@Param('id', ParseIntPipe) id: number, @Body() dto: StockEntryDto, @Request() req: AuthRequest) { return this.store.addStock(id, dto, req.user); }

  @Post('products/:id/image')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: Number(process.env.DOCUMENT_MAX_SIZE_MB ?? 10) * 1024 * 1024 } }))
  uploadImage(@Param('id', ParseIntPipe) id: number, @UploadedFile() file: { buffer: Buffer; mimetype: string; size: number }, @Request() req: AuthRequest) { return this.store.uploadProductImage(id, file, req.user); }

  @Get('products/:id/image')
  async getImage(@Param('id', ParseIntPipe) id: number, @Res({ passthrough: true }) response: Response) { const image = await this.store.getProductImage(id); response.setHeader('Content-Type', image.mimeType); response.setHeader('Content-Length', String(image.data.length)); return new StreamableFile(image.data); }

  @Get('customers') findCustomer(@Query('cpf') cpf: string) { return this.store.findCustomer(cpf ?? ''); }
  @Post('orders') createOrder(@Body() dto: CreateStoreOrderDto, @Request() req: AuthRequest) { return this.store.createReceptionOrder(dto, req.user); }
  @Post('orders/:id/payments/manual') submitPayment(@Param('id', ParseIntPipe) id: number, @Body() dto: ManualPaymentDto, @Request() req: AuthRequest) { return this.store.submitManualPayment(id, dto, req.user); }

  @Get('payment-reviews')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  reviews() { return this.store.listPaymentReviews(); }

  @Post('payments/:id/approve')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  approve(@Param('id', ParseIntPipe) id: number, @Body() dto: ReviewPaymentDto, @Request() req: AuthRequest) { return this.store.approvePayment(id, dto.notes, req.user); }

  @Post('payments/:id/refund')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  refund(@Param('id', ParseIntPipe) id: number, @Body() dto: RefundPaymentDto, @Request() req: AuthRequest) { return this.store.refundPayment(id, dto, req.user); }

  @Patch('orders/:id/status')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  updateStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateStoreOrderStatusDto, @Request() req: AuthRequest) { return this.store.updateOrderStatus(id, dto, req.user); }

  @Post('orders/:id/cancel')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  cancel(@Param('id', ParseIntPipe) id: number, @Body() dto: CancelOrderDto, @Request() req: AuthRequest) { return this.store.cancelOrder(id, dto, req.user); }
}
