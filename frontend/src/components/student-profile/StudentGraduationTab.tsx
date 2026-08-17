import { type FormEvent, useEffect, useState } from 'react';
import { useAuth } from '../../hooks';
import { historyService } from '../../services';
import type { BeltRank, Graduation, Student } from '../../types';

const belts: BeltRank[] = ['WHITE', 'BLUE', 'PURPLE', 'BROWN', 'BLACK'];
const names: Record<BeltRank, string> = { WHITE: 'Branca', BLUE: 'Azul', PURPLE: 'Roxa', BROWN: 'Marrom', BLACK: 'Preta' };
const emptyForm = () => ({ modalityId: '', belt: 'WHITE' as BeltRank, beltStartedAt: new Date().toISOString().slice(0, 10), graduatedAt: new Date().toISOString().slice(0, 10), notes: '' });

export function StudentGraduationTab({ student }: { student: Student }) {
  const { user } = useAuth();
  const [items, setItems] = useState<Graduation[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const canManage = user?.role === 'OWNER' || user?.role === 'ADMIN';
  const eligibleModalities = student.modalities?.filter((item) => item.status === 'ACTIVE' && item.modality.hasGraduation) ?? [];

  const load = async () => {
    setLoading(true);
    try { setItems(await historyService.graduations(student.id)); setError(''); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Erro ao carregar graduações.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [student.id]);

  const cancelEdit = () => { setEditingId(null); setForm(emptyForm()); setError(''); };
  const edit = (graduation: Graduation) => {
    setEditingId(graduation.id);
    setForm({ modalityId: String(graduation.modalityId), belt: graduation.belt, beltStartedAt: graduation.beltStartedAt.slice(0, 10), graduatedAt: graduation.graduatedAt.slice(0, 10), notes: graduation.notes ?? '' });
    setMessage(''); setError('');
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving || (!editingId && !form.modalityId)) return;
    setSaving(true); setError(''); setMessage('');
    const body = { belt: form.belt, beltStartedAt: `${form.beltStartedAt}T00:00:00.000Z`, graduatedAt: `${form.graduatedAt}T00:00:00.000Z`, ...(form.notes.trim() ? { notes: form.notes.trim() } : {}) };
    try {
      if (editingId) await historyService.updateGraduation(editingId, body);
      else await historyService.createGraduation(student.id, { modalityId: Number(form.modalityId), ...body });
      setMessage(editingId ? 'Graduação atualizada com sucesso.' : 'Graduação registrada com sucesso.');
      setEditingId(null); setForm(emptyForm()); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Erro ao salvar graduação.'); }
    finally { setSaving(false); }
  };

  return <section className="profile-panel"><h2>Graduação</h2>
    {error && <div className="form-error" role="alert">{error}</div>}
    {message && <div className="financial-success" role="status">{message}</div>}
    {canManage && <form className="inline-editor" onSubmit={submit}>
      <select required disabled={editingId !== null} value={form.modalityId} onChange={(event) => setForm({ ...form, modalityId: event.target.value })}><option value="">Modalidade elegível</option>{eligibleModalities.map((item) => <option key={item.id} value={item.modality.id}>{item.modality.name}</option>)}</select>
      <select value={form.belt} onChange={(event) => setForm({ ...form, belt: event.target.value as BeltRank })}>{belts.map((belt) => <option key={belt} value={belt}>{names[belt]}</option>)}</select>
      <label>Início da faixa<input required type="date" value={form.beltStartedAt} onChange={(event) => setForm({ ...form, beltStartedAt: event.target.value })} /></label>
      <label>Data da graduação<input required type="date" value={form.graduatedAt} onChange={(event) => setForm({ ...form, graduatedAt: event.target.value })} /></label>
      <input placeholder="Observação" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
      <button disabled={saving || (!editingId && eligibleModalities.length === 0)}>{saving ? 'Salvando...' : editingId ? 'Salvar edição' : 'Registrar graduação'}</button>
      {editingId && <button type="button" className="secondary-action-button" onClick={cancelEdit} disabled={saving}>Cancelar</button>}
    </form>}
    {canManage && eligibleModalities.length === 0 && !editingId && <div className="documents-state">Nenhuma modalidade ativa elegível para graduação.</div>}
    {loading ? <div className="documents-state"><span className="loading-spinner" /><p>Carregando graduações...</p></div> : items.length === 0 ? <div className="documents-state">Nenhuma graduação registrada.</div> : items.map((graduation, index) => <div className="link-row" key={graduation.id}><span><strong>{graduation.modality.name}: faixa {names[graduation.belt]}</strong><small>{index === 0 ? 'Atual · ' : ''}{new Date(graduation.graduatedAt).toLocaleDateString('pt-BR')} · {graduation.actor.name}</small></span>{canManage && <button type="button" className="secondary-action-button" onClick={() => edit(graduation)}>Editar</button>}</div>)}
  </section>;
}
