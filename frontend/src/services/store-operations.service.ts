import { httpService } from './http.service';
import { apiClient } from '../api';

export type InternalStoreProduct = {
  id: number; name: string; description: string; type: 'SHIRT' | 'SHORTS' | 'SET'; salePrice: number;
  madeToOrder: boolean; leadTimeDays: number; status: string; imageUrl: string | null;
  variants: Array<{ id: number; color: string; size: string; availableQuantity: number; minimumStock: number; latestUnitCost: number | null; stockState: string }>;
};
export type PaymentReview = { id: number; orderId: number; method: string; amount: string | number; justification: string; submittedAt: string; submitter: { name: string; role: string }; order: { total: string | number; items: Array<{ productName: string; color: string | null; size: string | null; quantity: number }>; student: { enrollmentNumber: string; person: { name: string } } } };
export type InternalStoreOrder = { id: number; subtotal: number; total: number; paid: number; balance: number; status: string; createdAt: string; student: { enrollmentNumber: string; person: { name: string } }; items: Array<{ id: number; productName: string; color: string | null; size: string | null; madeToOrder: boolean; leadTimeDays: number | null; quantity: number; unitPrice: number; subtotal: number }>; payments: Array<{ id: number; method: string; amount: number; status: string; createdAt: string }> };

export const storeOperations = {
  products: () => httpService.get<InternalStoreProduct[]>('/store/products'),
  createProduct: (body: unknown) => httpService.post<InternalStoreProduct, unknown>('/store/products', body),
  updateProduct: (productId: number, body: unknown) => httpService.patch(`/store/products/${productId}`, body),
  uploadProductImage: (productId: number, file: File) => { const body = new FormData(); body.append('file', file); return httpService.post(`/store/products/${productId}/image`, body); },
  productImage: async (productId: number) => (await apiClient.get<Blob>(`/store/products/${productId}/image`, { responseType: 'blob' })).data,
  addStock: (variantId: number, quantity: number, unitCost: number) => httpService.post(`/store/variants/${variantId}/stock-entries`, { quantity, unitCost }),
  findCustomer: (cpf: string) => httpService.get<{ name: string; enrollmentNumber: string; status: string }>('/store/customers', { params: { cpf } }),
  createOrder: (body: unknown) => httpService.post<{ id: number; total: number; status: string }, unknown>('/store/orders', body),
  submitManualPayment: (orderId: number, body: unknown) => httpService.post(`/store/orders/${orderId}/payments/manual`, body),
  reviews: () => httpService.get<PaymentReview[]>('/store/payment-reviews'),
  orders: () => httpService.get<InternalStoreOrder[]>('/store/orders'),
  order: (orderId: number) => httpService.get<InternalStoreOrder>(`/store/orders/${orderId}`),
  approve: (paymentId: number, notes?: string) => httpService.post(`/store/payments/${paymentId}/approve`, { notes }),
  reject: (paymentId: number, notes: string) => httpService.post(`/store/payments/${paymentId}/reject`, { notes }),
  cancel: (orderId: number, reason: string, restock: boolean) => httpService.post(`/store/orders/${orderId}/cancel`, { reason, restock, confirmFinancialImpact: true }),
  refund: (paymentId: number, reason: string) => httpService.post(`/store/payments/${paymentId}/refund`, { reason, confirmFinancialImpact: true }),
  updateOrderStatus: (orderId: number, status: string) => httpService.patch(`/store/orders/${orderId}/status`, { status }),
};
