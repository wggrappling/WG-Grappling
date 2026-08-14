import type { ClassOption, ModalityOption, PlanOption } from '../types/enrollment';
import type { ApiListResponse } from '../types';
import { httpService } from './http.service';

export const catalogService = {
  async getPlans() { return (await httpService.get<ApiListResponse<PlanOption>>('/plans')).data; },
  getModalities: () => httpService.get<ModalityOption[]>('/modality'),
  getClasses: () => httpService.get<ClassOption[]>('/class'),
};
