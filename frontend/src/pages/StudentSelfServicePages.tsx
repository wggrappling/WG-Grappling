import { useCallback, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ResourceState } from '../components/self-service/ResourceState';
import { useSelfServiceResource } from '../hooks';
import { selfService } from '../services';

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' });
const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const date = (value?: string | null) => value ? dateFormatter.format(new Date(value)) : '—';
const money = (value: number) => currencyFormatter.format(value);
const statusLabel: Record<string, string> = {
  ACTIVE: 'Ativo', PAUSED: 'Pausado', INACTIVE: 'Inativo', FINISHED: 'Encerrado',
  CANCELLED: 'Cancelado', SUPERSEDED: 'Substituído', PRESENT: 'Presente',
  ABSENT: 'Ausente', JUSTIFIED: 'Justificada', PENDING: 'Pendente',
  PARTIALLY_PAID: 'Pago parcialmente', PAID: 'Pago', OVERDUE: 'Vencido',
  REFUNDED: 'Estornado', VALID: 'Válido', PIX: 'Pix', CASH: 'Dinheiro', TRANSFER: 'Transferência',
};
const statusClass = (status: string) => `student-pill student-pill-${status.toLowerCase().replace('_', '-')}`;

function PageHeader({ title, description }: { title: string; description: string }) {
  return <header className="student-page-header"><h1>{title}</h1><p>{description}</p></header>;
}

function PausedBanner({ paused }: { paused: boolean }) {
  return paused ? <div className="student-status-banner" role="status"><strong>Matrícula pausada</strong><br />Seu acesso permanece disponível somente para consulta.</div> : null;
}

export function StudentHomePage() {
  const load = useCallback(() => selfService.me(), []);
  const resource = useSelfServiceResource(load, [load]);
  return <>
    <PageHeader title="Início" description="Seu espaço acadêmico, com informações da sua matrícula." />
    <ResourceState {...resource} onRetry={() => void resource.refresh()}>
      {resource.data && <>
        <PausedBanner paused={resource.data.student.status === 'PAUSED'} />
        <section className="student-card">
          <p className="student-pill">Matrícula {resource.data.student.enrollmentNumber}</p>
          <h2>{resource.data.student.name}</h2>
          <p>Status acadêmico: <strong>{statusLabel[resource.data.student.status]}</strong></p>
        </section>
        <section className="student-quick-links" aria-label="Acessos acadêmicos">
          <Link to="/app/graduation"><strong>Graduação</strong><span>Atual e histórico</span></Link>
          <Link to="/app/modalities"><strong>Modalidades</strong><span>Vínculos atuais e encerrados</span></Link>
          <Link to="/app/attendance"><strong>Presença</strong><span>Últimos 90 dias</span></Link>
          <Link to="/app/finance"><strong>Financeiro</strong><span>Plano e cobranças</span></Link>
        </section>
      </>}
    </ResourceState>
  </>;
}

export function StudentGraduationsPage() {
  const load = useCallback(() => selfService.graduations(), []);
  const resource = useSelfServiceResource(load, [load]);
  const empty = Boolean(resource.data && resource.data.current.length === 0 && resource.data.history.length === 0);
  return <>
    <PageHeader title="Graduação" description="Sua graduação atual e os registros do seu histórico." />
    <ResourceState {...resource} empty={empty} emptyMessage="Nenhuma graduação registrada." onRetry={() => void resource.refresh()}>
      {resource.data && <div className="student-grid student-grid-two">
        <section className="student-card"><h2>Atual</h2><div className="student-list">{resource.data.current.map((item) => <article key={item.id}><div><strong>{item.graduationLevel?.name ?? item.belt ?? 'Graduação registrada'}</strong><small>{item.modality.name} · {date(item.graduatedAt)}{item.degree !== null ? ` · Grau ${item.degree}` : ''}</small></div><span className="student-pill student-pill-active">Atual</span></article>)}</div>{resource.data.current.length === 0 && <p>Nenhuma graduação vigente.</p>}</section>
        <section className="student-card"><h2>Histórico</h2><div className="student-list">{resource.data.history.map((item) => <article key={item.id}><div><strong>{item.graduationLevel?.name ?? item.belt ?? 'Graduação registrada'}</strong><small>{item.modality.name} · {date(item.graduatedAt)}</small></div><span className={statusClass(item.status)}>{statusLabel[item.status]}</span></article>)}</div></section>
      </div>}
    </ResourceState>
  </>;
}

