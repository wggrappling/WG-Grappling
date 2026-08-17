import type { DashboardSummary } from '../types/dashboard';
import { httpService } from './http.service';

export const dashboardService = {
  summary: () => httpService.get<DashboardSummary>('/dashboard/summary'),
};
