import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, Length, Min, ValidateNested } from 'class-validator';
import { CommercialPaymentMethod, OrderStatus, ProductStatus, ProductType } from '../../../generated/prisma/enums';

export class ProductVariantInputDto {
  @IsString() @IsOptional() color = '';
  @IsString() @IsOptional() size = '';
  @Type(() => Number) @IsInt() @Min(0) minimumStock = 0;
}

export class CreateStoreProductDto {
  @IsString() @Length(2, 120) name: string;
  @IsString() @Length(1, 1000) description: string;
  @IsEnum(ProductType) type: ProductType;
  @Type(() => Number) @IsNumber() @Min(0) salePrice: number;
  @IsBoolean() madeToOrder: boolean;
  @Type(() => Number) @IsInt() @Min(1) leadTimeDays = 7;
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => ProductVariantInputDto) variants: ProductVariantInputDto[];
}

export class UpdateStoreProductDto {
  @IsString() @Length(2, 120) @IsOptional() name?: string;
  @IsString() @Length(1, 1000) @IsOptional() description?: string;
  @IsEnum(ProductType) @IsOptional() type?: ProductType;
  @Type(() => Number) @IsNumber() @Min(0) @IsOptional() salePrice?: number;
  @IsBoolean() @IsOptional() madeToOrder?: boolean;
  @Type(() => Number) @IsInt() @Min(1) @IsOptional() leadTimeDays?: number;
  @IsEnum(ProductStatus) @IsOptional() status?: ProductStatus;
}

export class AddStoreVariantDto extends ProductVariantInputDto {}

export class StockEntryDto {
  @Type(() => Number) @IsInt() @Min(1) quantity: number;
  @Type(() => Number) @IsNumber() @Min(0) unitCost: number;
}

export class StoreOrderItemDto {
  @Type(() => Number) @IsInt() @Min(1) variantId: number;
  @Type(() => Number) @IsInt() @Min(1) quantity: number;
}

export class CreateStoreOrderDto {
  @IsString() cpf: string;
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => StoreOrderItemDto) items: StoreOrderItemDto[];
  @IsEnum(CommercialPaymentMethod) paymentMethod: CommercialPaymentMethod;
  @Type(() => Number) @IsNumber() @Min(0.01) paymentAmount: number;
  @IsString() @Length(3, 500) @IsOptional() justification?: string;
}

export class SelfCheckoutDto {
  @IsEnum(CommercialPaymentMethod) paymentMethod: CommercialPaymentMethod;
  @Type(() => Number) @IsNumber() @Min(0.01) paymentAmount: number;
}

export class ManualPaymentDto {
  @IsEnum(CommercialPaymentMethod) method: CommercialPaymentMethod;
  @Type(() => Number) @IsNumber() @Min(0.01) amount: number;
  @IsString() @Length(3, 500) justification: string;
}

export class ReviewPaymentDto {
  @IsString() @Length(3, 500) @IsOptional() notes?: string;
}

export class CancelOrderDto {
  @IsString() @Length(3, 500) reason: string;
  @IsBoolean() confirmFinancialImpact: boolean;
  @IsBoolean() restock: boolean;
}

export class RefundPaymentDto {
  @IsString() @Length(3, 500) reason: string;
  @IsBoolean() confirmFinancialImpact: boolean;
}

export class UpdateStoreOrderStatusDto {
  @IsEnum(OrderStatus) status: OrderStatus;
}