export function StudentModalitiesPage() {
  const load = useCallback(() => selfService.modalities(), []);
  const resource = useSelfServiceResource(load, [load]);
  const empty = Boolean(resource.data && resource.data.current.length === 0 && resource.data.history.length === 0);
  return <>
    <PageHeader title="Modalidades" description="Seus vínculos atuais e o histórico de modalidades." />
    <ResourceState {...resource} empty={empty} emptyMessage="Nenhuma modalidade vinculada." onRetry={() => void resource.refresh()}>
      {resource.data && <div className="student-grid student-grid-two">
        <section className="student-card"><h2>Atuais</h2><div className="student-list">{resource.data.current.map((item) => <article key={item.id}><div><strong>{item.modality.name}</strong><small>Desde {date(item.startedAt)} · {item.modality.description}</small></div><span className={statusClass(item.status)}>{statusLabel[item.status]}</span></article>)}</div></section>
        <section className="student-card"><h2>Histórico</h2><div className="student-list">{resource.data.history.map((item) => <article key={item.id}><div><strong>{item.modality.name}</strong><small>Encerrada em {date(item.finishedAt)}</small></div><span className="student-pill">Encerrado</span></article>)}</div>{resource.data.history.length === 0 && <p>Nenhum vínculo encerrado.</p>}</section>
      </div>}
    </ResourceState>
  </>;
}

export function StudentAttendancePage() {
  const [period, setPeriod] = useState({ startDate: '', endDate: '' });
  const [applied, setApplied] = useState({ startDate: '', endDate: '' });
  const load = useCallback(() => selfService.attendance(applied.startDate || undefined, applied.endDate || undefined), [applied]);
  const resource = useSelfServiceResource(load, [load]);
  const submit = (event: FormEvent) => { event.preventDefault(); setApplied(period); };
  return <>
    <PageHeader title="Presença" description="Registros do período consultado. O padrão mostra os últimos 90 dias." />
    <form className="student-filters" onSubmit={submit} aria-label="Filtrar presença por período">
      <label>Data inicial<input type="date" value={period.startDate} onChange={(event) => setPeriod((current) => ({ ...current, startDate: event.target.value }))} /></label>
      <label>Data final<input type="date" value={period.endDate} onChange={(event) => setPeriod((current) => ({ ...current, endDate: event.target.value }))} /></label>
      <button type="submit">Aplicar filtro</button>
    </form>
    <ResourceState {...resource} empty={Boolean(resource.data && resource.data.records.length === 0)} emptyMessage="Nenhum registro de presença neste período." onRetry={() => void resource.refresh()}>
      {resource.data && <>
        <section className="student-summary" aria-label="Resumo de presença">
          <article><strong>{resource.data.summary.total}</strong><span>Total</span></article>
          <article><strong>{resource.data.summary.present}</strong><span>Presentes</span></article>
          <article><strong>{resource.data.summary.absent}</strong><span>Ausentes</span></article>
          <article><strong>{resource.data.summary.justified}</strong><span>Justificadas</span></article>
        </section>
        <p>Período: {date(resource.data.period.startDate)} a {date(resource.data.period.endDate)}</p>
        <section className="student-list">{resource.data.records.map((item) => <article key={item.id}><div><strong>{item.class.name}</strong><small>{item.class.modality.name} · {date(item.attendanceDate)}</small></div><span className={statusClass(item.status)}>{statusLabel[item.status]}</span></article>)}</section>
      </>}
    </ResourceState>
  </>;
}

