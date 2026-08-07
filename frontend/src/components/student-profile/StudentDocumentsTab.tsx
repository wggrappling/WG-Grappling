import { useEffect } from 'react';
import { useApiRequest } from '../../hooks';
import { documentService } from '../../services';
import type { ApiListResponse, DocumentType, StudentDocument } from '../../types';
import { DocumentStatusBadge } from './DocumentStatusBadge';

type StudentDocumentsTabProps = {
  studentId: number;
};

const typeLabels: Record<DocumentType, string> = {
  PHOTO: 'Foto',
  MEDICAL_CERTIFICATE: 'Atestado médico',
  CONTRACT: 'Contrato',
  CERTIFICATE: 'Certificado',
  LGPD: 'LGPD',
  OTHER: 'Outro',
};

const formatDate = (date: string) => new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'UTC',
}).format(new Date(date));

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} KB`;
  return `${(bytes / 1024 ** 2).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`;
};

export function StudentDocumentsTab({ studentId }: StudentDocumentsTabProps) {
  const { data, error, loading, execute } = useApiRequest<
    ApiListResponse<StudentDocument>,
    [number]
  >();

  useEffect(() => {
    void execute(documentService.getByStudentId, studentId).catch(() => undefined);
  }, [execute, studentId]);

  return (
    <section id="panel-Documentos" className="documents-panel" role="tabpanel" aria-labelledby="tab-Documentos">
      <div className="documents-panel-heading">
        <div>
          <p className="section-eyebrow">Arquivos do aluno</p>
          <h2>Documentos</h2>
          <p>Consulte os documentos cadastrados e seus status.</p>
        </div>
        <button className="add-document-button" type="button" disabled title="Inclusão não disponível nesta tela">
          <span aria-hidden="true">+</span>
          Adicionar Documento
        </button>
      </div>

      <div className="documents-table-card">
        {loading && (
          <div className="documents-state" aria-live="polite">
            <span className="loading-spinner" aria-hidden="true" />
            <p>Carregando documentos...</p>
          </div>
        )}

        {error && (
          <div className="documents-state documents-state-error" role="alert">
            <strong>Não foi possível carregar os documentos.</strong>
            <p>{error.message}</p>
          </div>
        )}

        {!loading && !error && data?.data.length === 0 && (
          <div className="documents-state">
            <strong>Nenhum documento cadastrado</strong>
            <p>Este aluno ainda não possui documentos.</p>
          </div>
        )}

        {!loading && !error && data && data.data.length > 0 && (
          <div className="documents-table-scroll">
            <table className="documents-table">
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Nome</th>
                  <th>Status</th>
                  <th>Data de envio</th>
                  <th>Tamanho</th>
                  <th>Enviado por</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((document) => (
                  <tr key={document.id}>
                    <td>{typeLabels[document.type]}</td>
                    <td>
                      <div className="document-name">
                        <span className="document-file-icon" aria-hidden="true">DOC</span>
                        <strong>{document.originalName}</strong>
                      </div>
                    </td>
                    <td><DocumentStatusBadge status={document.status} /></td>
                    <td>{formatDate(document.createdAt)}</td>
                    <td>{formatSize(document.size)}</td>
                    <td>{document.uploader.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
