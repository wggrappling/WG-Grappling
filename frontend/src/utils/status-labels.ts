const statusLabels: Record<string, string> = {
  ACTIVE: 'Ativo', PAUSED: 'Pausado', INACTIVE: 'Inativo', FINISHED: 'Encerrado',
  PENDING: 'Pendente', PARTIALLY_PAID: 'Parcialmente pago', PAID: 'Pago', OVERDUE: 'Em atraso', CANCELLED: 'Cancelado', REFUNDED: 'Estornado',
  PRESENT: 'Presente', ABSENT: 'Ausente', JUSTIFIED: 'Justificada',
  WHITE: 'Branca', BLUE: 'Azul', PURPLE: 'Roxa', BROWN: 'Marrom', BLACK: 'Preta',
};

export const statusLabel = (status: string) => statusLabels[status] ?? status;

export const presentStatusText = (text: string) => Object.entries(statusLabels)
  .reduce((result, [status, label]) => result.replace(new RegExp(`\\b${status}\\b`, 'g'), label), text);
