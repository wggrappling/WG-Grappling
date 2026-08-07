import type { ApiListResponse, Charge } from '../types';
import { httpService } from './http.service';

export const chargeService = {
  getAll(): Promise<ApiListResponse<Charge>> {
    return httpService.get<ApiListResponse<Charge>>('/charges');
  },
};
