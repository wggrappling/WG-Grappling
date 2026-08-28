import { Link } from 'react-router-dom';
import { ResourceState } from '../components/self-service/ResourceState';
import { useSelfServiceResource } from '../hooks/useSelfServiceResource';
import { selfService } from '../services';
import type { SelfScheduleClass } from '../types/self-service';

const fullDate = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'short', timeZone: 'UTC' });
const shortDate = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'UTC' });
const label = (value: string, short = false) => (short ? shortDate : fullDate).format(new Date(`${value}T00:00:00.000Z`));

function ClassInfo({ item, compact = false }: { item: SelfScheduleClass; compact?: boolean }) {
  return <div><strong>{item.modalityName}</strong><span>{item.className}</span><time dateTime={`${item.date}T${item.startTime}`}>{label(item.date, compact)} · {item.startTime}–{item.endTime}</time></div>;
}

export function NextClassSection() {
  const resource = useSelfServiceResource(() => selfService.schedule());
  return <section className="student-card student-next-class" aria-labelledby="next-class-title"><div className="student-section-heading"><h2 id="next-class-title">Próxima aula</h2><Link to="/app/schedule">Ver agenda</Link></div>
    {resource.loading ? <div className="student-inline-state" aria-live="polite">Carregando próxima aula...</div> : resource.forbidden ? <div className="student-inline-state" role="alert">Agenda indisponível.</div> : resource.error ? <div className="student-inline-state" role="alert">Não foi possível carregar a próxima aula. <button type="button" onClick={() => void resource.refresh()}>Tentar novamente</button></div> : resource.data?.next ? <ClassInfo item={resource.data.next} /> : <div className="student-inline-state">Nenhuma próxima aula encontrada.</div>}
  </section>;
}

export function StudentSchedulePage() {
  const resource = useSelfServiceResource(() => selfService.schedule());
  return <><header className="student-page-header"><h1>Agenda</h1><p>Horários recorrentes das turmas às quais você está vinculado.</p></header><ResourceState {...resource} empty={Boolean(resource.data && !resource.data.next)} emptyMessage="Nenhuma próxima aula encontrada." onRetry={() => void resource.refresh()}>
    {resource.data?.next && <div className="student-schedule"><section className="student-card student-next-class"><p className="student-store-eyebrow">Próxima aula</p><ClassInfo item={resource.data.next} /></section><section aria-labelledby="upcoming-title"><h2 id="upcoming-title">Próximas aulas</h2>{resource.data.upcoming.length > 0 ? <div className="student-schedule-list">{resource.data.upcoming.map((item, index) => <article key={`${item.date}-${item.startTime}-${item.className}-${index}`}><ClassInfo item={item} compact /></article>)}</div> : <p>Nenhuma outra aula na janela atual.</p>}</section></div>}
  </ResourceState></>;
}
