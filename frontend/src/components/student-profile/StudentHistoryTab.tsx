import { useState } from 'react';
import {
  eventTypeByFilter,
  studentHistoryEvents,
  type HistoryFilter,
} from '../../mocks/studentHistory';
import { HistoryFilters } from './HistoryFilters';
import { HistoryTimelineEvent } from './HistoryTimelineEvent';

export function StudentHistoryTab() {
  const [activeFilter, setActiveFilter] = useState<HistoryFilter>('Todos');
  const visibleEvents = activeFilter === 'Todos'
    ? studentHistoryEvents
    : studentHistoryEvents.filter((event) => eventTypeByFilter[activeFilter].includes(event.type));

  return (
    <section
      id="panel-Histórico"
      className="history-panel"
      role="tabpanel"
      aria-labelledby="tab-Histórico"
    >
      <div className="history-panel-heading">
        <div>
          <p className="section-eyebrow">Linha do tempo</p>
          <h2>Histórico do aluno</h2>
          <p>Acompanhe as principais atividades e alterações do cadastro.</p>
        </div>
        <span className="history-event-count">{visibleEvents.length} eventos</span>
      </div>

      <HistoryFilters activeFilter={activeFilter} onFilterChange={setActiveFilter} />

      <div className="history-timeline" aria-live="polite">
        {visibleEvents.map((event, index) => (
          <HistoryTimelineEvent
            key={event.id}
            event={event}
            isLast={index === visibleEvents.length - 1}
          />
        ))}
      </div>
    </section>
  );
}