export function StudentFinancePage() {
  const load = useCallback(() => selfService.finance(), []);
  const resource = useSelfServiceResource(load, [load]);
  return <>
    <PageHeader title="Financeiro" description="Seu plano e financeiro acadêmico, separados da Loja." />
    <ResourceState {...resource} onRetry={() => void resource.refresh()}>
      {resource.data && <div className="student-grid">
        <section className="student-summary" aria-label="Situação financeira">
          <article><strong>{resource.data.situation.openChargeCount}</strong><span>Cobranças em aberto</span></article>
          <article><strong>{money(resource.data.situation.openBalance)}</strong><span>Saldo em aberto</span></article>
          <article><strong>{resource.data.situation.overdueChargeCount}</strong><span>Cobranças vencidas</span></article>
          <article><strong>{money(resource.data.situation.overdueBalance)}</strong><span>Saldo vencido</span></article>
        </section>
        <section className="student-card"><h2>Plano atual</h2><div className="student-list">{resource.data.plans.current.map((item) => <article key={item.id}><div><strong>{item.plan.name}</strong><small>{item.plan.weeklyClasses} aulas/semana · vencimento dia {item.billingDay}</small></div><span>{money(item.monthlyPrice)}</span></article>)}</div>{resource.data.plans.current.length === 0 && <p>Nenhum plano atual.</p>}</section>
        <section className="student-card"><h2>Cobranças</h2><div className="student-list">{resource.data.charges.map((item) => <article key={item.id}><div><strong>{item.description}</strong><small>Vencimento {date(item.dueDate)} · Saldo {money(item.balance)}</small></div><span className={statusClass(item.status)}>{statusLabel[item.status]}</span></article>)}</div>{resource.data.charges.length === 0 && <p>Nenhuma cobrança acadêmica.</p>}</section>
        <section className="student-card"><h2>Pagamentos</h2><div className="student-list">{resource.data.payments.map((item) => <article key={item.id}><div><strong>{money(item.amount)}</strong><small>{date(item.paidAt)} · {statusLabel[item.method]}</small></div><span className={statusClass(item.state)}>{statusLabel[item.state]}</span></article>)}</div>{resource.data.payments.length === 0 && <p>Nenhum pagamento registrado.</p>}</section>
      </div>}
    </ResourceState>
  </>;
}

export function StudentProfilePage() {
  const load = useCallback(() => selfService.profile(), []);
  const resource = useSelfServiceResource(load, [load]);
  return <>
    <PageHeader title="Perfil" description="Dados aprovados para consulta na sua área do aluno." />
    <ResourceState {...resource} onRetry={() => void resource.refresh()}>
      {resource.data && <>
        <PausedBanner paused={resource.data.studentStatus === 'PAUSED'} />
        <section className="student-card student-profile-identity"><div className="student-profile-avatar" aria-hidden="true">{resource.data.name.trim().charAt(0).toUpperCase()}</div><div><h2>{resource.data.name}</h2><p>Matrícula {resource.data.enrollmentNumber} · {statusLabel[resource.data.studentStatus]}</p></div></section>
        <section className="student-card"><h2>Dados pessoais</h2><dl className="student-profile-list">
          <div><dt>E-mail</dt><dd>{resource.data.email}</dd></div><div><dt>Telefone</dt><dd>{resource.data.phone ?? 'Não informado'}</dd></div><div><dt>CPF</dt><dd>{resource.data.maskedCpf}</dd></div><div><dt>Entrada</dt><dd>{date(resource.data.joinedAt)}</dd></div>
        </dl></section>
        <section className="student-card"><h2>Endereço</h2>{resource.data.address ? <address className="student-profile-address">{resource.data.address.street}, {resource.data.address.number ?? 's/n'}{resource.data.address.complement ? ` · ${resource.data.address.complement}` : ''}<br />{resource.data.address.neighborhood} · {resource.data.address.city}/{resource.data.address.state}<br />CEP {resource.data.address.zipCode} · {resource.data.address.country}</address> : <p>Endereço não informado.</p>}</section>
        <section className="student-card"><h2>Segurança</h2><p>Alterações de e-mail, senha e dados cadastrais devem ser solicitadas à academia.</p></section>
        <section className="student-quick-links"><Link to="/app/modalities"><strong>Modalidades</strong><span>Consultar vínculos</span></Link><Link to="/app/attendance"><strong>Presença</strong><span>Consultar registros</span></Link></section>
      </>}
    </ResourceState>
  </>;
}

export function StudentUnavailablePage({ kind }: { kind: 'shop' | 'notices' }) {
  const shop = kind === 'shop';
  return <section className="student-card student-placeholder"><PageHeader title={shop ? 'Loja' : 'Avisos'} description={shop ? 'A Loja faz parte da experiência planejada do aluno.' : 'Este será o espaço para comunicações destinadas a você.'} /><div className="student-state"><strong>Em breve</strong><p>{shop ? 'Catálogo, carrinho e compras ainda não estão disponíveis.' : 'O sistema de avisos ainda não está disponível.'}</p></div></section>;
}
