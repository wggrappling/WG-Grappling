import type { HistoryEventType, StudentHistoryEvent } from '../../mocks/studentHistory';

type HistoryTimelineEventProps = {
  event: StudentHistoryEvent;
  isLast: boolean;
};

const eventVisuals: Record<HistoryEventType, { icon: string; className: string }> = {
  Matrícula: { icon: '✦', className: 'enrollment' },
  Pagamento: { icon: '$', className: 'payment' },
  Presença: { icon: '✓', className: 'attendance' },
  Graduação: { icon: '★', className: 'graduation' },
  Documento: { icon: '▤', className: 'document' },
  Plano: { icon: '◇', className: 'plan' },
  Comunicação: { icon: '✉', className: 'communication' },
};

export function HistoryTimelineEvent({ event, isLast }: HistoryTimelineEventProps) {
  const visual = eventVisuals[event.type];

  return (
    <article className={`timeline-event ${isLast ? 'last' : ''}`}>
      <div className="timeline-date">
        <strong>{event.date}</strong>
        <span>{event.time}</span>
      </div>

      <div className="timeline-marker-column" aria-hidden="true">
        <span className={`timeline-icon ${visual.className}`}>{visual.icon}</span>
        {!isLast && <span className="timeline-line" />}
      </div>

      <div className="timeline-content">
        <span className={`timeline-type ${visual.className}`}>{event.type}</span>
        <p>{event.description}</p>
        <small>Responsável: <strong>{event.responsibleUser}</strong></small>
      </div>
    </article>
  );
}
