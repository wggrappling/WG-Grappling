import type { FinancialStatus } from '../../mocks/studentFinancial';

type FinancialStatusBadgeProps = {
  status: FinancialStatus;
};

const statusClassNames: Record<FinancialStatus, string> = {
  Pago: 'paid',
  Pendente: 'pending',
  Atrasado: 'overdue',
};

export function FinancialStatusBadge({ status }: FinancialStatusBadgeProps) {
  return <span className={`financial-status ${statusClassNames[status]}`}>{status}</span>;
}
