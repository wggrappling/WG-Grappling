import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useApiRequest } from '../../hooks';
import { chargeService } from '../../services';
import type { ApiListResponse, Charge, PaymentMethod } from '../../types';
import { FinancialStatusBadge } from './FinancialStatusBadge';
import { FinancialSummaryCard, type FinancialSummaryItem } from './FinancialSummaryCard';

const openStatuses = new Set(['PENDING', 'PARTIALLY_PAID', 'OVERDUE']);
const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const date = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' });
const methods: Record<PaymentMethod, string> = { PIX: 'PIX', CASH: 'Dinheiro', TRANSFER: 'Transferência' };
const formatCurrency = (value: string | number) => currency.format(Number(value));
const formatDate = (value: string) => date.format(new Date(value));

export function StudentFinancialTab({ studentId }: { studentId: number }) {
  const { data, error, loading, execute } = useApiRequest<ApiListResponse<Charge>, [number]>();
  const [selected, setSelected] = useState<Charge | null>(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('PIX');
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const load = useCallback(() => execute(chargeService.getAll, studentId), [execute, studentId]);

  useEffect(() => { void load().catch(() => undefined); }, [load]);
  const charges = useMemo(() => [...(data?.data ?? [])].sort((a, b) => Date.parse(b.dueDate) - Date.parse(a.dueDate)), [data]);
  const open = charges.filter((charge) => openStatuses.has(charge.status));
  const totalBalance = open.reduce((sum, charge) => sum + Number(charge.balance), 0);
  const totalPaid = charges.reduce((sum, charge) => sum + Number(charge.totalPaid), 0);
  const summary: readonly FinancialSummaryItem[] = [
    { label: 'Total em aberto', value: formatCurrency(totalBalance), detail: `${open.length} cobrança(s)`, tone: totalBalance > 0 ? 'warning' : 'success' },
    { label: 'Total pago', value: formatCurrency(totalPaid), detail: 'Pagamentos registrados', tone: 'success' },
    { label: 'Situação', value: charges.some((item) => item.status === 'OVERDUE') ? 'Em atraso' : open.length ? 'Em aberto' : 'Em dia', detail: 'Calculada pelas cobranças', tone: open.length ? 'warning' : 'success' },
    { label: 'PIX automático', value: 'Em desenvolvimento', detail: 'Sem gateway integrado', tone: 'neutral' },
  ];

  const openPayment = (charge: Charge) => { setSelected(charge); setAmount(String(charge.balance)); setMessage(null); setSubmitError(null); };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected || submitting) return;
    setSubmitting(true); setSubmitError(null);
    try {
      const result = await chargeService.registerPayment(selected.id, { amount: Number(amount), method, paidAt: `${paidAt}T00:00:00.000Z`, ...(reference.trim() ? { reference: reference.trim() } : {}) });
      setSelected(null); setMessage(result.message); await load();
    } catch (cause) { setSubmitError(cause instanceof Error ? cause.message : 'Não foi possível registrar o pagamento.'); }
    finally { setSubmitting(false); }
  };

  return <section id="panel-Financeiro" className="financial-panel" role="tabpanel" aria-labelledby="tab-Financeiro">
    <div className="financial-panel-heading"><div><p className="section-eyebrow">Visão financeira</p><h2>Resumo Financeiro</h2><p>Cobranças, saldos e pagamentos reais do aluno.</p></div></div>
    {message && <div className="financial-success" role="status">{message}</div>}
    {loading && <div className="financial-state"><span className="loading-spinner" /><p>Carregando cobranças...</p></div>}
    {error && <div className="financial-state financial-state-error" role="alert"><strong>Não foi possível carregar as cobranças.</strong><p>{error.message}</p></div>}
    {!loading && !error && <><div className="financial-summary-grid">{summary.map((item) => <FinancialSummaryCard key={item.label} {...item} />)}</div><div className="financial-table-section"><div className="financial-table-heading"><h3>Cobranças e pagamentos</h3><span>{charges.length} lançamento(s)</span></div>
      {charges.length === 0 ? <div className="financial-state"><strong>Nenhuma cobrança encontrada</strong></div> : <div className="financial-table-scroll"><table className="financial-table"><thead><tr><th>Descrição</th><th>Total</th><th>Pago</th><th>Saldo</th><th>Status</th><th>Pagamentos</th><th>Ação</th></tr></thead><tbody>{charges.map((charge) => <tr key={charge.id}><td><strong>{charge.description}</strong><small>{formatDate(charge.dueDate)}</small></td><td>{formatCurrency(charge.finalAmount)}</td><td>{formatCurrency(charge.totalPaid)}</td><td>{formatCurrency(charge.balance)}</td><td><FinancialStatusBadge status={charge.status} /></td><td>{charge.payments.length === 0 ? 'Sem pagamentos' : charge.payments.map((payment) => <div key={payment.id} className="payment-entry">{formatDate(payment.paidAt)} · {methods[payment.method]} · {formatCurrency(payment.amount)}{payment.reference ? ` · ${payment.reference}` : ''}</div>)}</td><td>{openStatuses.has(charge.status) && charge.balance > 0 ? <button className="secondary-action-button" type="button" onClick={() => openPayment(charge)}>Registrar pagamento</button> : '—'}</td></tr>)}</tbody></table></div>}
    </div></>}
    {selected && <div className="payment-modal-backdrop" role="presentation"><form className="payment-modal" onSubmit={submit}><h3>Registrar pagamento</h3><p>Saldo atual: <strong>{formatCurrency(selected.balance)}</strong></p>{submitError && <div className="form-error" role="alert">{submitError}</div>}<label>Valor<input type="number" min="0.01" max={selected.balance} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required /></label><label>Método<select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>{Object.entries(methods).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Data<input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} required /></label><label>Referência<input value={reference} onChange={(e) => setReference(e.target.value)} /></label><small>PIX registra somente um pagamento já realizado; não gera QR Code.</small><div className="payment-modal-actions"><button type="button" className="secondary-action-button" onClick={() => setSelected(null)} disabled={submitting}>Cancelar</button><button type="submit" className="primary-action-button" disabled={submitting}>{submitting ? 'Registrando...' : 'Confirmar pagamento'}</button></div></form></div>}
  </section>;
}
