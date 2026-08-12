export type PlanOption = { id: number; name: string; price: string | number; active: boolean };
export type ModalityOption = { id: number; name: string; active: boolean };
export type ClassOption = { id: number; name: string; modalityId: number; active: boolean };

export type NewStudentEnrollment = {
  person: { name: string; cpf: string; email: string; phone?: string };
  student: { joinedAt: string; status: 'ACTIVE' };
  planId: number;
  monthlyPrice: number;
  billingDay: number;
  startDate: string;
  modalityIds: number[];
  classIds: number[];
};

export type EnrollmentResponse = {
  message: string;
  data: { studentId: number; studentPlanId: number };
};
