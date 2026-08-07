import {
  unavailableAcademyFields,
  unavailableProfileSections,
  type ProfileSection,
} from '../../mocks/studentProfile';
import type { Student } from '../../types';
import { ProfileInfoCard } from './ProfileInfoCard';

type StudentProfileTabProps = {
  student: Student;
};

const statusLabels = {
  ACTIVE: 'Ativo',
  PAUSED: 'Pausado',
  INACTIVE: 'Inativo',
} as const;

const formatDate = (date: string) => new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'UTC',
}).format(new Date(date));

export function StudentProfileTab({ student }: StudentProfileTabProps) {
  const apiSections: readonly ProfileSection[] = [
    {
      title: 'Dados Pessoais',
      fields: [
        { label: 'Nome', value: student.person.name },
        { label: 'Matrícula', value: student.enrollmentNumber },
        { label: 'CPF', value: student.person.cpf },
        { label: 'Telefone', value: student.person.phone ?? 'Não informado' },
        { label: 'E-mail', value: student.person.email },
      ],
    },
    {
      title: 'Informações da Academia',
      fields: [
        { label: 'Status', value: statusLabels[student.status], badge: true },
        { label: 'Data de matrícula', value: formatDate(student.joinedAt) },
        ...unavailableAcademyFields,
      ],
    },
  ];
  const sections = [...apiSections, ...unavailableProfileSections];

  return (
    <section id="panel-Perfil" className="profile-panel" role="tabpanel" aria-labelledby="tab-Perfil">
      <div className="profile-panel-heading">
        <div>
          <p className="section-eyebrow">Visão geral</p>
          <h2>Perfil do aluno</h2>
        </div>
        <p>Informações cadastrais e dados da academia.</p>
      </div>

      <div className="profile-card-grid">
        {sections.map((section) => <ProfileInfoCard key={section.title} {...section} />)}
      </div>
    </section>
  );
}
