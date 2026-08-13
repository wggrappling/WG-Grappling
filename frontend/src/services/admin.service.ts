import type { ApiListResponse } from '../types';
import type { AdminClass, AdminModality, AdminPlan, SafeUser } from '../types/admin';
import { httpService } from './http.service';

export const adminService = {
  async getPlans() { return (await httpService.get<ApiListResponse<AdminPlan>>('/plans')).data; },
  createPlan: (body: Omit<AdminPlan, 'id'>) => httpService.post<AdminPlan, Omit<AdminPlan, 'id'>>('/plans', body),
  updatePlan: (id: number, body: Partial<Omit<AdminPlan, 'id'>>) => httpService.patch<AdminPlan, typeof body>(`/plans/${id}`, body),
  getModalities: () => httpService.get<AdminModality[]>('/modality'),
  createModality: (body: Omit<AdminModality, 'id'>) => httpService.post<AdminModality, Omit<AdminModality, 'id'>>('/modality', body),
  updateModality: (id: number, body: Partial<Omit<AdminModality, 'id'>>) => httpService.patch<AdminModality, typeof body>(`/modality/${id}`, body),
  getClasses: () => httpService.get<AdminClass[]>('/class'),
  createClass: (body: Omit<AdminClass, 'id' | 'modality' | 'teacher'>) => httpService.post<AdminClass, typeof body>('/class', body),
  updateClass: (id: number, body: Partial<Omit<AdminClass, 'id' | 'modality' | 'teacher'>>) => httpService.patch<AdminClass, typeof body>(`/class/${id}`, body),
  async getTeachers() { return (await httpService.get<ApiListResponse<SafeUser>>('/users')).data.filter((user) => user.role === 'TEACHER' && user.active); },
};
