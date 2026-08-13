import type { Student, StudentStatus } from '../types';
import { httpService } from './http.service';

export const studentAdminService = {
  updatePerson: (personId: number, body: { name: string; cpf: string; email: string; phone?: string }) => httpService.patch(`/people/${personId}`, body),
  updateStudent: (studentId: number, body: { status: StudentStatus; joinedAt: string; notes?: string }) => httpService.patch<Student, typeof body>(`/students/${studentId}`, body),
  updatePlan: (id: number, body: { monthlyPrice: number; billingDay: number }) => httpService.patch(`/student-plan/${id}`, body),
  addModality: (body: { studentId: number; modalityId: number; startedAt: string; status: 'ACTIVE' }) => httpService.post('/student-modality', body),
  updateModality: (id: number, body: { status: 'ACTIVE' | 'PAUSED' | 'FINISHED' }) => httpService.patch(`/student-modality/${id}`, body),
  addClass: (body: { studentId: number; classId: number }) => httpService.post('/student-classes', body),
  removeClass: (id: number) => httpService.remove(`/student-classes/${id}`),
};
