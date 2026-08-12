import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useApiRequest } from '../../hooks';
import { documentService } from '../../services';
import type { ApiListResponse, DocumentType, StudentDocument } from '../../types';
import { DocumentStatusBadge } from './DocumentStatusBadge';

const labels: Record<DocumentType, string> = { PHOTO: 'Foto', MEDICAL_CERTIFICATE: 'Atestado médico', CONTRACT: 'Contrato', CERTIFICATE: 'Certificado', LGPD: 'LGPD', OTHER: 'Outro' };
const allowed = new Set(['application/pdf', 'image/jpeg', 'image/png']);
const maxSize = 10 * 1024 * 1024;
const date = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' });
const size = (bytes: number) => bytes < 1024 ** 2 ? `${(bytes / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} KB` : `${(bytes / 1024 ** 2).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`;

export function StudentDocumentsTab({ studentId }: { studentId: number }) {
  const { data, error, loading, execute } = useApiRequest<ApiListResponse<StudentDocument>, [number]>();
  const fileRef = useRef<HTMLInputElement>(null);
  const [showForm, setShowForm] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState<DocumentType>('OTHER');
  const [sending, setSending] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const load = useCallback(() => execute(documentService.getByStudentId, studentId), [execute, studentId]);
  useEffect(() => { void load().catch(() => undefined); }, [load]);

  const upload = async (event: FormEvent) => {
    event.preventDefault(); setActionError(null);
    if (!file) { setActionError('Selecione um arquivo.'); return; }
    if (!allowed.has(file.type) || file.size > maxSize) { setActionError('Use PDF, JPEG ou PNG com até 10 MB.'); return; }
    setSending(true);
    try { await documentService.upload(studentId, file, type); setMessage('Documento enviado com sucesso.'); setShowForm(false); setFile(null); if (fileRef.current) fileRef.current.value = ''; await load(); }
    catch (cause) { setActionError(cause instanceof Error ? cause.message : 'Não foi possível enviar o documento.'); }
    finally { setSending(false); }
  };
  const openFile = async (document: StudentDocument, download: boolean) => {
    setActionId(document.id); setActionError(null);
    try { const blob = await documentService.getFile(document.id, download); const url = URL.createObjectURL(blob); const link = window.document.createElement('a'); link.href = url; if (download) link.download = document.originalName; else link.target = '_blank'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 60_000); }
    catch (cause) { setActionError(cause instanceof Error ? cause.message : 'Não foi possível acessar o arquivo.'); }
    finally { setActionId(null); }
  };
  const remove = async (document: StudentDocument) => {
    if (!window.confirm(`Remover o documento “${document.originalName}”?`)) return;
    setActionId(document.id); setActionError(null);
    try { await documentService.remove(document.id); setMessage('Documento removido com sucesso.'); await load(); }
    catch (cause) { setActionError(cause instanceof Error ? cause.message : 'Não foi possível remover o documento.'); }
    finally { setActionId(null); }
  };

  return <section id="panel-Documentos" className="documents-panel" role="tabpanel" aria-labelledby="tab-Documentos">
    <div className="documents-panel-heading"><div><p className="section-eyebrow">Arquivos do aluno</p><h2>Documentos</h2><p>Upload e consulta protegidos por autenticação.</p></div><button className="add-document-button" type="button" onClick={() => { setShowForm((value) => !value); setActionError(null); }}><span>+</span> Adicionar Documento</button></div>
    {showForm && <form className="document-upload-form" onSubmit={upload}><label>Tipo<select value={type} onChange={(e) => setType(e.target.value as DocumentType)}>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Arquivo<input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required /></label><small>PDF, JPEG ou PNG; máximo de 10 MB.</small><button className="primary-action-button" type="submit" disabled={sending}>{sending ? 'Enviando...' : 'Enviar documento'}</button></form>}
    {message && <div className="documents-success" role="status">{message}</div>}{actionError && <div className="documents-state documents-state-error" role="alert"><strong>Operação não concluída</strong><p>{actionError}</p></div>}
    <div className="documents-table-card">{loading && <div className="documents-state"><span className="loading-spinner" /><p>Carregando documentos...</p></div>}{error && <div className="documents-state documents-state-error"><strong>Não foi possível carregar os documentos.</strong><p>{error.message}</p></div>}{!loading && !error && data?.data.length === 0 && <div className="documents-state"><strong>Nenhum documento cadastrado</strong></div>}{!loading && !error && data && data.data.length > 0 && <div className="documents-table-scroll"><table className="documents-table"><thead><tr><th>Tipo</th><th>Nome</th><th>Status</th><th>Envio</th><th>Tamanho</th><th>Enviado por</th><th>Ações</th></tr></thead><tbody>{data.data.map((document) => <tr key={document.id}><td>{labels[document.type]}</td><td><strong>{document.originalName}</strong></td><td><DocumentStatusBadge status={document.status} /></td><td>{date.format(new Date(document.createdAt))}</td><td>{size(document.size)}</td><td>{document.uploader.name}</td><td><div className="document-actions"><button type="button" onClick={() => void openFile(document, false)} disabled={!document.fileAvailable || actionId === document.id}>Visualizar</button><button type="button" onClick={() => void openFile(document, true)} disabled={!document.fileAvailable || actionId === document.id}>Download</button><button type="button" className="danger" onClick={() => void remove(document)} disabled={actionId === document.id}>Remover</button></div></td></tr>)}</tbody></table></div>}</div>
  </section>;
}
