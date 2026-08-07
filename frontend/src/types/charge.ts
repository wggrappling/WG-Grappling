export type ChargeType =
  | 'ENROLLMENT_FEE'
  | 'MONTHLY_FEE'
  | 'PRIVATE_CLASS'
  | 'PRODUCT'
  | 'EVENT'
  | 'GRADUATION_EXAM'
  | 'OTHER';

export type ChargeStatus =
  | 'PENDING'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'OVERDUE'
  | 'CANCELLED'
  | 'REFUNDED';

export type ChargePlan = {
  id: number;
  name: string;
  description: string;
  price: string | number;
  weeklyClasses: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Charge = {
  id: number;
  studentId: number;
  planId: number | null;
  type: ChargeType;
  description: string;
  originalAmount: string | number;
  discountAmount: string | number;
  finalAmount: string | number;
  dueDate: string;
  referenceMonth: string;
  status: ChargeStatus;
  createdAt: string;
  updatedAt: string;
  plan: ChargePlan | null;
};
