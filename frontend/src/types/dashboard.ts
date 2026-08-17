import type { BeltRank } from './history';

export type DashboardClass = { id: number; name: string; modality: string; teacher: string; startTime: string; endTime: string };
export type DashboardGraduation = { id: number; student: string; modality: string; belt: BeltRank; graduatedAt: string };
export type DashboardSummary = {
  activeStudents: number;
  pendingCharges: number;
  overdueCharges: number;
  todayClasses: DashboardClass[];
  todayAttendance: { present: number; absent: number; justified: number };
  recentGraduations: DashboardGraduation[];
};
