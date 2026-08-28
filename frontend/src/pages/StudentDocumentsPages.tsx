import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ResourceState } from '../components/self-service/ResourceState';
import { useSelfServiceResource } from '../hooks/useSelfServiceResource';
import { selfService } from '../services';

const date = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' });
const typeLabels = {
  PHOTO: 'Foto', MEDICAL_CERTIFICATE: 'Atestado médico', CONTRACT: 'Contrato',
  CERTIFICATE: 'Certificado', LGPD: 'Termo LGPD', OTHER: 'Outro',
} as const;

function Header() {
  return <header className="student-page-header"><h1>Documentos</h1><p>Seus arquivos disponibilizados pela academia.</p></header>;
}

export function StudentDocumentsPage() {
  const resource = useSelfServiceResource(() => selfService.documents());
  return <><Header /><ResourceState {...resource} empty={resource.data?.length === 0} emptyMessage="Nenhum documento disponível." onRetry={() => void resource.refresh()}>
    {resource.data && <section className="student-document-list" aria-label="Seus documentos">{resource.data.map((document) => <article key={document.id}>
      <span className="student-document-icon" aria-hidden="true">▤</span>
      <div><Link to={`/app/documents/${document.id}`}>{document.name}</Link><small>{typeLabels[document.type]} · {date.format(new Date(document.createdAt))}</small></div>
      <span className={`student-pill ${document.available ? 'student-pill-active' : ''}`}>{document.available ? 'Disponível' : 'Indisponível'}</span>
    </article>)}</section>}
  </ResourceState></>;
}

export function StudentDocumentPage() {
  const { documentId = '' } = useParams();
  const id = Number(documentId);
  const resource = useSelfServiceResource(() => selfService.document(id), [id]);
  const [opening, setOpening] = useState(false);
  const [actionError, setActionError] = useState('');

  async function open(download: boolean) {
    setOpening(true); setActionError('');
    try {
      const blob = await selfService.documentFile(id, download);
      const url = URL.createObjectURL(blob);
      if (download) {
        const anchor = window.document.createElement('a'); anchor.href = url; anchor.download = resource.data?.name ?? 'documento'; anchor.click();
      } else window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { setActionError('Não foi possível acessar o arquivo.'); }
    finally { setOpening(false); }
  }

  return <><Header /><ResourceState {...resource} onRetry={() => void resource.refresh()}>
    {resource.data && <article className="student-card student-document-detail">
      <Link className="student-back-link" to="/app/documents">← Voltar aos documentos</Link>
      <h2>{resource.data.name}</h2>
      <dl><div><dt>Tipo</dt><dd>{typeLabels[resource.data.type]}</dd></div><div><dt>Data</dt><dd>{date.format(new Date(resource.data.createdAt))}</dd></div><div><dt>Status</dt><dd>{resource.data.available ? 'Disponível' : 'Indisponível'}</dd></div><div><dt>Tamanho</dt><dd>{new Intl.NumberFormat('pt-BR').format(resource.data.size)} bytes</dd></div></dl>
      {resource.data.available && <div className="student-document-actions"><button type="button" disabled={opening} onClick={() => void open(false)}>Visualizar</button><button type="button" className="student-button-secondary" disabled={opening} onClick={() => void open(true)}>Baixar</button></div>}
      {actionError && <p className="student-action-error" role="alert">{actionError}</p>}
    </article>}
  </ResourceState></>;
}
