export const studentTabs = [
  'Perfil',
  'Documentos',
  'Financeiro',
  'Presença',
  'Graduação',
  'Comunicação',
  'Produtos',
  'Histórico',
] as const;

export type StudentTab = (typeof studentTabs)[number];

type StudentTabsProps = {
  activeTab: StudentTab;
  onTabChange: (tab: StudentTab) => void;
};

export function StudentTabs({ activeTab, onTabChange }: StudentTabsProps) {
  return (
    <nav className="profile-tabs" aria-label="Seções da ficha do aluno" role="tablist">
      {studentTabs.map((tab) => {
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
