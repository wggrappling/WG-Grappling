import type { ProfileSection } from '../../types/profile';
import type { Student } from '../../types';
import { ProfileInfoCard } from './ProfileInfoCard';

type Props = { student: Student };
const statusLabels = { ACTIVE: 'Ativo', PAUSED: 'Pausado', INACTIVE: 'Inativo' } as const;
const formatDate = (date: string) => new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(date));
const missing = 'Não disponível na API';

export function StudentProfileTab({ student }: Props) {
  const address = student.person.address;
  const responsible = student.responsibles?.[0]?.responsible;
  const sections: readonly ProfileSection[] = [
    { title: 'Dados Pessoais', fields: [
      { label: 'Nome', value: student.person.name }, { label: 'Matrícula', value: student.enrollmentNumber },
      { label: 'CPF', value: student.person.cpf }, { label: 'Telefone', value: student.person.phone ?? 'Não informado' },
      { label: 'E-mail', value: student.person.email }, { label: 'Data de nascimento', value: missing }, { label: 'Sexo', value: missing },
    ] },
    { title: 'Informações da Academia', fields: [
      { label: 'Status', value: statusLabels[student.status], badge: true }, { label: 'Data de matrícula', value: formatDate(student.joinedAt) },
      { label: 'Plano', value: student.plans?.map(({ plan }) => plan.name).join(', ') || 'Não informado' },
      { label: 'Modalidades', value: student.modalities?.filter(({ status }) => status === 'ACTIVE').map(({ modality }) => modality.name).join(', ') || 'Não informado' },
      { label: 'Turmas', value: student.studentClasses?.map(({ class: item }) => item.name).join(', ') || 'Não informado' },
      { label: 'Professor', value: [...new Set(student.studentClasses?.map(({ class: item }) => item.teacher.name) ?? [])].join(', ') || 'Não informado' },
      { label: 'Faixa atual', value: missing },
    ] },
    { title: 'Endereço', fields: address ? [
      { label: 'CEP', value: address.zipCode }, { label: 'Logradouro', value: address.street }, { label: 'Número', value: address.number ?? 'Sem número' },
      { label: 'Complemento', value: address.complement ?? 'Não informado' }, { label: 'Bairro', value: address.neighborhood }, { label: 'Cidade', value: address.city }, { label: 'Estado', value: address.state },
    ] : [{ label: 'Endereço', value: 'Não cadastrado' }] },
    { title: 'Responsável', fields: responsible ? [
      { label: 'Nome', value: responsible.name }, { label: 'Parentesco', value: responsible.relationship }, { label: 'Telefone', value: responsible.phone ?? 'Não informado' }, { label: 'E-mail', value: responsible.email ?? 'Não informado' },
    ] : [{ label: 'Responsável', value: 'Não cadastrado' }] },
  ];
  return <section id="panel-Perfil" className="profile-panel" role="tabpanel" aria-labelledby="tab-Perfil"><div className="profile-panel-heading"><div><p className="section-eyebrow">Visão geral</p><h2>Perfil do aluno</h2></div><p>Informações cadastrais e dados da academia.</p></div><div className="profile-card-grid">{sections.map((section) => <ProfileInfoCard key={section.title} {...section} />)}</div></section>;
}
