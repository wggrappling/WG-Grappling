import { useEffect, useMemo, useState } from 'react';

type DocumentStatus = 'ACTIVE' | 'ARCHIVED' | 'DELETED';
type DocumentType =
  | 'PHOTO'
  | 'MEDICAL_CERTIFICATE'
  | 'CONTRACT'
  | 'CERTIFICATE'
  | 'LGPD'
  | 'OTHER';

type DocumentItem = {
  id: number;
  studentId: number;
  type: DocumentType;
  originalName: string;
  fileName: string;
  mimeType: string;
  extension: string;
  size: number;
  storagePath: string;
  status: DocumentStatus;
  uploadedBy: number;
  createdAt: string;
  updatedAt: string;
};

const apiBaseUrl = 'http://localhost:3000';

const formatBytes = (bytes: number) => {
  if (!bytes) return '0 KB';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
};

const formatDate = (value: string) => new Date(value).toLocaleDateString('pt-BR');

const mockDocuments: DocumentItem[] = [
  {
    id: 1,
    studentId: 7,
    type: 'PHOTO',
    originalName: 'perfil.jpg',
    fileName: 'perfil-7.jpg',
    mimeType: 'image/jpeg',
    extension: 'jpg',
    size: 1024000,
    storagePath: '/storage/documents/perfil-7.jpg',
    status: 'ACTIVE',
    uploadedBy: 1,
    createdAt: '2026-08-01T12:00:00.000Z',
    updatedAt: '2026-08-01T12:00:00.000Z',
  },
  {
    id: 2,
    studentId: 7,
    type: 'CONTRACT',
    originalName: 'contrato-matricula.pdf',
    fileName: 'contrato-7.pdf',
    mimeType: 'application/pdf',
    extension: 'pdf',
    size: 2400000,
    storagePath: '/storage/documents/contrato-7.pdf',
    status: 'ACTIVE',
    uploadedBy: 1,
    createdAt: '2026-08-03T09:30:00.000Z',
    updatedAt: '2026-08-03T09:30:00.000Z',
  },
];

function App() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentId, setStudentId] = useState(7);

  useEffect(() => {
    const loadDocuments = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${apiBaseUrl}/students/${studentId}/documents`);
        if (response.ok) {
          const payload = await response.json();
          const data = payload?.data ?? payload;
          setDocuments(Array.isArray(data) ? data : []);
        } else {
          setDocuments(mockDocuments);
        }
      } catch {
        setDocuments(mockDocuments);
      } finally {
        setLoading(false);
      }
    };

    loadDocuments();
  }, [studentId]);

  const summary = useMemo(
    () => ({
      total: documents.length,
      active: documents.filter((doc) => doc.status === 'ACTIVE').length,
      archived: documents.filter((doc) => doc.status === 'ARCHIVED').length,
    }),
    [documents],
  );

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">WG Grappling</p>
          <h1>Documentos do aluno</h1>
        </div>
        <button className="primary-button">Novo Documento</button>
      </header>

      <section className="summary-grid">
        <div className="summary-card">
          <span>Total</span>
          <strong>{summary.total}</strong>
        </div>
        <div className="summary-card">
          <span>Ativos</span>
          <strong>{summary.active}</strong>
        </div>
        <div className="summary-card">
          <span>Arquivados</span>
          <strong>{summary.archived}</strong>
        </div>
      </section>

      <section className="filters">
        <label>
          Estudante
          <input
            type="number"
            value={studentId}
            onChange={(event) => setStudentId(Number(event.target.value) || 0)}
          />
        </label>
      </section>

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Nome original</th>
              <th>Tamanho</th>
              <th>Status</th>
              <th>Data</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="empty-state">
                  Carregando documentos...
                </td>
              </tr>
            ) : documents.length === 0 ? (
              <tr>
                <td colSpan={6} className="empty-state">
                  Nenhum documento encontrado.
                </td>
              </tr>
            ) : (
              documents.map((document) => (
                <tr key={document.id}>
                  <td>{document.type}</td>
                  <td>{document.originalName}</td>
                  <td>{formatBytes(document.size)}</td>
                  <td>
                    <span className={`status-badge ${document.status.toLowerCase()}`}>
                      {document.status}
                    </span>
                  </td>
                  <td>{formatDate(document.createdAt)}</td>
                  <td className="actions">
                    <button className="ghost-button">Visualizar</button>
                    <button className="ghost-button">Editar</button>
                    <button className="danger-button">Excluir</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;
