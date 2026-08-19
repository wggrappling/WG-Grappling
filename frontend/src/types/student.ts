export type StudentStatus = 'ACTIVE' | 'PAUSED' | 'INACTIVE';

export type StudentPerson = {
  id: number;
  name: string;
  cpf: string;
  email: string;
  phone: string | null;
  createdAt: string;
  address?: { street: string; number: string | null; complement: string | null; neighborhood: string; city: string; state: string; zipCode: string; country: string } | null;
};

export type StudentResponsible = { responsible: { name: string; relationship: string; phone: string | null; email: string | null } };
export type StudentModality = { id: number; startedAt: string; status: 'ACTIVE' | 'PAUSED' | 'FINISHED'; modality: { id: number; name: string; hasGraduation: boolean } };
export type StudentPlan = { id: number; startDate: string; endDate: string | null; status: 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'FINISHED'; monthlyPrice: string | number; billingDay: number; plan: { id: number; name: string } };
export type StudentClass = { id: number; class: { id: number; name: string; active: boolean; weekDays: string[]; startTime: string; endTime: string; modality: { id: number; name: string }; teacher: { id: number; name: string } } };
export type StudentGraduation = { id: number; modalityId: number; belt: 'WHITE' | 'BLUE' | 'PURPLE' | 'BROWN' | 'BLACK'; graduatedAt: string; modality: { id: number; name: string } };

export type Student = {
  id: number;
  personId: number;
  enrollmentNumber: string;
  status: StudentStatus;
  joinedAt: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  person: StudentPerson;
  responsibles?: StudentResponsible[];
  modalities?: StudentModality[];
  plans?: StudentPlan[];
  studentClasses?: StudentClass[];
  graduations?: StudentGraduation[];
};
