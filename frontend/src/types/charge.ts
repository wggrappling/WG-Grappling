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

export type PaymentMethod = 'PIX' | 'CASH' | 'TRANSFER';
export type Payment = { id: number; chargeId: number; amount: string | number; paidAt: string; method: PaymentMethod; reference: string | null; createdAt: string; updatedAt: string; refundedAt: string | null; refundReason: string | null; refundedBy: number | null };
export type CreatePayment = { amount: number; paidAt: string; method: PaymentMethod; reference?: string };
export type RefundPayment = { reason: string };

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
  payments: Payment[];
  totalPaid: number;
  balance: number;
};
