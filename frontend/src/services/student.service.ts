import type { ApiListResponse, Student } from '../types';
import { httpService } from './http.service';

export const studentService = {
  getAll(): Promise<ApiListResponse<Student>> {
    return httpService.get<ApiListResponse<Student>>('/students');
  },

  getById(id: number): Promise<Student> {
    return httpService.get<Student>(`/students/${id}`);
  },
};
