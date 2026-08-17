export const studentTabs = [
  'Perfil',
  'Documentos',
  'Financeiro',
  'Presença',
  'Graduação',
  'Histórico',
] as const;

export type StudentTab = (typeof studentTabs)[number];

type StudentTabsProps = {
  activeTab: StudentTab;
  onTabChange: (tab: StudentTab) => void;
};

export function StudentTabs({ activeTab, onTabChange }: StudentTabsProps) {
  const { user } = useAuth();
  const visibleTabs = user?.role === 'TEACHER' ? studentTabs.filter((tab) => !['Documentos', 'Financeiro'].includes(tab)) : studentTabs;
  return (
    <nav className="profile-tabs" aria-label="Seções da ficha do aluno" role="tablist">
      {visibleTabs.map((tab) => {
        const isActive = tab === activeTab;

        return (
          <button
            key={tab}
            id={`tab-${tab}`}
            className={isActive ? 'profile-tab active' : 'profile-tab'}
            type="button"
            role="tab"
            aria-controls={`panel-${tab}`}
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onTabChange(tab)}
          >
            {tab}
          </button>
        );
      })}
    </nav>
  );
}
import { useAuth } from '../../hooks';
