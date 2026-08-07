export type HistoryEventType =
  | 'Matrícula'
  | 'Pagamento'
  | 'Presença'
  | 'Graduação'
  | 'Documento'
  | 'Plano'
  | 'Comunicação';

export type HistoryFilter =
  | 'Todos'
  | 'Financeiro'
  | 'Presença'
  | 'Graduação'
  | 'Documentos'
  | 'Comunicação';

export type StudentHistoryEvent = {
  id: number;
  date: string;
  time: string;
  type: HistoryEventType;
  description: string;
  responsibleUser: string;
};

export const historyFilters: readonly HistoryFilter[] = [
  'Todos',
  'Financeiro',
  'Presença',
  'Graduação',
  'Documentos',
  'Comunicação',
];

export const eventTypeByFilter: Record<Exclude<HistoryFilter, 'Todos'>, readonly HistoryEventType[]> = {
  Financeiro: ['Pagamento', 'Plano'],
  Presença: ['Presença'],
  Graduação: ['Graduação'],
  Documentos: ['Documento'],
  Comunicação: ['Comunicação'],
};

export const studentHistoryEvents: readonly StudentHistoryEvent[] = [
  {
    id: 1,
    date: '07/08/2026',
    time: '18:42',
    type: 'Presença',
    description: 'Presença registrada na turma Jiu-Jitsu Adulto.',
    responsibleUser: 'Carlos Andrade',
  },
  {
    id: 2,
    date: '06/08/2026',
    time: '14:20',
    type: 'Documento',
    description: 'Comprovante de residência enviado para análise.',
    responsibleUser: 'Juliana Costa',
  },
  {
    id: 3,
    date: '05/08/2026',
    time: '09:15',
    type: 'Comunicação',
    description: 'Lembrete de vencimento enviado por WhatsApp.',
    responsibleUser: 'Sistema WG',
  },
  {
    id: 4,
    date: '03/08/2026',
    time: '10:08',
    type: 'Pagamento',
    description: 'Mensalidade de agosto confirmada via PIX.',
    responsibleUser: 'Mariana Lopes',
  },
  {
    id: 5,
    date: '18/06/2026',
    time: '20:30',
    type: 'Graduação',
    description: 'Graduação registrada para a faixa azul.',
    responsibleUser: 'André Silva',
  },
  {
    id: 6,
    date: '12/01/2026',
    time: '11:05',
    type: 'Plano',
    description: 'Plano Jiu-Jitsu + No-Gi ativado para o aluno.',
    responsibleUser: 'Juliana Costa',
  },
  {
    id: 7,
    date: '12/01/2026',
    time: '10:42',
    type: 'Matrícula',
    description: 'Matrícula do aluno concluída com sucesso.',
    responsibleUser: 'Juliana Costa',
  },
];
