import type { ApiListResponse, Charge, CreatePayment, RefundPayment } from '../types';
import { httpService } from './http.service';

export const chargeService = {
  getAll(studentId?: number): Promise<ApiListResponse<Charge>> {
    return httpService.get<ApiListResponse<Charge>>('/charges', {
      params: studentId === undefined ? undefined : { studentId },
    });
  },
  registerPayment(chargeId: number, payload: CreatePayment): Promise<{ message: string }> {
    return httpService.post<{ message: string }, CreatePayment>(`/charges/${chargeId}/payments`, payload);
  },
  refundPayment(paymentId: number, payload: RefundPayment): Promise<{ message: string }> {
    return httpService.post<{ message: string }, RefundPayment>(`/payments/${paymentId}/refund`, payload);
  },
};
