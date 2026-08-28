import { Link } from 'react-router-dom';
import { useSelfServiceResource } from '../../hooks/useSelfServiceResource';
import { selfService } from '../../services';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function CardState({ loading, forbidden, error, retry, empty }: { loading: boolean; forbidden: boolean; error: Error | null; retry: () => void; empty: string }) {
  if (loading) return <p className="student-dashboard-state" aria-live="polite">Carregando...</p>;
  if (forbidden) return <p className="student-dashboard-state" role="alert">Informação indisponível.</p>;
  if (error) return <p className="student-dashboard-state" role="alert">Não foi possível carregar. <button type="button" onClick={retry}>Tentar novamente</button></p>;
  return <p className="student-dashboard-state">{empty}</p>;
}

export function StudentHomeDashboard() {
  const notices = useSelfServiceResource(() => selfService.notices());
  const graduations = useSelfServiceResource(() => selfService.graduations());
  const modalities = useSelfServiceResource(() => selfService.modalities());
  const finance = useSelfServiceResource(() => selfService.finance());
  const documents = useSelfServiceResource(() => selfService.documents());
  const unread = notices.data?.filter((notice) => !notice.isRead).length;
  const graduation = graduations.data?.current[0];
  const currentModalities = modalities.data?.current.slice(0, 2) ?? [];
  const availableDocuments = documents.data?.filter((document) => document.available).length;

  return <>
    <section className="student-dashboard-grid" aria-label="Resumo da sua área">
      <article className="student-card"><h2>Avisos</h2>{unread !== undefined ? <p><strong>{unread}</strong> {unread === 1 ? 'aviso não lido' : 'avisos não lidos'}</p> : <CardState {...notices} retry={() => void notices.refresh()} empty="Nenhum aviso no momento." />}<Link to="/app/notices">Ver avisos</Link></article>
      <article className="student-card"><h2>Graduação</h2>{graduation ? <p><strong>{graduation.modality.name}</strong><br />{graduation.graduationLevel?.name ?? graduation.belt ?? 'Graduação registrada'}</p> : <CardState {...graduations} retry={() => void graduations.refresh()} empty="Nenhuma graduação atual." />}<Link to="/app/graduation">Ver graduação</Link></article>
      <article className="student-card"><h2>Modalidades</h2>{modalities.data ? currentModalities.length ? <p>{currentModalities.map((item) => item.modality.name).join(' · ')}</p> : <p>Nenhuma modalidade atual.</p> : <CardState {...modalities} retry={() => void modalities.refresh()} empty="Nenhuma modalidade atual." />}<Link to="/app/modalities">Ver modalidades</Link></article>
      <article className="student-card"><h2>Financeiro</h2>{finance.data ? <p><strong>{finance.data.situation.openChargeCount}</strong> cobranças em aberto<br /><span>Saldo {money.format(finance.data.situation.openBalance)}</span></p> : <CardState {...finance} retry={() => void finance.refresh()} empty="Nenhuma informação financeira." />}<Link to="/app/finance">Ver financeiro</Link></article>
      <article className="student-card"><h2>Documentos</h2>{availableDocuments !== undefined ? <p><strong>{availableDocuments}</strong> {availableDocuments === 1 ? 'documento disponível' : 'documentos disponíveis'}</p> : <CardState {...documents} retry={() => void documents.refresh()} empty="Nenhum documento disponível." />}<Link to="/app/documents">Ver documentos</Link></article>
    </section>
    <section className="student-home-shortcuts" aria-label="Outros acessos"><Link to="/app/shop"><strong>Loja</strong><span>Ver catálogo e pedidos</span></Link><Link to="/app/profile"><strong>Perfil</strong><span>Ver meus dados</span></Link></section>
  </>;
}
