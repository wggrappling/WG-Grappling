import { httpService } from './http.service';
import type {
  AttendanceProjection,
  FinanceProjection,
  GraduationsProjection,
  MeProjection,
  ModalitiesProjection,
  SelfProfile,
} from '../types/self-service';
import type { StoreCart, StoreOrder, StoreOrderSummary, StoreProduct } from '../types/store';

export const selfService = {
  me: () => httpService.get<MeProjection>('/me'),
  profile: () => httpService.get<SelfProfile>('/me/profile'),
  graduations: () => httpService.get<GraduationsProjection>('/me/graduations'),
  modalities: () => httpService.get<ModalitiesProjection>('/me/modalities'),
  attendance: (startDate?: string, endDate?: string) =>
    httpService.get<AttendanceProjection>('/me/attendance', {
      params: {
        ...(startDate ? { startDate } : {}),
        ...(endDate ? { endDate } : {}),
      },
    }),
  finance: () => httpService.get<FinanceProjection>('/me/finance'),
  storeProducts: () => httpService.get<StoreProduct[]>('/me/store/products'),
  storeProduct: (productId: number) => httpService.get<StoreProduct>(`/me/store/products/${productId}`),
  cart: () => httpService.get<StoreCart>('/me/cart'),
  addCartItem: (productId: number, variantId: number, quantity: number) =>
    httpService.post<StoreCart, { productId: number; variantId: number; quantity: number }>('/me/cart/items', { productId, variantId, quantity }),
  updateCartItem: (itemId: number, quantity: number) =>
    httpService.patch<StoreCart, { quantity: number }>(`/me/cart/items/${itemId}`, { quantity }),
  removeCartItem: (itemId: number) => httpService.remove<StoreCart>(`/me/cart/items/${itemId}`),
  orders: () => httpService.get<StoreOrderSummary[]>('/me/orders'),
  order: (orderId: number) => httpService.get<StoreOrder>(`/me/orders/${orderId}`),
  checkout: (paymentMethod: 'PIX_QR_CODE' | 'CREDIT_CARD_LINK' | 'CREDIT_CARD_PHYSICAL' | 'PIX_MANUAL', paymentAmount: number) =>
    httpService.post<{ id: number; total: number; status: string }, { paymentMethod: string; paymentAmount: number }>('/me/orders', { paymentMethod, paymentAmount }),
};
