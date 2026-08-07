import type { StudentDocumentStatus } from '../../mocks/studentDocuments';

type DocumentStatusBadgeProps = {
  status: StudentDocumentStatus;
};

const statusClassNames: Record<StudentDocumentStatus, string> = {
  Pendente: 'pending',
  Aprovado: 'approved',
  Rejeitado: 'rejected',
};

export function DocumentStatusBadge({ status }: DocumentStatusBadgeProps) {
  return (
    <span className={`document-status ${statusClassNames[status]}`}>
      {status}
    </span>
  );
}
