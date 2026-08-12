import type { Attendance, AttendanceBatch, AttendanceFilters, ClassStudents } from '../types/attendance';
import { httpService } from './http.service';

export const attendanceService = {
  getAll: (filters: AttendanceFilters = {}) => httpService.get<Attendance[]>('/attendance', { params: filters }),
  getByStudent: (studentId: number, startDate?: string, endDate?: string) => httpService.get<Attendance[]>('/attendance', { params: { studentId, startDate, endDate } }),
  getClassStudents: (classId: number) => httpService.get<ClassStudents>(`/class/${classId}/students`),
  createBatch: (payload: AttendanceBatch) => httpService.post<{ message: string; processedStudents: number }, AttendanceBatch>('/attendance/batch', payload),
};
