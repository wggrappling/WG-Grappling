import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { StudentTabPanel } from '../components/student-profile/StudentTabPanel';
import { EditStudentPanel } from '../components/student-profile/EditStudentPanel';
import { StudentTabs, studentTabs, type StudentTab } from '../components/student-profile/StudentTabs';
import { useApiRequest, useAuth } from '../hooks';
import { studentService } from '../services';
import type { Student, StudentStatus } from '../types';

const statusLabels: Record<StudentStatus, string> = {
  ACTIVE: 'Ativo',
  PAUSED: 'Pausado',
  INACTIVE: 'Inativo',
};

export function StudentCentralPage() {
  const [activeTab, setActiveTab] = useState<StudentTab>(studentTabs[0]);
  const [editing, setEditing] = useState(false);
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { studentId } = useParams();
  const { data: student, error, loading, execute } = useApiRequest<Student, [number]>();
  const numericStudentId = Number(studentId);
  const invalidStudentId = !Number.isInteger(numericStudentId) || numericStudentId <= 0;

  useEffect(() => {
    if (invalidStudentId) return;
    void execute(studentService.getById, numericStudentId).catch(() => undefined);
  }, [execute, invalidStudentId, numericStudentId]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  if (invalidStudentId || error) {
    return (
      <main className="student-profile-page">
        <section className="student-load-state" role="alert">
          <h1>Não foi possível carregar o aluno</h1>
          <p>{invalidStudentId ? 'O identificador informado é inválido.' : error?.message}</p>
        </section>
      </main>
    );
  }

  if (loading || !student) {
    return (
      <main className="student-profile-page">
        <section className="student-load-state" aria-live="polite">
          <span className="loading-spinner" aria-hidden="true" />
          <p>Carregando perfil do aluno...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="student-profile-page">
      <div className="session-bar">
        <span>Conectado como <strong>{user?.name}</strong></span>
        <button type="button" onClick={handleLogout}>Sair</button>
      </div>

      <section className="student-profile" aria-labelledby="student-name">
        {typeof location.state?.successMessage === 'string' && <div className="student-success" role="status">{location.state.successMessage}</div>}
        <div className="student-photo">
          <span aria-label="Foto não disponível">{student.person.name.split(/\s+/).slice(0, 2).map((name) => name[0]).join('').toUpperCase()}</span>
        </div>

        <div className="student-summary">
          <p className="eyebrow">Ficha do aluno</p>
          <div className="student-title-row">
            <h1 id="student-name">{student.person.name}</h1>
            <span className="status-badge">{statusLabels[student.status]}</span>
            {(user?.role === 'OWNER' || user?.role === 'ADMIN') && <button type="button" className="student-edit-button" onClick={() => setEditing(true)}>Editar aluno</button>}
          </div>

          <dl className="student-metadata">
            <div><dt>Matrícula</dt><dd>{student.enrollmentNumber}</dd></div>
            <div><dt>Faixa</dt><dd>Não disponível</dd></div>
            <div><dt>Modalidades</dt><dd>{student.modalities?.filter(({ status }) => status === 'ACTIVE').map(({ modality }) => modality.name).join(', ') || 'Não disponível'}</dd></div>
          </dl>
        </div>
      </section>

      <StudentTabs activeTab={activeTab} onTabChange={setActiveTab} />
      <StudentTabPanel activeTab={activeTab} student={student} />
      {editing && <EditStudentPanel student={student} onClose={() => setEditing(false)} onSaved={() => execute(studentService.getById, numericStudentId)} />}
    </main>
  );
}
