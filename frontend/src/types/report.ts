import type { BeltRank } from './history';
import type { ChargeStatus } from './charge';
import type { StudentStatus } from './student';

export type ReportPage<T> = { data: T[]; total: number; page: number; pageSize: number; totalPages: number };
export type StudentReportRow = { id: number; name: string; enrollmentNumber: string; status: StudentStatus; joinedAt: string; modalities: string[] };
export type FinancialReportRow = { id: number; referenceMonth: string; student: string; amount: number; dueDate: string; status: ChargeStatus; totalPaid: number; balance: number };
export type AttendanceReportRow = { id: number; student: string; class: string; date: string; status: 'PRESENT' | 'ABSENT' | 'JUSTIFIED' };
export type GraduationReportRow = { id: number; student: string; modality: string; belt: BeltRank; date: string; actor: string | null };
