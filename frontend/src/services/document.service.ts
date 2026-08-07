import type { ApiListResponse, StudentDocument } from '../types';
import { httpService } from './http.service';

export const documentService = {
  getByStudentId(studentId: number): Promise<ApiListResponse<StudentDocument>> {
    return httpService.get<ApiListResponse<StudentDocument>>(`/students/${studentId}/documents`);
  },
};
