import type { ClassOption, ModalityOption, PlanOption } from '../types/enrollment';
import { httpService } from './http.service';

export const catalogService = {
  getPlans: () => httpService.get<PlanOption[]>('/plans'),
  getModalities: () => httpService.get<ModalityOption[]>('/modality'),
  getClasses: () => httpService.get<ClassOption[]>('/class'),
};
