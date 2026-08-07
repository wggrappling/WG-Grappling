export type ProfileField = {
  label: string;
  value: string | readonly string[];
  badge?: boolean;
};

export type ProfileSection = {
  title: string;
  fields: readonly ProfileField[];
};

export const unavailableAcademyFields: readonly ProfileField[] = [
  { label: 'Modalidades', value: 'Não disponível na API' },
  { label: 'Professor', value: 'Não disponível na API' },
  { label: 'Faixa atual', value: 'Não disponível na API' },
];

export const unavailableProfileSections: readonly ProfileSection[] = [
  {
    title: 'Dados Pessoais Complementares',
    fields: [
      { label: 'Data de nascimento', value: 'Não disponível na API' },
      { label: 'Sexo', value: 'Não disponível na API' },
    ],
  },
  {
    title: 'Endereço',
    fields: [
      { label: 'CEP', value: 'Não disponível na API' },
      { label: 'Logradouro', value: 'Não disponível na API' },
      { label: 'Número', value: 'Não disponível na API' },
      { label: 'Bairro', value: 'Não disponível na API' },
      { label: 'Cidade', value: 'Não disponível na API' },
      { label: 'Estado', value: 'Não disponível na API' },
    ],
  },
  {
    title: 'Responsável',
    fields: [
      { label: 'Nome', value: 'Não disponível na API' },
      { label: 'Parentesco', value: 'Não disponível na API' },
      { label: 'Telefone', value: 'Não disponível na API' },
      { label: 'E-mail', value: 'Não disponível na API' },
    ],
  },
];
