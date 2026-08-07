import type { DocumentStatus } from '../../types';

type DocumentStatusBadgeProps = {
  status: DocumentStatus;
};

const statusDetails: Record<DocumentStatus, { className: string; label: string }> = {
  ACTIVE: { className: 'approved', label: 'Ativo' },
  ARCHIVED: { className: 'pending', label: 'Arquivado' },
  DELETED: { className: 'rejected', label: 'Excluído' },
};

export function DocumentStatusBadge({ status }: DocumentStatusBadgeProps) {
  const details = statusDetails[status];

  return <span className={`document-status ${details.className}`}>{details.label}</span>;
}
