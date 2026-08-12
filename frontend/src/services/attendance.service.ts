import type { Attendance } from '../types/attendance';
import { httpService } from './http.service';

export const attendanceService = {
  getByStudent: (studentId: number) => httpService.get<Attendance[]>('/attendance', { params: { studentId } }),
};
