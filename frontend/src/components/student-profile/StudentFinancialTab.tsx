import { useEffect, useMemo } from 'react';
import { useApiRequest } from '../../hooks';
import { chargeService } from '../../services';
import type { ApiListResponse, Charge } from '../../types';
import { FinancialStatusBadge } from './FinancialStatusBadge';
import { FinancialSummaryCard, type FinancialSummaryItem } from './FinancialSummaryCard';

type StudentFinancialTabProps = {
  studentId: number;
};

const openStatuses = new Set(['PENDING', 'PARTIALLY_PAID', 'OVERDUE']);
const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const dateFormatter = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' });

const formatCurrency = (value: string | number) => currencyFormatter.format(Number(value));
const formatDate = (value: string) => dateFormatter.format(new Date(value));

const formatReferenceMonth = (value: string) => {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return value;

  const formatted = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${match[1]}-${match[2]}-01T00:00:00.000Z`));
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

const buildSummary = (charges: readonly Charge[]): readonly FinancialSummaryItem[] => {
  const openCharges = charges.filter((charge) => openStatuses.has(charge.status));
  const monthlyCharge = [...charges]
    .filter((charge) => charge.type === 'MONTHLY_FEE')
    .sort((a, b) => Date.parse(b.dueDate) - Date.parse(a.dueDate))[0];
  const nextCharge = [...openCharges].sort((a, b) => Date.parse(a.dueDate) - Date.parse(b.dueDate))[0];
  const hasOverdue = charges.some((charge) => charge.status === 'OVERDUE');
  const totalOpen = openCharges.reduce((total, charge) => total + Number(charge.finalAmount), 0);

  return [
    {
      label: 'Mensalidade mais recente',
      value: monthlyCharge ? formatCurrency(monthlyCharge.finalAmount) : 'Não disponível',
      detail: monthlyCharge?.plan?.name ?? monthlyCharge?.description ?? 'Nenhuma mensalidade encontrada',
      tone: 'primary',
    },
    {
      label: 'Próximo vencimento',
      value: nextCharge ? formatDate(nextCharge.dueDate) : '—',
      detail: nextCharge?.description ?? 'Nenhuma cobrança em aberto',
      tone: 'neutral',
    },
    {
      label: 'Situação',
      value: hasOverdue ? 'Em atraso' : openCharges.length > 0 ? 'Em aberto' : 'Em dia',
      detail: hasOverdue ? 'Há cobrança vencida' : `${openCharges.length} cobrança(s) em aberto`,
      tone: hasOverdue ? 'warning' : 'success',
    },
    {
      label: 'Total nominal em aberto',
      value: formatCurrency(totalOpen),
      detail: `${openCharges.length} cobrança(s); pagamentos parciais não são detalhados pela API`,
      tone: openCharges.length > 0 ? 'warning' : 'neutral',
    },
  ];
};

export function StudentFinancialTab({ studentId }: StudentFinancialTabProps) {
  const { data, error, loading, execute } = useApiRequest<ApiListResponse<Charge>>();
  const charges = useMemo(() => (data?.data ?? [])
    .filter((charge) => charge.studentId === studentId)
    .sort((a, b) => Date.parse(b.dueDate) - Date.parse(a.dueDate)), [data, studentId]);
  const summary = useMemo(() => buildSummary(charges), [charges]);

  useEffect(() => {
    void execute(chargeService.getAll).catch(() => undefined);
  }, [execute]);

  return (
    <section id="panel-Financeiro" className="financial-panel" role="tabpanel" aria-labelledby="tab-Financeiro">
      <div className="financial-panel-heading">
        <div>
          <p className="section-eyebrow">Visão financeira</p>
          <h2>Resumo Financeiro</h2>
          <p>Acompanhe mensalidades, vencimentos e pagamentos do aluno.</p>
        </div>
        <div className="financial-actions">
          <button className="secondary-action-button" type="button" disabled>Registrar Pagamento</button>
          <button className="primary-action-button" type="button" disabled>Gerar PIX</button>
        </div>
      </div>

      {loading && <div className="financial-state" aria-live="polite"><span className="loading-spinner" aria-hidden="true" /><p>Carregando cobranças...</p></div>}
      {error && <div className="financial-state financial-state-error" role="alert"><strong>Não foi possível carregar as cobranças.</strong><p>{error.message}</p></div>}

      {!loading && !error && (
        <>
          <div className="financial-summary-grid">
            {summary.map((item) => <FinancialSummaryCard key={item.label} {...item} />)}
          </div>

          <div className="financial-table-section">
            <div className="financial-table-heading">
              <h3>Histórico de cobranças</h3>
              <span>{charges.length} lançamento(s)</span>
            </div>

            {charges.length === 0 ? (
              <div className="financial-state">
                <strong>Nenhuma cobrança encontrada</strong>
                <p>Este aluno ainda não possui cobranças.</p>
              </div>
            ) : (
              <div className="financial-table-scroll">
                <table className="financial-table">
                  <thead><tr><th>Competência</th><th>Vencimento</th><th>Valor</th><th>Status</th><th>Forma de pagamento</th></tr></thead>
                  <tbody>
                    {charges.map((charge) => (
                      <tr key={charge.id}>
                        <td><strong>{formatReferenceMonth(charge.referenceMonth)}</strong></td>
                        <td>{formatDate(charge.dueDate)}</td>
                        <td>{formatCurrency(charge.finalAmount)}</td>
                        <td><FinancialStatusBadge status={charge.status} /></td>
                        <td>Não disponível</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
