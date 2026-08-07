import { studentDocuments } from '../../mocks/studentDocuments';
import { DocumentStatusBadge } from './DocumentStatusBadge';

export function StudentDocumentsTab() {
  return (
    <section
      id="panel-Documentos"
      className="documents-panel"
      role="tabpanel"
      aria-labelledby="tab-Documentos"
    >
      <div className="documents-panel-heading">
        <div>
          <p className="section-eyebrow">Arquivos do aluno</p>
          <h2>Documentos</h2>
          <p>Consulte os documentos cadastrados e seus status.</p>
        </div>
        <button className="add-document-button" type="button">
          <span aria-hidden="true">+</span>
          Adicionar Documento
        </button>
      </div>

      <div className="documents-table-card">
        <div className="documents-table-scroll">
          <table className="documents-table">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Nome</th>
                <th>Status</th>
                <th>Data de envio</th>
                <th>Tamanho</th>
                <th><span className="visually-hidden">Ações</span></th>
              </tr>
            </thead>
            <tbody>
              {studentDocuments.map((document) => (
                <tr key={document.id}>
                  <td>{document.type}</td>
                  <td>
                    <div className="document-name">
                      <span className="document-file-icon" aria-hidden="true">DOC</span>
                      <strong>{document.name}</strong>
                    </div>
                  </td>
                  <td><DocumentStatusBadge status={document.status} /></td>
                  <td>{document.uploadedAt}</td>
                  <td>{document.size}</td>
                  <td>
                    <div className="document-actions">
                      <button type="button" aria-label={`Visualizar ${document.name}`}>Visualizar</button>
                      <button type="button" aria-label={`Mais ações para ${document.name}`}>•••</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
