import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApiRequest, useAuth } from '../hooks';
import { dashboardService } from '../services';
import type { DashboardSummary } from '../types/dashboard';

const belts = { WHITE: 'Branca', BLUE: 'Azul', PURPLE: 'Roxa', BROWN: 'Marrom', BLACK: 'Preta' } as const;
const date = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' });

export function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { data, loading, error, execute } = useApiRequest<DashboardSummary>();
  useEffect(() => { void execute(dashboardService.summary).catch(() => undefined); }, [execute]);

  return <main className="dashboard-page">
    <div className="session-bar"><span>Conectado como <strong>{user?.name}</strong></span><button type="button" onClick={() => { logout(); navigate('/login', { replace: true }); }}>Sair</button></div>
    <header className="dashboard-header"><div><p className="section-eyebrow">Operação de hoje</p><h1>Dashboard</h1><p>Resumo atualizado com dados reais da academia.</p></div><div className="dashboard-actions"><button className="secondary-action-button" onClick={() => navigate('/students')}>Alunos</button><button className="open-student-button" onClick={() => navigate('/students/new')}>Novo aluno</button><button className="secondary-action-button" onClick={() => navigate('/attendance')}>Realizar chamada</button><button className="secondary-action-button" onClick={() => navigate('/reports')}>Relatórios</button>{(user?.role === 'OWNER' || user?.role === 'ADMIN') && <button className="secondary-action-button" onClick={() => navigate('/admin')}>Administração</button>}</div></header>
    {loading && <section className="dashboard-state"><span className="loading-spinner" /><p>Carregando resumo operacional...</p></section>}
    {error && <section className="dashboard-state dashboard-error" role="alert"><strong>Não foi possível carregar o dashboard.</strong><p>{error.message}</p><button className="secondary-action-button" onClick={() => void execute(dashboardService.summary)}>Tentar novamente</button></section>}
    {!loading && !error && data && <>
      <section className="dashboard-cards" aria-label="Resumo geral">
        <article><span>Alunos ativos</span><strong>{data.activeStudents}</strong></article>
        <article><span>Cobranças pendentes</span><strong>{data.pendingCharges}</strong></article>
        <article className={data.overdueCharges ? 'dashboard-alert-card' : ''}><span>Cobranças vencidas</span><strong>{data.overdueCharges}</strong></article>
        <article><span>Aulas hoje</span><strong>{data.todayClasses.length}</strong></article>
      </section>
      <div className="dashboard-sections">
        <section className="dashboard-panel"><header><h2>Aulas de hoje</h2><span>{data.todayClasses.length}</span></header>{data.todayClasses.length === 0 ? <div className="dashboard-empty">Nenhuma aula programada para hoje.</div> : <div className="dashboard-list">{data.todayClasses.map((item) => <article key={item.id}><div><strong>{item.name}</strong><small>{item.modality} · Prof. {item.teacher}</small></div><span>{item.startTime}–{item.endTime}</span></article>)}</div>}</section>
        <section className="dashboard-panel"><header><h2>Presença de hoje</h2></header><div className="attendance-summary"><div><strong>{data.todayAttendance.present}</strong><span>Presentes</span></div><div><strong>{data.todayAttendance.absent}</strong><span>Ausentes</span></div><div><strong>{data.todayAttendance.justified}</strong><span>Justificadas</span></div></div>{data.todayAttendance.present + data.todayAttendance.absent + data.todayAttendance.justified === 0 && <div className="dashboard-empty">Nenhuma presença registrada hoje.</div>}</section>
        <section className="dashboard-panel dashboard-wide"><header><h2>Graduações recentes</h2><span>{data.recentGraduations.length}</span></header>{data.recentGraduations.length === 0 ? <div className="dashboard-empty">Nenhuma graduação registrada.</div> : <div className="dashboard-list">{data.recentGraduations.map((item) => <article key={item.id}><div><strong>{item.student}</strong><small>{item.modality} · Faixa {belts[item.belt]}</small></div><span>{date.format(new Date(item.graduatedAt))}</span></article>)}</div>}</section>
      </div>
    </>}
  </main>;
}
