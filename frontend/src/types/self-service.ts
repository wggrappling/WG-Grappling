export type StudentStatus = 'ACTIVE' | 'PAUSED' | 'INACTIVE';

export type MeProjection = {
  account: { id: number; name: string; email: string; role: 'ALUNO'; active: boolean };
  student: { id: number; name: string; enrollmentNumber: string; status: StudentStatus; joinedAt: string };
  academicContext: { active: boolean };
};

export type SelfProfile = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  enrollmentNumber: string;
  studentStatus: StudentStatus;
  joinedAt: string;
};

export type GraduationRecord = {
  id: number;
  modality: { id: number; name: string };
  graduationLevel: { code: string; name: string } | null;
  belt: string | null;
  degree: number | null;
  beltStartedAt: string;
  graduatedAt: string;
  status: 'ACTIVE' | 'SUPERSEDED' | 'CANCELLED';
  correctedAt: string | null;
  cancelledAt: string | null;
};

export type GraduationsProjection = { current: GraduationRecord[]; history: GraduationRecord[] };

export type ModalityMembership = {
  id: number;
  modality: { id: number; name: string; description: string; hasGraduation: boolean };
  status: 'ACTIVE' | 'PAUSED' | 'FINISHED';
  startedAt: string;
  pausedAt: string | null;
  resumedAt: string | null;
  finishedAt: string | null;
};

export type ModalitiesProjection = { current: ModalityMembership[]; history: ModalityMembership[] };

export type AttendanceProjection = {
  period: { startDate: string; endDate: string };
  summary: { total: number; present: number; absent: number; justified: number };
  records: Array<{
    id: number;
    attendanceDate: string;
    status: 'PRESENT' | 'ABSENT' | 'JUSTIFIED';
    class: { id: number; name: string; modality: { name: string } };
  }>;
};

export type FinanceProjection = {
  plans: {
    current: PlanMembership[];
    history: PlanMembership[];
  };
  charges: AcademicCharge[];
  payments: AcademicPayment[];
  situation: {
    openChargeCount: number;
    openBalance: number;
    overdueChargeCount: number;
    overdueBalance: number;
    nextCharge: AcademicCharge | null;
  };
};

export type PlanMembership = {
  id: number;
  plan: { id: number; name: string; description: string; weeklyClasses: number };
  startDate: string;
  endDate: string | null;
  monthlyPrice: number;
  billingDay: number;
  status: 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'FINISHED';
};

export type AcademicCharge = {
  id: number;
  type: string;
  description: string;
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  dueDate: string;
  referenceMonth: string;
  status: 'PENDING' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'REFUNDED';
  totalPaid: number;
  balance: number;
};

export type AcademicPayment = {
  id: number;
  chargeId: number;
  amount: number;
  paidAt: string;
  method: 'PIX' | 'CASH' | 'TRANSFER';
  refundedAt: string | null;
  state: 'VALID' | 'REFUNDED';
};

export type SelfNotice = {
  id: number;
  title: string;
  content: string;
  publishedAt: string;
  isRead: boolean;
};

export type SelfDocument = {
  id: number;
  name: string;
  type: 'PHOTO' | 'MEDICAL_CERTIFICATE' | 'CONTRACT' | 'CERTIFICATE' | 'LGPD' | 'OTHER';
  status: 'ACTIVE' | 'ARCHIVED';
  createdAt: string;
  size: number;
  available: boolean;
};
