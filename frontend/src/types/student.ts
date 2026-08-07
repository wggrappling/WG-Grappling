export type StudentStatus = 'ACTIVE' | 'PAUSED' | 'INACTIVE';

export type StudentPerson = {
  id: number;
  name: string;
  cpf: string;
  email: string;
  phone: string | null;
  createdAt: string;
};

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
};
