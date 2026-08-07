export type FinancialStatus = 'Pago' | 'Pendente' | 'Atrasado';

export type FinancialSummaryItem = {
  label: string;
  value: string;
  detail: string;
  tone: 'primary' | 'neutral' | 'success' | 'warning';
};

export type StudentCharge = {
  id: number;
  reference: string;
  dueDate: string;
  amount: string;
  status: FinancialStatus;
  paymentMethod: string;
};

export const financialSummary: readonly FinancialSummaryItem[] = [
  {
    label: 'Mensalidade atual',
    value: 'R$ 249,90',
    detail: 'Plano Jiu-Jitsu + No-Gi',
    tone: 'primary',
  },
  {
    label: 'Próximo vencimento',
    value: '10/09/2026',
    detail: 'Faltam 34 dias',
    tone: 'neutral',
  },
  {
    label: 'Situação',
    value: 'Em dia',
    detail: 'Nenhuma parcela vencida',
    tone: 'success',
  },
  {
    label: 'Total em aberto',
    value: 'R$ 249,90',
    detail: '1 cobrança pendente',
    tone: 'warning',
  },
];

export const studentCharges: readonly StudentCharge[] = [
  {
    id: 1,
    reference: 'Setembro/2026',
    dueDate: '10/09/2026',
    amount: 'R$ 249,90',
    status: 'Pendente',
    paymentMethod: '—',
  },
  {
    id: 2,
    reference: 'Agosto/2026',
    dueDate: '10/08/2026',
    amount: 'R$ 249,90',
    status: 'Pago',
    paymentMethod: 'PIX',
  },
  {
    id: 3,
    reference: 'Julho/2026',
    dueDate: '10/07/2026',
    amount: 'R$ 249,90',
    status: 'Pago',
    paymentMethod: 'Cartão de crédito',
  },
  {
    id: 4,
    reference: 'Junho/2026',
    dueDate: '10/06/2026',
    amount: 'R$ 249,90',
    status: 'Atrasado',
    paymentMethod: 'PIX',
  },
];
