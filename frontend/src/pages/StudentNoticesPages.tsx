import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ResourceState } from '../components/self-service/ResourceState';
import { useSelfServiceResource } from '../hooks/useSelfServiceResource';
import { selfService } from '../services';
import type { SelfNotice } from '../types/self-service';

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

function NoticeHeader({ detail = false }: { detail?: boolean }) {
  return <header className="student-page-header"><h1>Avisos</h1><p>{detail ? 'Comunicação destinada a você.' : 'Comunicados da academia para o seu contexto.'}</p></header>;
}

export function StudentNoticesPage() {
  const resource = useSelfServiceResource(() => selfService.notices());
  return <><NoticeHeader /><ResourceState {...resource} empty={resource.data?.length === 0} emptyMessage="Nenhum aviso no momento." onRetry={() => void resource.refresh()}>
    {resource.data && <section className="student-notice-list" aria-label="Avisos recebidos">{resource.data.map((notice) => <article key={notice.id} className={notice.isRead ? 'student-notice-read' : 'student-notice-unread'}>
      <span className="student-notice-dot" aria-hidden="true" />
      <div><span className="student-visually-hidden">{notice.isRead ? 'Lido' : 'Não lido'}: </span><Link to={`/app/notices/${notice.id}`}>{notice.title}</Link><time dateTime={notice.publishedAt}>{dateFormatter.format(new Date(notice.publishedAt))}</time></div>
    </article>)}</section>}
  </ResourceState></>;
}

export function StudentNoticePage() {
  const { noticeId = '' } = useParams();
  const parsedId = Number(noticeId);
  const resource = useSelfServiceResource(() => selfService.notice(parsedId), [parsedId]);
  const [notice, setNotice] = useState<SelfNotice | null>(null);
  const [marking, setMarking] = useState(false);
  const [markError, setMarkError] = useState('');
  const displayed = notice ?? resource.data;

  async function markRead() {
    setMarking(true);
    setMarkError('');
    try { setNotice(await selfService.markNoticeRead(parsedId)); }
    catch { setMarkError('Não foi possível marcar o aviso como lido.'); }
    finally { setMarking(false); }
  }

  return <><NoticeHeader detail /><ResourceState {...resource} onRetry={() => void resource.refresh()}>
    {displayed && <article className="student-card student-notice-detail">
      <Link className="student-back-link" to="/app/notices">← Voltar aos avisos</Link>
      <div><span className={`student-pill ${displayed.isRead ? '' : 'student-pill-active'}`}>{displayed.isRead ? 'Lido' : 'Não lido'}</span><h2>{displayed.title}</h2><time dateTime={displayed.publishedAt}>{dateFormatter.format(new Date(displayed.publishedAt))}</time></div>
      <p>{displayed.content}</p>
      {!displayed.isRead && <button type="button" disabled={marking} onClick={() => void markRead()}>{marking ? 'Marcando...' : 'Marcar como lido'}</button>}
      {markError && <p className="student-action-error" role="alert">{markError}</p>}
    </article>}
  </ResourceState></>;
}
