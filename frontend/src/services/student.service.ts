import type { Student } from '../types';
import { httpService } from './http.service';

export const studentService = {
  getById(id: number): Promise<Student> {
    return httpService.get<Student>(`/students/${id}`);
  },
};
