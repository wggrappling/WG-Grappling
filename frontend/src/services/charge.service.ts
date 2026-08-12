import type { ApiListResponse, Charge } from '../types';
import { httpService } from './http.service';

export const chargeService = {
  getAll(studentId?: number): Promise<ApiListResponse<Charge>> {
    return httpService.get<ApiListResponse<Charge>>('/charges', {
      params: studentId === undefined ? undefined : { studentId },
    });
  },
};
