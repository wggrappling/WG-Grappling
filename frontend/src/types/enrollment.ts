export type PlanOption = { id: number; name: string; price: string | number; active: boolean };
export type ModalityOption = { id: number; name: string; active: boolean };
export type ClassOption = { id: number; name: string; modalityId: number; active: boolean; capacity: number; teacher?: { active: boolean } };

export type NewStudentEnrollment = {
  person: { name: string; cpf: string; email: string; phone?: string };
  student: { joinedAt: string; status: 'ACTIVE' | 'PAUSED' | 'INACTIVE'; notes?: string };
  address?: {
    street: string; number?: string; complement?: string; neighborhood: string;
    city: string; state: string; zipCode: string; country?: string;
  };
  responsible?: { name: string; cpf: string; email?: string; phone?: string; relationship: string };
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
