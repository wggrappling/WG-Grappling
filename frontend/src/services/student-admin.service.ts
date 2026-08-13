import type { StudentStatus } from '../types';
import { httpService } from './http.service';

export type EnrollmentMaintenance = {
  person: { name: string; cpf: string; email: string; phone?: string };
  student: { status: StudentStatus; joinedAt: string; notes?: string };
  plan?: { planId: number; monthlyPrice: number; billingDay: number; startDate: string };
  addModalityIds?: number[];
  deactivateStudentModalityIds?: number[];
  addClassIds?: number[];
  removeStudentClassIds?: number[];
};
export const studentAdminService = {
  maintain: (studentId: number, body: EnrollmentMaintenance) => httpService.patch<{ message: string; data: { studentId: number } }, EnrollmentMaintenance>(`/enrollments/${studentId}`, body),
};
