import type { EnrollmentResponse, NewStudentEnrollment } from '../types/enrollment';
import { httpService } from './http.service';

export const enrollmentService = {
  createNewStudent(payload: NewStudentEnrollment): Promise<EnrollmentResponse> {
    return httpService.post<EnrollmentResponse, NewStudentEnrollment>('/enrollments', payload);
  },
};
