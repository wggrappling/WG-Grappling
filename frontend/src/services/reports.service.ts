import type { AttendanceReportRow, FinancialReportRow, GraduationReportRow, ReportPage, StudentReportRow } from '../types/report';
import { httpService } from './http.service';

type Params = Record<string, string | number | undefined>;
const get = <T>(path: string, params: Params) => httpService.get<ReportPage<T>>(path, {
  params: Object.fromEntries(Object.entries(params).filter(([, value]) => value !== '' && value !== undefined)),
});
export const reportsService = {
  students: (params: Params) => get<StudentReportRow>('/reports/students', params),
  financial: (params: Params) => get<FinancialReportRow>('/reports/financial', params),
  attendance: (params: Params) => get<AttendanceReportRow>('/reports/attendance', params),
  graduations: (params: Params) => get<GraduationReportRow>('/reports/graduations', params),
};
