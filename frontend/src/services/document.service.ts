import { apiClient } from '../api';
import type { ApiListResponse, DocumentType, StudentDocument } from '../types';
import { httpService } from './http.service';

export const documentService = {
  getByStudentId(studentId: number): Promise<ApiListResponse<StudentDocument>> {
    return httpService.get<ApiListResponse<StudentDocument>>(`/students/${studentId}/documents`);
  },
  async upload(studentId: number, file: File, type: DocumentType): Promise<void> {
    const data = new FormData(); data.append('file', file); data.append('type', type);
    await apiClient.post(`/students/${studentId}/documents`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  async getFile(id: number, download = false): Promise<Blob> {
    const response = await apiClient.get<Blob>(`/documents/${id}/file`, { params: { download }, responseType: 'blob' });
    return response.data;
  },
  remove(id: number): Promise<{ message: string }> { return httpService.remove(`/documents/${id}`); },
};
