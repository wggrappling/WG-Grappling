import type { Student } from '../../types';
import { StudentDocumentsTab } from './StudentDocumentsTab';
import { StudentFinancialTab } from './StudentFinancialTab';
import { StudentHistoryTab } from './StudentHistoryTab';
import { StudentProfileTab } from './StudentProfileTab';
import { StudentAttendanceTab } from './StudentAttendanceTab';
import type { StudentTab } from './StudentTabs';

type StudentTabPanelProps = {
  activeTab: StudentTab;
  student: Student;
};

export function StudentTabPanel({ activeTab, student }: StudentTabPanelProps) {
  if (activeTab === 'Perfil') return <StudentProfileTab student={student} />;
  if (activeTab === 'Documentos') return <StudentDocumentsTab studentId={student.id} />;
  if (activeTab === 'Financeiro') return <StudentFinancialTab studentId={student.id} />;
  if (activeTab === 'Presença') return <StudentAttendanceTab studentId={student.id} />;
  if (activeTab === 'Histórico') return <StudentHistoryTab />;

  return (
    <section id={`panel-${activeTab}`} className="tab-placeholder" role="tabpanel" aria-labelledby={`tab-${activeTab}`}>
      <div className="placeholder-icon" aria-hidden="true">WG</div>
      <h2>{activeTab}</h2>
      <p>Em desenvolvimento</p>
    </section>
  );
}
