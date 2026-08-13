import type { ApiListResponse, Student } from '../types';
import { httpService } from './http.service';

export const studentService = {
  getAll(params?: { search?: string; status?: string; modalityId?: number; sortBy?: string; sortOrder?: string; page?: number; pageSize?: number }): Promise<ApiListResponse<Student>> {
    return httpService.get<ApiListResponse<Student>>('/students', { params });
  },

  getById(id: number): Promise<Student> {
    return httpService.get<Student>(`/students/${id}`);
  },
};
