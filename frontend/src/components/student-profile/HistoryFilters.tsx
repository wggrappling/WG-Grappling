import { historyFilters, type HistoryFilter } from '../../mocks/studentHistory';

type HistoryFiltersProps = {
  activeFilter: HistoryFilter;
  onFilterChange: (filter: HistoryFilter) => void;
};

export function HistoryFilters({ activeFilter, onFilterChange }: HistoryFiltersProps) {
  return (
    <div className="history-filters" aria-label="Filtrar histórico">
      {historyFilters.map((filter) => (
        <button
          key={filter}
          className={filter === activeFilter ? 'history-filter active' : 'history-filter'}
          type="button"
          aria-pressed={filter === activeFilter}
          onClick={() => onFilterChange(filter)}
        >
          {filter}
        </button>
      ))}
    </div>
  );
}
