import type { ChargeStatus } from '../../types';

type FinancialStatusBadgeProps = {
  status: ChargeStatus;
};

const statusDetails: Record<ChargeStatus, { className: string; label: string }> = {
  PENDING: { className: 'pending', label: 'Pendente' },
  PARTIALLY_PAID: { className: 'pending', label: 'Parcialmente pago' },
  PAID: { className: 'paid', label: 'Pago' },
  OVERDUE: { className: 'overdue', label: 'Atrasado' },
  CANCELLED: { className: 'cancelled', label: 'Cancelado' },
  REFUNDED: { className: 'refunded', label: 'Reembolsado' },
};

export function FinancialStatusBadge({ status }: FinancialStatusBadgeProps) {
  const details = statusDetails[status];
  return <span className={`financial-status ${details.className}`}>{details.label}</span>;
}
